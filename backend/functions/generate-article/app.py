"""
記事生成Lambda関数
非同期SQSパターン対応版
"""

import json
import os
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Any, Optional

import boto3
import anthropic
from boto3.dynamodb.conditions import Key

from validators import validate_article_input, validate_settings, sanitize_body
from prompt_builder import (
    build_prompt,
    build_title_generation_prompt,
    build_meta_generation_prompt,
    build_structure_prompt,
    build_output_prompt
)
from utils import (
    generate_article_id,
    get_current_timestamp,
    log_info,
    log_error,
    log_warning,
    create_response,
    parse_event_body,
    get_user_id,
    count_characters,
    estimate_reading_time,
    validate_markdown_structure
)

# 環境変数
CLAUDE_API_KEY = os.environ.get('CLAUDE_API_KEY', '')
DYNAMODB_TABLE_ARTICLES = os.environ.get('DYNAMODB_TABLE_ARTICLES', 'blog-agent-articles')
DYNAMODB_TABLE_SETTINGS = os.environ.get('DYNAMODB_TABLE_SETTINGS', 'blog-agent-settings')
DYNAMODB_TABLE_JOBS = os.environ.get('DYNAMODB_TABLE_JOBS', 'blog-agent-jobs')
SQS_QUEUE_URL = os.environ.get('SQS_QUEUE_URL', '')
CLAUDE_MODEL = os.environ.get('CLAUDE_MODEL', 'claude-sonnet-4-20250514')
LOCAL_DEV = os.environ.get('LOCAL_DEV', 'false').lower() == 'true'

# クライアント初期化
if not LOCAL_DEV:
    dynamodb = boto3.resource('dynamodb')
    sqs = boto3.client('sqs')
    articles_table = dynamodb.Table(DYNAMODB_TABLE_ARTICLES)
    settings_table = dynamodb.Table(DYNAMODB_TABLE_SETTINGS)
    jobs_table = dynamodb.Table(DYNAMODB_TABLE_JOBS)
else:
    dynamodb = None
    sqs = None
    articles_table = None
    settings_table = None
    jobs_table = None


def get_claude_client() -> anthropic.Anthropic:
    """Claude APIクライアントを取得"""
    return anthropic.Anthropic(api_key=CLAUDE_API_KEY)


def get_default_settings() -> Dict[str, Any]:
    """ローカル開発時のデフォルト設定を取得（新スキーマ：roles対応）"""
    from sample_articles import get_default_sample_article
    sample_wp = get_default_sample_article('wordpress')
    sample_md = get_default_sample_article('markdown')
    return {
        'articleStyle': {
            'taste': 'friendly',
            'firstPerson': 'watashi',
            'readerAddress': 'minasan',
            'tone': 'explanatory',
            'introStyle': 'empathy',
        },
        'decorations': [
            {
                'id': 'ba-highlight',
                'label': 'ハイライト',
                'roles': ['attention'],
                'css': '.ba-highlight { background: linear-gradient(transparent 60%, #fff59d 60%); padding: 0 4px; font-weight: 600; }',
                'enabled': True
            },
            {
                'id': 'ba-point',
                'label': 'ポイント',
                'roles': ['attention', 'explain'],
                'css': '.ba-point { background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0; }',
                'enabled': True
            },
            {
                'id': 'ba-warning',
                'label': '警告',
                'roles': ['warning'],
                'css': '.ba-warning { background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0; }',
                'enabled': True
            },
            {
                'id': 'ba-success',
                'label': '成功',
                'roles': ['action'],
                'css': '.ba-success { background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0; }',
                'enabled': True
            },
            {
                'id': 'ba-quote',
                'label': '引用',
                'roles': ['explain'],
                'css': '.ba-quote { background-color: #f5f5f5; border-left: 4px solid #9e9e9e; padding: 16px 20px; margin: 24px 0; font-style: italic; color: #616161; border-radius: 0 8px 8px 0; }',
                'enabled': True
            },
            {
                'id': 'ba-summary',
                'label': 'まとめ',
                'roles': ['summarize'],
                'css': '.ba-summary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px 24px; margin: 24px 0; border-radius: 12px; }',
                'enabled': True
            },
            {
                'id': 'ba-checklist',
                'label': 'チェックリスト',
                'roles': ['summarize', 'action'],
                'css': '.ba-checklist { background-color: #fafafa; padding: 16px 20px; margin: 24px 0; border-radius: 8px; border: 1px solid #e0e0e0; }',
                'enabled': True
            },
            {
                'id': 'ba-number-list',
                'label': '番号付きリスト',
                'roles': ['explain', 'action'],
                'css': '.ba-number-list { background-color: #fff; padding: 16px 20px; margin: 24px 0; border-radius: 8px; border: 1px solid #e0e0e0; }',
                'enabled': True
            }
        ],
        'baseClass': 'ba-article',
        'seo': {
            'metaDescriptionLength': 140,
            'maxKeywords': 7,
        },
        'sampleArticles': [sample_wp, sample_md],
    }


def map_roles_to_decorations(structure: Dict[str, Any], decorations: list) -> Dict[str, Any]:
    """
    Step 1の出力（roles付き構造）をStep 2用にマッピング
    roleからdecorationIdを決定する

    ルール:
    - 同一decorationIdの連続使用禁止
    - 同一roleは1記事最大3回まで
    - 対応装飾がない場合は装飾なし
    """
    # 有効な装飾のrole→decorationIdマッピングを作成
    role_to_decorations = {}
    for dec in decorations:
        if dec.get('enabled', True) and dec.get('roles'):
            for role in dec['roles']:
                if role not in role_to_decorations:
                    role_to_decorations[role] = []
                role_to_decorations[role].append(dec['id'])

    # 使用カウンター
    role_usage_count = {}
    last_decoration_id = None

    def process_block(block: Dict[str, Any]) -> Dict[str, Any]:
        nonlocal last_decoration_id

        roles = block.get('roles', [])
        decoration_id = None

        if roles:
            for role in roles:
                # roleの使用回数チェック（最大3回）
                if role_usage_count.get(role, 0) >= 3:
                    continue

                candidates = role_to_decorations.get(role, [])
                for candidate in candidates:
                    # 連続使用禁止チェック
                    if candidate != last_decoration_id:
                        decoration_id = candidate
                        role_usage_count[role] = role_usage_count.get(role, 0) + 1
                        break

                if decoration_id:
                    break

        if decoration_id:
            last_decoration_id = decoration_id

        # rolesを削除し、decorationIdを追加
        new_block = {k: v for k, v in block.items() if k != 'roles'}
        if decoration_id:
            new_block['decorationId'] = decoration_id

        # 入れ子のblocksを処理
        if 'blocks' in new_block:
            new_block['blocks'] = [process_block(b) for b in new_block['blocks']]

        return new_block

    # 構造全体を処理
    mapped_structure = {
        'title': structure.get('title', ''),
        'sections': []
    }

    for section in structure.get('sections', []):
        new_section = {
            'heading': section.get('heading', ''),
            'blocks': [process_block(b) for b in section.get('blocks', [])]
        }
        mapped_structure['sections'].append(new_section)

    if 'meta' in structure:
        mapped_structure['meta'] = structure['meta']

    return mapped_structure


def structure_to_markdown(mapped_structure: Dict[str, Any], decorations: list) -> str:
    """
    マッピング済み構造からMarkdownを生成
    decorationId → 装飾タグ変換
    """
    lines = []

    for section in mapped_structure.get('sections', []):
        # H2見出し
        lines.append(f"## {section.get('heading', '')}")
        lines.append('')

        for block in section.get('blocks', []):
            lines.extend(block_to_markdown(block, decorations))
            lines.append('')

    return '\n'.join(lines)


def block_to_markdown(block: Dict[str, Any], decorations: list, indent: int = 0) -> list:
    """ブロックをMarkdown行に変換"""
    lines = []
    block_type = block.get('type', 'paragraph')
    content = block.get('content', '')
    decoration_id = block.get('decorationId')

    if block_type == 'paragraph':
        if decoration_id:
            lines.append(f':::box id="{decoration_id}"')
            lines.append(content)
            lines.append(':::')
        else:
            lines.append(content)

    elif block_type == 'list':
        list_type = block.get('listType', 'unordered')
        items = block.get('items', [])

        if decoration_id:
            lines.append(f':::box id="{decoration_id}"')

        for item in items:
            prefix = '- ' if list_type == 'unordered' else '1. '
            lines.append(f'{prefix}{item}')

        if decoration_id:
            lines.append(':::')

    elif block_type == 'subsection':
        # H3見出し
        lines.append(f"### {block.get('heading', '')}")
        lines.append('')
        for sub_block in block.get('blocks', []):
            lines.extend(block_to_markdown(sub_block, decorations))
            lines.append('')

    return lines


def get_user_settings(user_id: str) -> Optional[Dict[str, Any]]:
    """ユーザー設定をDynamoDBから取得"""
    if LOCAL_DEV:
        return get_default_settings()
    try:
        response = settings_table.get_item(Key={'userId': user_id})
        return response.get('Item')
    except Exception as e:
        log_warning('Failed to get user settings', user_id=user_id, error=str(e))
        return None


def create_job(user_id: str, request_body: Dict[str, Any]) -> str:
    """ジョブを作成してJobsテーブルに保存"""
    job_id = f"job_{uuid.uuid4().hex[:16]}"
    current_time = get_current_timestamp()
    ttl = int((datetime.now() + timedelta(hours=24)).timestamp())

    job = {
        'jobId': job_id,
        'userId': user_id,
        'status': 'pending',
        'title': request_body.get('title', ''),
        'createdAt': current_time,
        'updatedAt': current_time,
        'ttl': ttl,
    }

    jobs_table.put_item(Item=job)
    log_info('Job created', job_id=job_id, user_id=user_id)
    return job_id


def update_job_status(job_id: str, status: str, result: Optional[Dict[str, Any]] = None, error: Optional[str] = None):
    """ジョブのステータスを更新"""
    current_time = get_current_timestamp()
    update_expr = 'SET #status = :status, updatedAt = :updated'
    expr_names = {'#status': 'status'}
    expr_values = {':status': status, ':updated': current_time}

    if result:
        update_expr += ', #result = :result'
        expr_names['#result'] = 'result'
        expr_values[':result'] = result

    if error:
        update_expr += ', #error = :error'
        expr_names['#error'] = 'error'
        expr_values[':error'] = error

    jobs_table.update_item(
        Key={'jobId': job_id},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=expr_names,
        ExpressionAttributeValues=expr_values
    )
    log_info('Job status updated', job_id=job_id, status=status)


def submit_article_job(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """記事生成ジョブを投入（即時レスポンス）"""
    try:
        user_id = get_user_id(event)
        if not user_id:
            return create_response(401, error_code='AUTH_001', error_message='認証が必要です')

        body = parse_event_body(event)
        if not body:
            return create_response(400, error_code='VALIDATION_001', error_message='リクエストボディが不正です')

        body = sanitize_body(body)
        validation_error = validate_article_input(body)
        if validation_error:
            return create_response(400, error_code='VALIDATION_002', error_message=validation_error)

        # ジョブを作成
        job_id = create_job(user_id, body)

        # SQSにメッセージを送信
        message = {
            'jobId': job_id,
            'userId': user_id,
            'body': body,
        }
        sqs.send_message(
            QueueUrl=SQS_QUEUE_URL,
            MessageBody=json.dumps(message, ensure_ascii=False)
        )

        log_info('Job submitted to SQS', job_id=job_id, user_id=user_id)

        return create_response(202, data={
            'jobId': job_id,
            'status': 'pending',
            'message': '記事生成を開始しました。ステータスを確認してください。'
        })

    except Exception as e:
        log_error('Failed to submit job', e)
        return create_response(500, error_code='SERVER_001', error_message='ジョブの投入に失敗しました')


def process_sqs_message(event: Dict[str, Any], context: Any):
    """SQSメッセージを処理して記事を生成（2段階生成）"""
    import re

    for record in event.get('Records', []):
        try:
            message = json.loads(record['body'])
            job_id = message['jobId']
            user_id = message['userId']
            body = message['body']

            log_info('Processing SQS message (two-step generation)', job_id=job_id, user_id=user_id)

            # ステータスを処理中に更新
            update_job_status(job_id, 'processing')

            # ユーザー設定を取得
            user_settings = get_user_settings(user_id)
            if user_settings:
                settings_error = validate_settings(user_settings)
                if settings_error:
                    log_warning('Invalid user settings', user_id=user_id, error=settings_error)
                    user_settings = get_default_settings()
            else:
                user_settings = get_default_settings()

            # 装飾設定を取得（新スキーマ：list形式）
            decorations = user_settings.get('decorations', [])
            if not isinstance(decorations, list):
                # 旧スキーマの場合はデフォルトを使用
                decorations = get_default_settings()['decorations']

            start_time = datetime.now()
            claude_client = get_claude_client()

            # ==========================================
            # Step 1: 構造生成（roleのみ、CSSなし）
            # ==========================================
            structure_prompt = build_structure_prompt(body, user_settings)

            log_info('Step 1: Structure generation',
                     job_id=job_id,
                     prompt_length=len(structure_prompt))

            structure_response = claude_client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=6000,
                temperature=0.7,
                messages=[{"role": "user", "content": structure_prompt}]
            )

            structure_text = structure_response.content[0].text

            # JSONをパース
            json_match = re.search(r'```json\s*(\{.*?\})\s*```', structure_text, re.DOTALL)
            if json_match:
                structure = json.loads(json_match.group(1))
            else:
                # JSONブロックがない場合は直接パース
                structure = json.loads(structure_text)

            log_info('Step 1 completed: Structure parsed',
                     job_id=job_id,
                     sections_count=len(structure.get('sections', [])))

            # ==========================================
            # Role → DecorationId マッピング
            # ==========================================
            mapped_structure = map_roles_to_decorations(structure, decorations)

            log_info('Role mapping completed', job_id=job_id)

            # ==========================================
            # Step 2: Markdown生成（プログラム側で変換）
            # ==========================================
            # Claude APIを再度呼ばず、プログラムで変換する
            markdown_content = structure_to_markdown(mapped_structure, decorations)

            generation_time = (datetime.now() - start_time).total_seconds()

            # 生成結果の検証
            structure_validation = validate_markdown_structure(markdown_content)
            if not structure_validation['valid']:
                log_warning('Generated article has structure issues', issues=structure_validation['issues'])

            # 記事ID生成
            article_id = generate_article_id()
            current_time = get_current_timestamp()
            word_count = count_characters(markdown_content)
            reading_time = estimate_reading_time(markdown_content)

            # DynamoDBに記事を保存
            article = {
                'userId': user_id,
                'articleId': article_id,
                'title': body['title'],
                'markdown': markdown_content,
                'status': 'draft',
                'createdAt': current_time,
                'updatedAt': current_time,
                'metadata': {
                    'wordCount': word_count,
                    'readingTime': reading_time,
                    'targetAudience': body.get('targetAudience', ''),
                    'purpose': body.get('purpose', ''),
                    'keywords': body.get('keywords', []),
                    'articleType': body.get('articleType', 'info'),
                    'generationTime': Decimal(str(round(generation_time, 2))),
                    'structureValidation': structure_validation,
                    'generationMethod': 'two-step',
                    'prompt': {
                        'model': CLAUDE_MODEL,
                        'temperature': Decimal('0.7'),
                        'inputTokens': structure_response.usage.input_tokens,
                        'outputTokens': structure_response.usage.output_tokens
                    }
                }
            }
            articles_table.put_item(Item=article)

            # ジョブを完了に更新
            result = {
                'articleId': article_id,
                'title': body['title'],
                'markdown': markdown_content,
                'metadata': {
                    'wordCount': word_count,
                    'readingTime': reading_time,
                    'generationTime': Decimal(str(round(generation_time, 2))),
                    'structureValidation': structure_validation
                }
            }
            update_job_status(job_id, 'completed', result=result)

            log_info('Article generated successfully (two-step)',
                     job_id=job_id,
                     article_id=article_id,
                     word_count=word_count)

        except json.JSONDecodeError as e:
            log_error('Failed to parse structure JSON', e)
            if 'job_id' in locals():
                update_job_status(job_id, 'failed', error='記事構造のパースに失敗しました')

        except anthropic.APIError as e:
            log_error('Claude API Error', e)
            if 'job_id' in locals():
                update_job_status(job_id, 'failed', error='AI記事生成サービスでエラーが発生しました')

        except Exception as e:
            log_error('Failed to process SQS message', e)
            if 'job_id' in locals():
                update_job_status(job_id, 'failed', error=str(e))


def get_job_status(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """ジョブのステータスを取得"""
    try:
        user_id = get_user_id(event)
        if not user_id:
            return create_response(401, error_code='AUTH_001', error_message='認証が必要です')

        # パスパラメータからjobIdを取得
        path_params = event.get('pathParameters', {}) or {}
        job_id = path_params.get('jobId', '')

        if not job_id:
            # rawPathからjobIdを抽出
            path = event.get('rawPath', '') or event.get('path', '')
            if '/jobs/' in path:
                job_id = path.split('/jobs/')[-1]

        if not job_id:
            return create_response(400, error_code='VALIDATION_001', error_message='ジョブIDが必要です')

        # ジョブを取得
        response = jobs_table.get_item(Key={'jobId': job_id})
        job = response.get('Item')

        if not job:
            return create_response(404, error_code='NOT_FOUND', error_message='ジョブが見つかりません')

        # ユーザーIDが一致するか確認
        if job.get('userId') != user_id:
            return create_response(403, error_code='FORBIDDEN', error_message='このジョブへのアクセス権がありません')

        # レスポンスを構築
        result = {
            'jobId': job['jobId'],
            'status': job['status'],
            'title': job.get('title', ''),
            'createdAt': job.get('createdAt', ''),
            'updatedAt': job.get('updatedAt', ''),
        }

        if job['status'] == 'completed' and 'result' in job:
            result['result'] = job['result']
        elif job['status'] == 'failed' and 'error' in job:
            result['error'] = job['error']

        return create_response(200, data=result)

    except Exception as e:
        log_error('Failed to get job status', e)
        return create_response(500, error_code='SERVER_001', error_message='ステータスの取得に失敗しました')


def generate_titles(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """タイトル案を3つ生成（同期処理）"""
    try:
        user_id = get_user_id(event)
        if not user_id:
            return create_response(401, error_code='AUTH_001', error_message='認証が必要です')

        body = parse_event_body(event)
        if not body:
            return create_response(400, error_code='VALIDATION_001', error_message='リクエストボディが不正です')

        body = sanitize_body(body)

        if not body.get('contentPoints'):
            return create_response(400, error_code='VALIDATION_002', error_message='本文の要点は必須です')

        log_info('Title generation started', user_id=user_id)

        user_settings = get_user_settings(user_id)
        prompt = build_title_generation_prompt(body, user_settings)
        claude_client = get_claude_client()

        message = claude_client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=1000,
            temperature=0.8,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = message.content[0].text

        import re
        json_match = re.search(r'```json\s*(\{.*?\})\s*```', response_text, re.DOTALL)
        if json_match:
            titles_data = json.loads(json_match.group(1))
        else:
            titles_data = json.loads(response_text)

        log_info('Titles generated successfully', user_id=user_id, count=len(titles_data.get('titles', [])))
        return create_response(200, data=titles_data)

    except json.JSONDecodeError as e:
        log_error('Failed to parse title response', e)
        return create_response(500, error_code='PARSE_001', error_message='タイトル生成結果のパースに失敗しました')

    except anthropic.APIError as e:
        log_error('Claude API Error', e)
        return create_response(503, error_code='CLAUDE_001', error_message='AI記事生成サービスでエラーが発生しました')

    except Exception as e:
        log_error('Unexpected error in generate_titles', e)
        return create_response(500, error_code='SERVER_001', error_message='サーバーエラーが発生しました')


def generate_meta(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """記事からメタ情報を生成（同期処理）"""
    try:
        user_id = get_user_id(event)
        if not user_id:
            return create_response(401, error_code='AUTH_001', error_message='認証が必要です')

        body = parse_event_body(event)
        if not body:
            return create_response(400, error_code='VALIDATION_001', error_message='リクエストボディが不正です')

        markdown_content = body.get('markdown', '')
        if not markdown_content:
            return create_response(400, error_code='VALIDATION_002', error_message='記事内容は必須です')

        if len(markdown_content) < 100:
            return create_response(400, error_code='VALIDATION_003', error_message='記事内容が短すぎます')

        log_info('Meta generation started', user_id=user_id)

        user_settings = get_user_settings(user_id)
        seo_settings = user_settings.get('seo', {}) if user_settings else {}
        prompt = build_meta_generation_prompt(markdown_content, seo_settings)
        claude_client = get_claude_client()

        message = claude_client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=500,
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = message.content[0].text

        import re
        json_match = re.search(r'```json\s*(\{.*?\})\s*```', response_text, re.DOTALL)
        if json_match:
            meta_data = json.loads(json_match.group(1))
        else:
            meta_data = json.loads(response_text)

        log_info('Meta generated successfully', user_id=user_id)
        return create_response(200, data=meta_data)

    except json.JSONDecodeError as e:
        log_error('Failed to parse meta response', e)
        return create_response(500, error_code='PARSE_001', error_message='メタ情報生成結果のパースに失敗しました')

    except anthropic.APIError as e:
        log_error('Claude API Error', e)
        return create_response(503, error_code='CLAUDE_001', error_message='AI記事生成サービスでエラーが発生しました')

    except Exception as e:
        log_error('Unexpected error in generate_meta', e)
        return create_response(500, error_code='SERVER_001', error_message='サーバーエラーが発生しました')


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda関数のエントリーポイント
    SQSトリガーとAPI Gatewayの両方に対応
    """
    # SQSトリガーの場合
    if 'Records' in event and event['Records'][0].get('eventSource') == 'aws:sqs':
        return process_sqs_message(event, context)

    # API Gatewayの場合
    http_method = event.get('httpMethod', '') or event.get('requestContext', {}).get('http', {}).get('method', '')
    if http_method == 'OPTIONS':
        return create_response(200, data={})

    path = event.get('rawPath', '') or event.get('path', '')
    resource = event.get('resource', '')

    # ルーティング
    if path.endswith('/titles') or resource.endswith('/titles'):
        return generate_titles(event, context)
    elif path.endswith('/meta') or resource.endswith('/meta'):
        return generate_meta(event, context)
    elif '/jobs/' in path or '/jobs/' in resource:
        return get_job_status(event, context)
    elif http_method == 'GET':
        return get_job_status(event, context)
    else:
        # POST /articles/generate → ジョブ投入
        return submit_article_job(event, context)
