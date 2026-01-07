"""
記事生成Lambda関数
Phase 2: 記事生成コアの実装
"""

import json
import os
from datetime import datetime
from typing import Dict, Any, Optional

import boto3
import anthropic
from boto3.dynamodb.conditions import Key

from validators import validate_article_input, validate_settings, sanitize_body
from prompt_builder import (
    build_prompt,
    build_title_generation_prompt,
    build_meta_generation_prompt
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
CLAUDE_MODEL = os.environ.get('CLAUDE_MODEL', 'claude-sonnet-4-20250514')

# クライアント初期化
dynamodb = boto3.resource('dynamodb')
articles_table = dynamodb.Table(DYNAMODB_TABLE_ARTICLES)
settings_table = dynamodb.Table(DYNAMODB_TABLE_SETTINGS)


def get_claude_client() -> anthropic.Anthropic:
    """Claude APIクライアントを取得"""
    return anthropic.Anthropic(api_key=CLAUDE_API_KEY)


def get_user_settings(user_id: str) -> Optional[Dict[str, Any]]:
    """
    ユーザー設定をDynamoDBから取得

    Args:
        user_id: ユーザーID

    Returns:
        ユーザー設定、またはNone
    """
    try:
        response = settings_table.get_item(
            Key={'userId': user_id}
        )
        return response.get('Item')
    except Exception as e:
        log_warning('Failed to get user settings', user_id=user_id, error=str(e))
        return None


def generate_article(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    記事を生成するメインハンドラー

    Args:
        event: API Gatewayイベント
        context: Lambdaコンテキスト

    Returns:
        API Gatewayレスポンス
    """
    try:
        # ユーザーID取得
        user_id = get_user_id(event)
        if not user_id:
            return create_response(401, error_code='AUTH_001', error_message='認証が必要です')

        # リクエストボディ解析
        body = parse_event_body(event)
        if not body:
            return create_response(400, error_code='VALIDATION_001', error_message='リクエストボディが不正です')

        # サニタイズ
        body = sanitize_body(body)

        # 入力検証
        validation_error = validate_article_input(body)
        if validation_error:
            return create_response(400, error_code='VALIDATION_002', error_message=validation_error)

        log_info('Article generation started', user_id=user_id, title=body.get('title'))

        # ユーザー設定を取得
        user_settings = get_user_settings(user_id)
        if user_settings:
            settings_error = validate_settings(user_settings)
            if settings_error:
                log_warning('Invalid user settings', user_id=user_id, error=settings_error)
                user_settings = None

        # プロンプト構築
        prompt = build_prompt(body, user_settings)

        # Claude APIで記事生成
        start_time = datetime.now()
        claude_client = get_claude_client()

        message = claude_client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=8000,
            temperature=0.7,
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )

        generation_time = (datetime.now() - start_time).total_seconds()
        markdown_content = message.content[0].text

        # 生成結果の検証
        structure_validation = validate_markdown_structure(markdown_content)
        if not structure_validation['valid']:
            log_warning('Generated article has structure issues',
                        issues=structure_validation['issues'])

        # 記事ID生成
        article_id = generate_article_id()
        current_time = get_current_timestamp()

        # 文字数と読了時間を計算
        word_count = count_characters(markdown_content)
        reading_time = estimate_reading_time(markdown_content)

        # DynamoDBに保存
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
                'generationTime': generation_time,
                'structureValidation': structure_validation,
                'prompt': {
                    'model': CLAUDE_MODEL,
                    'temperature': 0.7,
                    'inputTokens': message.usage.input_tokens,
                    'outputTokens': message.usage.output_tokens
                }
            }
        }

        articles_table.put_item(Item=article)

        log_info('Article generated successfully',
                 user_id=user_id,
                 article_id=article_id,
                 word_count=word_count,
                 generation_time=generation_time)

        return create_response(200, data={
            'articleId': article_id,
            'title': body['title'],
            'markdown': markdown_content,
            'metadata': {
                'wordCount': word_count,
                'readingTime': reading_time,
                'generationTime': round(generation_time, 2),
                'structureValidation': structure_validation
            }
        })

    except anthropic.APIError as e:
        log_error('Claude API Error', e)
        return create_response(503, error_code='CLAUDE_001',
                               error_message='AI記事生成サービスでエラーが発生しました。しばらく待ってから再試行してください。')

    except anthropic.RateLimitError as e:
        log_error('Claude Rate Limit', e)
        return create_response(429, error_code='CLAUDE_002',
                               error_message='リクエスト制限に達しました。しばらく待ってから再試行してください。')

    except Exception as e:
        log_error('Unexpected error in generate_article', e)
        return create_response(500, error_code='SERVER_001',
                               error_message='サーバーエラーが発生しました')


def generate_titles(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    タイトル案を3つ生成

    Args:
        event: API Gatewayイベント
        context: Lambdaコンテキスト

    Returns:
        API Gatewayレスポンス
    """
    try:
        # ユーザーID取得
        user_id = get_user_id(event)
        if not user_id:
            return create_response(401, error_code='AUTH_001', error_message='認証が必要です')

        # リクエストボディ解析
        body = parse_event_body(event)
        if not body:
            return create_response(400, error_code='VALIDATION_001', error_message='リクエストボディが不正です')

        # サニタイズ
        body = sanitize_body(body)

        # 最低限の検証
        if not body.get('contentPoints'):
            return create_response(400, error_code='VALIDATION_002',
                                   error_message='本文の要点は必須です')

        log_info('Title generation started', user_id=user_id)

        # ユーザー設定を取得
        user_settings = get_user_settings(user_id)

        # プロンプト構築
        prompt = build_title_generation_prompt(body, user_settings)

        # Claude APIでタイトル生成
        claude_client = get_claude_client()

        message = claude_client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=1000,
            temperature=0.8,  # 多様性のため少し高め
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )

        response_text = message.content[0].text

        # JSONを抽出
        import re
        json_match = re.search(r'```json\s*(\{.*?\})\s*```', response_text, re.DOTALL)
        if json_match:
            titles_data = json.loads(json_match.group(1))
        else:
            # JSONブロックがない場合は直接パース試行
            titles_data = json.loads(response_text)

        log_info('Titles generated successfully', user_id=user_id, count=len(titles_data.get('titles', [])))

        return create_response(200, data=titles_data)

    except json.JSONDecodeError as e:
        log_error('Failed to parse title response', e)
        return create_response(500, error_code='PARSE_001',
                               error_message='タイトル生成結果のパースに失敗しました')

    except anthropic.APIError as e:
        log_error('Claude API Error', e)
        return create_response(503, error_code='CLAUDE_001',
                               error_message='AI記事生成サービスでエラーが発生しました')

    except Exception as e:
        log_error('Unexpected error in generate_titles', e)
        return create_response(500, error_code='SERVER_001',
                               error_message='サーバーエラーが発生しました')


def generate_meta(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    記事からメタ情報を生成

    Args:
        event: API Gatewayイベント
        context: Lambdaコンテキスト

    Returns:
        API Gatewayレスポンス
    """
    try:
        # ユーザーID取得
        user_id = get_user_id(event)
        if not user_id:
            return create_response(401, error_code='AUTH_001', error_message='認証が必要です')

        # リクエストボディ解析
        body = parse_event_body(event)
        if not body:
            return create_response(400, error_code='VALIDATION_001', error_message='リクエストボディが不正です')

        # 記事内容の検証
        markdown_content = body.get('markdown', '')
        if not markdown_content:
            return create_response(400, error_code='VALIDATION_002',
                                   error_message='記事内容は必須です')

        if len(markdown_content) < 100:
            return create_response(400, error_code='VALIDATION_003',
                                   error_message='記事内容が短すぎます')

        log_info('Meta generation started', user_id=user_id)

        # ユーザー設定を取得
        user_settings = get_user_settings(user_id)
        seo_settings = user_settings.get('seo', {}) if user_settings else {}

        # プロンプト構築
        prompt = build_meta_generation_prompt(markdown_content, seo_settings)

        # Claude APIでメタ情報生成
        claude_client = get_claude_client()

        message = claude_client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=500,
            temperature=0.3,  # 一貫性のため低め
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )

        response_text = message.content[0].text

        # JSONを抽出
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
        return create_response(500, error_code='PARSE_001',
                               error_message='メタ情報生成結果のパースに失敗しました')

    except anthropic.APIError as e:
        log_error('Claude API Error', e)
        return create_response(503, error_code='CLAUDE_001',
                               error_message='AI記事生成サービスでエラーが発生しました')

    except Exception as e:
        log_error('Unexpected error in generate_meta', e)
        return create_response(500, error_code='SERVER_001',
                               error_message='サーバーエラーが発生しました')


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda関数のエントリーポイント
    パスに応じて適切なハンドラーにルーティング

    Args:
        event: API Gatewayイベント
        context: Lambdaコンテキスト

    Returns:
        API Gatewayレスポンス
    """
    # OPTIONSリクエスト（CORS）
    http_method = event.get('httpMethod', '')
    if http_method == 'OPTIONS':
        return create_response(200, data={})

    # パスからアクションを判定
    path = event.get('path', '')
    resource = event.get('resource', '')

    if path.endswith('/titles') or resource.endswith('/titles'):
        return generate_titles(event, context)
    elif path.endswith('/meta') or resource.endswith('/meta'):
        return generate_meta(event, context)
    else:
        # デフォルト：記事生成
        return generate_article(event, context)
