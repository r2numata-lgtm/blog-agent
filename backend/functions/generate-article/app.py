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
    build_output_prompt,
    build_markdown_prompt
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
                'schema': 'paragraph',
                'options': {},
                'class': 'ba-highlight',
                'css': '.ba-highlight { background: linear-gradient(transparent 60%, #fff59d 60%); padding: 0 4px; font-weight: 600; display: inline; box-decoration-break: clone; -webkit-box-decoration-break: clone; }',
                'enabled': True
            },
            {
                'id': 'ba-point',
                'label': 'ポイント',
                'roles': ['attention'],
                'schema': 'box',
                'options': {'title': {'required': True, 'source': 'claude'}},
                'class': 'ba-point',
                'css': '.ba-point { background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0; } .ba-point .box-title { font-weight: 700; color: #1976d2; margin-bottom: 8px; font-size: 14px; }',
                'enabled': True
            },
            {
                'id': 'ba-warning',
                'label': '警告',
                'roles': ['warning'],
                'schema': 'box',
                'options': {'title': {'required': True, 'source': 'claude'}},
                'class': 'ba-warning',
                'css': '.ba-warning { background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0; } .ba-warning .box-title { font-weight: 700; color: #e65100; margin-bottom: 8px; font-size: 14px; }',
                'enabled': True
            },
            {
                'id': 'ba-explain',
                'label': '補足説明',
                'roles': ['explain'],
                'schema': 'box',
                'options': {'title': {'required': False, 'source': 'claude'}},
                'class': 'ba-explain',
                'css': '.ba-explain { background-color: #f5f5f5; border-left: 4px solid #9e9e9e; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0; } .ba-explain .box-title { font-weight: 700; color: #616161; margin-bottom: 8px; font-size: 14px; }',
                'enabled': True
            },
            {
                'id': 'ba-summary-box',
                'label': 'まとめボックス',
                'roles': ['summarize'],
                'schema': 'box',
                'options': {'title': {'required': True, 'source': 'claude'}},
                'class': 'ba-summary-box',
                'css': '.ba-summary-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px 24px; margin: 24px 0; border-radius: 12px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25); } .ba-summary-box .box-title { font-weight: 700; margin-bottom: 12px; font-size: 16px; }',
                'enabled': True
            },
            {
                'id': 'ba-summary-list',
                'label': 'まとめリスト',
                'roles': ['summarize'],
                'schema': 'list',
                'options': {'ordered': False},
                'class': 'ba-summary-list',
                'css': '.ba-summary-list { background-color: #fafafa; padding: 16px 20px; margin: 24px 0; border-radius: 8px; border: 1px solid #e0e0e0; } .ba-summary-list .box-title { font-weight: 700; color: #333; margin-bottom: 8px; font-size: 14px; } .ba-summary-list ul { margin: 0; padding-left: 20px; } .ba-summary-list li { margin-bottom: 4px; }',
                'enabled': True
            },
            {
                'id': 'ba-table',
                'label': '比較テーブル',
                'roles': ['explain'],
                'schema': 'table',
                'options': {'headers': {'required': True, 'source': 'claude'}},
                'class': 'ba-table',
                'css': '.ba-table { margin: 24px 0; overflow-x: auto; } .ba-table table { width: 100%; border-collapse: collapse; } .ba-table th, .ba-table td { border: 1px solid #e0e0e0; padding: 12px; text-align: left; } .ba-table th { background-color: #f5f5f5; font-weight: 700; }',
                'enabled': True
            },
            {
                'id': 'ba-callout',
                'label': 'アクションボタン',
                'roles': ['action'],
                'schema': 'callout',
                'options': {'buttonText': {'source': 'claude'}},
                'class': 'ba-callout',
                'css': '.ba-callout { background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 20px 24px; margin: 24px 0; border-radius: 0 8px 8px 0; text-align: center; } .ba-callout p { margin-bottom: 16px; font-size: 16px; } .ba-callout .callout-button { background-color: #4caf50; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background-color 0.2s; } .ba-callout .callout-button:hover { background-color: #43a047; }',
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


def validate_and_filter_decorations(structure: Dict[str, Any], decorations: list) -> Dict[str, Any]:
    """
    Claudeが直接指定したdecorationIdを検証し、無効な装飾を除去する

    - 有効な装飾のみを通す（enabled=True）
    - 存在しないdecorationIdは除去
    """
    # 有効な装飾IDのセットを作成
    enabled_decoration_ids = {
        dec['id'] for dec in decorations
        if dec.get('enabled', True)
    }

    def process_block(block: Dict[str, Any]) -> Dict[str, Any]:
        decoration_id = block.get('decorationId')

        # decorationIdが無効な場合は除去
        if decoration_id and decoration_id not in enabled_decoration_ids:
            log_warning(f'Invalid or disabled decorationId: {decoration_id}')
            new_block = {k: v for k, v in block.items() if k not in ('decorationId', 'title')}
        else:
            new_block = dict(block)

        # 入れ子のblocksを処理
        if 'blocks' in new_block:
            new_block['blocks'] = [process_block(b) for b in new_block['blocks']]

        return new_block

    # 構造全体を処理
    validated_structure = {
        'title': structure.get('title', ''),
        'sections': []
    }

    for section in structure.get('sections', []):
        new_section = {
            'heading': section.get('heading', ''),
            'blocks': [process_block(b) for b in section.get('blocks', [])]
        }
        validated_structure['sections'].append(new_section)

    if 'meta' in structure:
        validated_structure['meta'] = structure['meta']

    return validated_structure


def structure_to_markdown(validated_structure: Dict[str, Any], decorations: list) -> str:
    """
    マッピング済み構造から純粋なMarkdownを生成
    装飾は無視し、通常のMarkdown記法のみを使用
    """
    lines = []

    for section in validated_structure.get('sections', []):
        # H2見出し
        lines.append(f"## {section.get('heading', '')}")
        lines.append('')

        for block in section.get('blocks', []):
            lines.extend(block_to_markdown_plain(block))
            lines.append('')

    return '\n'.join(lines)


def block_to_markdown(block: Dict[str, Any], decorations: list, indent: int = 0) -> list:
    """ブロックをMarkdown行に変換（WordPress用装飾タグ付き）"""
    lines = []
    block_type = block.get('type', 'paragraph')
    content = block.get('content', '')
    decoration_id = block.get('decorationId')
    title = block.get('title', '')  # boxスキーマ用のタイトル

    if block_type == 'paragraph':
        if decoration_id:
            # タイトルがある場合はtitle属性も追加
            title_attr = f' title="{title}"' if title else ''
            lines.append(f':::box id="{decoration_id}"{title_attr}')
            lines.append(content)
            lines.append(':::')
        else:
            lines.append(content)

    elif block_type == 'list':
        list_type = block.get('listType', 'unordered')
        items = block.get('items', [])

        if decoration_id:
            title_attr = f' title="{title}"' if title else ''
            lines.append(f':::box id="{decoration_id}"{title_attr}')

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


def block_to_markdown_plain(block: Dict[str, Any]) -> list:
    """ブロックを純粋なMarkdown行に変換（装飾は無視）"""
    lines = []
    block_type = block.get('type', 'paragraph')
    content = block.get('content', '')
    title = block.get('title', '')
    decoration_id = block.get('decorationId')

    if block_type == 'paragraph':
        # boxスキーマの装飾がある場合は引用ブロックとして表現
        if decoration_id and title:
            lines.append(f'> **{title}**')
            lines.append(f'> ')
            lines.append(f'> {content}')
        else:
            # 通常の段落（ハイライトも含む）
            lines.append(content)

    elif block_type == 'list':
        list_type = block.get('listType', 'unordered')
        items = block.get('items', [])

        # タイトルがある場合は太字で表示
        if title:
            lines.append(f'**{title}**')
            lines.append('')

        for i, item in enumerate(items):
            if list_type == 'unordered':
                lines.append(f'- {item}')
            else:
                lines.append(f'{i + 1}. {item}')

    elif block_type == 'subsection':
        # H3見出し
        lines.append(f"### {block.get('heading', '')}")
        lines.append('')
        for sub_block in block.get('blocks', []):
            lines.extend(block_to_markdown_plain(sub_block))
            lines.append('')

    return lines


def structure_to_wordpress(validated_structure: Dict[str, Any], decorations: list) -> str:
    """
    マッピング済み構造からWordPress Gutenbergブロック形式を生成
    decorationId → 装飾divタグ変換
    """
    blocks = []

    for section in validated_structure.get('sections', []):
        # H2見出し
        heading = section.get('heading', '')
        blocks.append(f'<!-- wp:heading -->\n<h2 class="wp-block-heading">{html_escape(heading)}</h2>\n<!-- /wp:heading -->')

        for block in section.get('blocks', []):
            blocks.extend(block_to_wordpress(block, decorations))

    return '\n\n'.join(blocks)


def html_escape(text: str) -> str:
    """HTMLエスケープ"""
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')


def block_to_wordpress(block: Dict[str, Any], decorations: list) -> list:
    """ブロックをWordPress Gutenbergブロック形式に変換"""
    blocks = []
    block_type = block.get('type', 'paragraph')
    content = block.get('content', '')
    decoration_id = block.get('decorationId')
    title = block.get('title', '')  # boxスキーマ用のタイトル

    # 装飾情報を取得
    decoration = None
    if decoration_id:
        decoration = next((d for d in decorations if d.get('id') == decoration_id), None)

    if block_type == 'paragraph':
        if decoration:
            dec_class = decoration.get('class', decoration_id)
            schema = decoration.get('schema', 'paragraph')

            if schema == 'paragraph':
                # インライン装飾（paragraph schema）→ 段落内にspan
                blocks.append(
                    f'<!-- wp:paragraph -->\n'
                    f'<p><span class="{dec_class}">{html_escape(content)}</span></p>\n'
                    f'<!-- /wp:paragraph -->'
                )
            else:
                # ボックス装飾（box等のschema）→ divで囲む、タイトルがあれば追加
                title_html = f'<p class="box-title">{html_escape(title)}</p>\n' if title else ''
                blocks.append(
                    f'<!-- wp:html -->\n'
                    f'<div class="{dec_class}">\n'
                    f'{title_html}'
                    f'<p>{html_escape(content)}</p>\n'
                    f'</div>\n'
                    f'<!-- /wp:html -->'
                )
        else:
            # 通常の段落
            blocks.append(f'<!-- wp:paragraph -->\n<p>{html_escape(content)}</p>\n<!-- /wp:paragraph -->')

    elif block_type == 'list':
        list_type = block.get('listType', 'unordered')
        items = block.get('items', [])

        if list_type == 'ordered':
            tag = 'ol'
            block_name = 'list'
            attrs = ' {"ordered":true}'
        else:
            tag = 'ul'
            block_name = 'list'
            attrs = ''

        items_html = '\n'.join(f'<li>{html_escape(item)}</li>' for item in items)

        if decoration:
            # 装飾付きリスト → カスタムHTMLブロック、タイトルがあれば追加
            dec_class = decoration.get('class', decoration_id)
            title_html = f'<p class="box-title">{html_escape(title)}</p>\n' if title else ''
            blocks.append(
                f'<!-- wp:html -->\n'
                f'<div class="{dec_class}">\n'
                f'{title_html}'
                f'<{tag}>\n{items_html}\n</{tag}>\n'
                f'</div>\n'
                f'<!-- /wp:html -->'
            )
        else:
            # 通常のリスト
            blocks.append(
                f'<!-- wp:{block_name}{attrs} -->\n'
                f'<{tag} class="wp-block-list">\n{items_html}\n</{tag}>\n'
                f'<!-- /wp:{block_name} -->'
            )

    elif block_type == 'subsection':
        # H3見出し
        heading = block.get('heading', '')
        blocks.append(
            f'<!-- wp:heading {{"level":3}} -->\n'
            f'<h3 class="wp-block-heading">{html_escape(heading)}</h3>\n'
            f'<!-- /wp:heading -->'
        )
        for sub_block in block.get('blocks', []):
            blocks.extend(block_to_wordpress(sub_block, decorations))

    return blocks


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
    """SQSメッセージを処理して記事を生成"""
    import re

    for record in event.get('Records', []):
        try:
            message = json.loads(record['body'])
            job_id = message['jobId']
            user_id = message['userId']
            body = message['body']

            # 出力形式を最初に取得
            output_format = body.get('outputFormat', 'wordpress')

            log_info('Processing SQS message',
                     job_id=job_id,
                     user_id=user_id,
                     output_format=output_format)

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

            # サンプル記事がない場合はデフォルトを使用
            if not user_settings.get('sampleArticles'):
                from sample_articles import get_default_sample_article
                sample_wp = get_default_sample_article('wordpress')
                sample_md = get_default_sample_article('markdown')
                user_settings['sampleArticles'] = [sample_wp, sample_md]
                log_info('Using default sample articles', job_id=job_id)

            start_time = datetime.now()
            claude_client = get_claude_client()

            # ==========================================
            # 出力形式によってフローを完全に分岐
            # ==========================================
            if output_format == 'markdown':
                # ==========================================
                # Markdown: Claudeが直接Markdownを生成
                # ==========================================
                markdown_prompt = build_markdown_prompt(body, user_settings)

                log_info('Markdown direct generation',
                         job_id=job_id,
                         prompt_length=len(markdown_prompt))

                markdown_response = claude_client.messages.create(
                    model=CLAUDE_MODEL,
                    max_tokens=20000,
                    temperature=0.7,
                    messages=[{"role": "user", "content": markdown_prompt}]
                )

                content = markdown_response.content[0].text

                # コードブロックで囲まれている場合は除去
                if content.startswith('```markdown'):
                    content = re.sub(r'^```markdown\s*', '', content)
                    content = re.sub(r'\s*```$', '', content)
                elif content.startswith('```'):
                    content = re.sub(r'^```\s*', '', content)
                    content = re.sub(r'\s*```$', '', content)

                log_info('Markdown generated directly',
                         job_id=job_id,
                         input_tokens=markdown_response.usage.input_tokens,
                         output_tokens=markdown_response.usage.output_tokens)

                generation_time = (datetime.now() - start_time).total_seconds()

                # 生成結果の検証
                structure_validation = validate_markdown_structure(content)
                if not structure_validation['valid']:
                    log_warning('Generated article has structure issues', issues=structure_validation['issues'])

                # メタデータ（Markdown用）
                prompt_metadata = {
                    'model': CLAUDE_MODEL,
                    'temperature': Decimal('0.7'),
                    'inputTokens': markdown_response.usage.input_tokens,
                    'outputTokens': markdown_response.usage.output_tokens
                }

            else:
                # ==========================================
                # WordPress: 2段階生成（JSON構造 → HTML変換）
                # ==========================================
                # 装飾設定を取得（新スキーマ：list形式）
                decorations = user_settings.get('decorations', [])
                if not isinstance(decorations, list):
                    decorations = get_default_settings()['decorations']

                # Step 1: 構造生成
                structure_prompt = build_structure_prompt(body, user_settings)

                log_info('WordPress Step 1: Structure generation',
                         job_id=job_id,
                         prompt_length=len(structure_prompt))

                structure_response = claude_client.messages.create(
                    model=CLAUDE_MODEL,
                    max_tokens=20000,
                    temperature=0.7,
                    messages=[{"role": "user", "content": structure_prompt}]
                )

                structure_text = structure_response.content[0].text

                # JSONをパース
                json_match = re.search(r'```json\s*(\{.*?\})\s*```', structure_text, re.DOTALL)
                if json_match:
                    structure = json.loads(json_match.group(1))
                else:
                    structure = json.loads(structure_text)

                log_info('WordPress Step 1 completed: Structure parsed',
                         job_id=job_id,
                         sections_count=len(structure.get('sections', [])))

                # DecorationIdの検証とフィルタリング
                validated_structure = validate_and_filter_decorations(structure, decorations)
                log_info('Decoration validation completed', job_id=job_id)

                # Step 2: WordPress HTML生成
                content = structure_to_wordpress(validated_structure, decorations)
                log_info('WordPress HTML generated', job_id=job_id)

                generation_time = (datetime.now() - start_time).total_seconds()
                structure_validation = {'valid': True, 'issues': [], 'headingCount': 0, 'h2Count': 0}

                # メタデータ（WordPress用）
                prompt_metadata = {
                    'model': CLAUDE_MODEL,
                    'temperature': Decimal('0.7'),
                    'inputTokens': structure_response.usage.input_tokens,
                    'outputTokens': structure_response.usage.output_tokens
                }

            # 記事ID生成
            article_id = generate_article_id()
            current_time = get_current_timestamp()
            word_count = count_characters(content)
            reading_time = estimate_reading_time(content)

            # DynamoDBに記事を保存
            generation_method = 'direct' if output_format == 'markdown' else 'two-step'
            article = {
                'userId': user_id,
                'articleId': article_id,
                'title': body['title'],
                'markdown': content,  # WordPress HTMLまたはMarkdown
                'outputFormat': output_format,
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
                    'outputFormat': output_format,
                    'generationTime': Decimal(str(round(generation_time, 2))),
                    'structureValidation': structure_validation,
                    'generationMethod': generation_method,
                    'prompt': prompt_metadata
                }
            }
            articles_table.put_item(Item=article)

            # ジョブを完了に更新
            result = {
                'articleId': article_id,
                'title': body['title'],
                'markdown': content,  # WordPress HTMLまたはMarkdown
                'outputFormat': output_format,
                'metadata': {
                    'wordCount': word_count,
                    'readingTime': reading_time,
                    'generationTime': Decimal(str(round(generation_time, 2))),
                    'structureValidation': structure_validation
                }
            }
            update_job_status(job_id, 'completed', result=result)

            log_info('Article generated successfully',
                     job_id=job_id,
                     article_id=article_id,
                     output_format=output_format,
                     generation_method=generation_method,
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
