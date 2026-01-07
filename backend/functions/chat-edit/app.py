"""
チャット修正Lambda関数
Phase 3: チャット修正の実装
"""

import json
import os
import re
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

import boto3
import anthropic
from boto3.dynamodb.conditions import Key

from validators import (
    validate_chat_edit_input,
    validate_conversation_input,
    validate_revision_input,
    sanitize_instruction,
    sanitize_markdown,
    validate_ai_response,
    validate_article_id
)
from prompt_builder import (
    build_chat_edit_system_prompt,
    build_chat_edit_prompt,
    build_section_edit_prompt,
    build_follow_up_prompt
)
from diff_utils import (
    detect_edit_intent,
    create_revision_record,
    apply_section_replacement,
    apply_text_replacement,
    split_markdown_sections
)
from utils import (
    generate_conversation_id,
    generate_message_id,
    generate_revision_id,
    get_current_timestamp,
    log_info,
    log_error,
    log_warning,
    create_response,
    parse_event_body,
    get_user_id,
    get_path_parameter,
    format_conversation_history,
    truncate_text
)


# 環境変数
CLAUDE_API_KEY = os.environ.get('CLAUDE_API_KEY', '')
DYNAMODB_TABLE_ARTICLES = os.environ.get('DYNAMODB_TABLE_ARTICLES', 'blog-agent-articles')
DYNAMODB_TABLE_CONVERSATIONS = os.environ.get('DYNAMODB_TABLE_CONVERSATIONS', 'blog-agent-conversations')
CLAUDE_MODEL = os.environ.get('CLAUDE_MODEL', 'claude-sonnet-4-20250514')
MAX_REVISIONS = 10

# クライアント初期化
dynamodb = boto3.resource('dynamodb')
articles_table = dynamodb.Table(DYNAMODB_TABLE_ARTICLES)
conversations_table = dynamodb.Table(DYNAMODB_TABLE_CONVERSATIONS)


class DecimalEncoder(json.JSONEncoder):
    """DynamoDB Decimal型をJSONシリアライズ"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)


def get_claude_client() -> anthropic.Anthropic:
    """Claude APIクライアントを取得"""
    return anthropic.Anthropic(api_key=CLAUDE_API_KEY)


def get_article(user_id: str, article_id: str) -> Optional[Dict[str, Any]]:
    """
    記事をDynamoDBから取得

    Args:
        user_id: ユーザーID
        article_id: 記事ID

    Returns:
        記事データ、またはNone
    """
    try:
        response = articles_table.get_item(
            Key={'userId': user_id, 'articleId': article_id}
        )
        return response.get('Item')
    except Exception as e:
        log_error('Failed to get article', e, user_id=user_id, article_id=article_id)
        return None


def get_conversation(user_id: str, article_id: str) -> Optional[Dict[str, Any]]:
    """
    会話履歴をDynamoDBから取得

    Args:
        user_id: ユーザーID
        article_id: 記事ID

    Returns:
        会話データ、またはNone
    """
    try:
        response = conversations_table.query(
            KeyConditionExpression=Key('userId').eq(user_id) & Key('articleId').eq(article_id),
            Limit=1
        )
        items = response.get('Items', [])
        return items[0] if items else None
    except Exception as e:
        log_error('Failed to get conversation', e, user_id=user_id, article_id=article_id)
        return None


def save_conversation(conversation: Dict[str, Any]) -> bool:
    """
    会話履歴をDynamoDBに保存

    Args:
        conversation: 会話データ

    Returns:
        成功したかどうか
    """
    try:
        conversations_table.put_item(Item=conversation)
        return True
    except Exception as e:
        log_error('Failed to save conversation', e)
        return False


def update_article(user_id: str, article_id: str, markdown: str) -> bool:
    """
    記事を更新

    Args:
        user_id: ユーザーID
        article_id: 記事ID
        markdown: 新しいMarkdown内容

    Returns:
        成功したかどうか
    """
    try:
        articles_table.update_item(
            Key={'userId': user_id, 'articleId': article_id},
            UpdateExpression='SET markdown = :md, updatedAt = :ua',
            ExpressionAttributeValues={
                ':md': markdown,
                ':ua': get_current_timestamp()
            }
        )
        return True
    except Exception as e:
        log_error('Failed to update article', e, user_id=user_id, article_id=article_id)
        return False


def parse_ai_response(response_text: str) -> Optional[Dict[str, Any]]:
    """
    AI応答からJSONを抽出してパース

    Args:
        response_text: AI応答テキスト

    Returns:
        パースされたJSON、またはNone
    """
    try:
        # JSONブロックを抽出
        json_match = re.search(r'```json\s*(\{.*?\})\s*```', response_text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(1))

        # JSONブロックがない場合は直接パース試行
        # 最初の{から最後の}までを抽出
        brace_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if brace_match:
            return json.loads(brace_match.group())

        return None
    except json.JSONDecodeError as e:
        log_warning('Failed to parse AI response JSON', error=str(e))
        return None


def chat_edit(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    チャットで記事を編集

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

        # 入力検証
        validation_error = validate_chat_edit_input(body)
        if validation_error:
            return create_response(400, error_code='VALIDATION_002', error_message=validation_error)

        instruction = sanitize_instruction(body['instruction'])
        article_id = body.get('articleId')
        current_content = body.get('currentContent', '')
        selected_text = body.get('selectedText', '')

        log_info('Chat edit started', user_id=user_id, article_id=article_id)

        # 記事を取得（IDが指定されている場合）
        article = None
        if article_id:
            article = get_article(user_id, article_id)
            if not article:
                return create_response(404, error_code='NOT_FOUND_001', error_message='記事が見つかりません')
            current_content = article.get('markdown', current_content)

        if not current_content:
            return create_response(400, error_code='VALIDATION_003', error_message='記事内容が必要です')

        current_content = sanitize_markdown(current_content)

        # 会話履歴を取得
        conversation = None
        if article_id:
            conversation = get_conversation(user_id, article_id)

        # 編集意図を検出
        edit_intent = detect_edit_intent(instruction, current_content)

        # 編集コンテキストを構築
        edit_context = {}
        if selected_text:
            edit_context['selected_text'] = selected_text
            edit_context['selection_context'] = 'ユーザーが選択したテキスト'

        # 会話履歴を整形
        conversation_history = []
        previous_changes = []
        if conversation:
            messages = conversation.get('messages', [])
            conversation_history = format_conversation_history(messages[-10:])  # 直近10件
            previous_changes = conversation.get('revisions', [])[-3:]  # 直近3件の変更

        # プロンプト構築
        if previous_changes:
            prompt = build_follow_up_prompt(instruction, current_content, previous_changes)
        else:
            prompt = build_chat_edit_prompt(instruction, current_content, conversation_history, edit_context)

        # Claude APIで編集
        start_time = datetime.now()
        claude_client = get_claude_client()

        # 会話履歴を含めてリクエスト
        messages = conversation_history.copy() if conversation_history else []
        messages.append({'role': 'user', 'content': prompt})

        message = claude_client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=8000,
            temperature=0.3,  # 編集は一貫性重視
            system=build_chat_edit_system_prompt(),
            messages=messages
        )

        generation_time = (datetime.now() - start_time).total_seconds()
        response_text = message.content[0].text

        # AI応答をパース
        ai_response = parse_ai_response(response_text)
        if not ai_response:
            log_warning('Failed to parse AI response', response_preview=truncate_text(response_text))
            return create_response(500, error_code='PARSE_001',
                                   error_message='AI応答の解析に失敗しました。もう一度お試しください。')

        # AI応答を検証
        response_validation = validate_ai_response(ai_response)
        if response_validation:
            log_warning('Invalid AI response', error=response_validation)
            return create_response(500, error_code='PARSE_002', error_message=response_validation)

        # 変更を適用
        action = ai_response.get('action')
        new_content = current_content

        if action == 'no_change':
            # 変更なし
            pass
        elif action in ['edit', 'append', 'replace_section']:
            # 変更あり
            if ai_response.get('full_markdown'):
                new_content = sanitize_markdown(ai_response['full_markdown'])
            elif action == 'replace_section' and ai_response.get('target') and ai_response.get('modified'):
                new_content, _ = apply_section_replacement(
                    current_content,
                    ai_response['target'],
                    ai_response['modified']
                )
            elif action == 'edit' and ai_response.get('original') and ai_response.get('modified'):
                new_content, _ = apply_text_replacement(
                    current_content,
                    ai_response['original'],
                    ai_response['modified']
                )

        # リビジョンレコードを作成
        revision = None
        if action != 'no_change' and new_content != current_content:
            revision = {
                'revisionId': generate_revision_id(),
                'timestamp': get_current_timestamp(),
                'instruction': instruction,
                'action': action,
                'explanation': ai_response.get('explanation', ''),
                'originalContent': current_content,
                'newContent': new_content,
                'diff': create_revision_record(current_content, new_content, instruction, {'type': action})
            }

        # 会話履歴を更新
        conversation_id = conversation.get('conversationId') if conversation else generate_conversation_id()
        current_time = get_current_timestamp()

        new_message_user = {
            'messageId': generate_message_id(),
            'role': 'user',
            'content': instruction,
            'timestamp': current_time
        }

        new_message_assistant = {
            'messageId': generate_message_id(),
            'role': 'assistant',
            'content': ai_response.get('explanation', '変更を適用しました'),
            'timestamp': current_time,
            'action': action
        }

        if conversation:
            # 既存の会話を更新
            messages = conversation.get('messages', [])
            messages.extend([new_message_user, new_message_assistant])
            revisions = conversation.get('revisions', [])
            if revision:
                revisions.append(revision)
                # 最大件数を超えたら古いものを削除
                if len(revisions) > MAX_REVISIONS:
                    revisions = revisions[-MAX_REVISIONS:]
            conversation['messages'] = messages
            conversation['revisions'] = revisions
            conversation['updatedAt'] = current_time
        else:
            # 新しい会話を作成
            conversation = {
                'userId': user_id,
                'articleId': article_id or 'temp',
                'conversationId': conversation_id,
                'messages': [new_message_user, new_message_assistant],
                'revisions': [revision] if revision else [],
                'createdAt': current_time,
                'updatedAt': current_time
            }

        # 会話を保存
        if article_id:
            save_conversation(conversation)

        # 記事を更新
        if article_id and action != 'no_change' and new_content != current_content:
            update_article(user_id, article_id, new_content)

        log_info('Chat edit completed',
                 user_id=user_id,
                 article_id=article_id,
                 action=action,
                 generation_time=generation_time)

        return create_response(200, data={
            'action': action,
            'explanation': ai_response.get('explanation', ''),
            'originalContent': current_content if action != 'no_change' else None,
            'newContent': new_content if action != 'no_change' else None,
            'diff': revision.get('diff') if revision else None,
            'revisionId': revision.get('revisionId') if revision else None,
            'conversationId': conversation_id,
            'metadata': {
                'generationTime': round(generation_time, 2),
                'inputTokens': message.usage.input_tokens,
                'outputTokens': message.usage.output_tokens
            }
        })

    except anthropic.APIError as e:
        log_error('Claude API Error', e)
        return create_response(503, error_code='CLAUDE_001',
                               error_message='AI編集サービスでエラーが発生しました。しばらく待ってから再試行してください。')

    except anthropic.RateLimitError as e:
        log_error('Claude Rate Limit', e)
        return create_response(429, error_code='CLAUDE_002',
                               error_message='リクエスト制限に達しました。しばらく待ってから再試行してください。')

    except Exception as e:
        log_error('Unexpected error in chat_edit', e)
        return create_response(500, error_code='SERVER_001', error_message='サーバーエラーが発生しました')


def get_conversation_history(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    会話履歴を取得

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

        # 記事ID取得
        article_id = get_path_parameter(event, 'articleId')
        if not article_id or not validate_article_id(article_id):
            return create_response(400, error_code='VALIDATION_001', error_message='有効な記事IDが必要です')

        # 会話履歴を取得
        conversation = get_conversation(user_id, article_id)

        if not conversation:
            return create_response(200, data={
                'conversationId': None,
                'messages': [],
                'revisions': []
            })

        return create_response(200, data={
            'conversationId': conversation.get('conversationId'),
            'messages': conversation.get('messages', []),
            'revisions': conversation.get('revisions', []),
            'createdAt': conversation.get('createdAt'),
            'updatedAt': conversation.get('updatedAt')
        })

    except Exception as e:
        log_error('Unexpected error in get_conversation_history', e)
        return create_response(500, error_code='SERVER_001', error_message='サーバーエラーが発生しました')


def revert_revision(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    リビジョンを元に戻す

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

        article_id = body.get('articleId')
        revision_id = body.get('revisionId')

        if not article_id or not validate_article_id(article_id):
            return create_response(400, error_code='VALIDATION_002', error_message='有効な記事IDが必要です')

        if not revision_id:
            return create_response(400, error_code='VALIDATION_003', error_message='リビジョンIDが必要です')

        # 記事を取得
        article = get_article(user_id, article_id)
        if not article:
            return create_response(404, error_code='NOT_FOUND_001', error_message='記事が見つかりません')

        # 会話履歴を取得
        conversation = get_conversation(user_id, article_id)
        if not conversation:
            return create_response(404, error_code='NOT_FOUND_002', error_message='会話履歴が見つかりません')

        # リビジョンを検索
        revisions = conversation.get('revisions', [])
        target_revision = None
        for rev in revisions:
            if rev.get('revisionId') == revision_id:
                target_revision = rev
                break

        if not target_revision:
            return create_response(404, error_code='NOT_FOUND_003', error_message='リビジョンが見つかりません')

        # 元の内容に戻す
        original_content = target_revision.get('originalContent')
        if not original_content:
            return create_response(400, error_code='REVERT_001', error_message='元の内容が保存されていません')

        # 記事を更新
        if not update_article(user_id, article_id, original_content):
            return create_response(500, error_code='UPDATE_001', error_message='記事の更新に失敗しました')

        # 新しいリビジョンを追加（元に戻す操作として）
        current_content = article.get('markdown', '')
        new_revision = {
            'revisionId': generate_revision_id(),
            'timestamp': get_current_timestamp(),
            'instruction': f'リビジョン {revision_id} を元に戻す',
            'action': 'undo',
            'explanation': f'変更を取り消しました: {target_revision.get("explanation", "")}',
            'originalContent': current_content,
            'newContent': original_content
        }

        revisions.append(new_revision)
        if len(revisions) > MAX_REVISIONS:
            revisions = revisions[-MAX_REVISIONS:]

        conversation['revisions'] = revisions
        conversation['updatedAt'] = get_current_timestamp()
        save_conversation(conversation)

        log_info('Revision reverted',
                 user_id=user_id,
                 article_id=article_id,
                 revision_id=revision_id)

        return create_response(200, data={
            'success': True,
            'revertedRevisionId': revision_id,
            'newRevisionId': new_revision['revisionId'],
            'content': original_content
        })

    except Exception as e:
        log_error('Unexpected error in revert_revision', e)
        return create_response(500, error_code='SERVER_001', error_message='サーバーエラーが発生しました')


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

    if '/history' in path or '/history' in resource:
        return get_conversation_history(event, context)
    elif '/revert' in path or '/revert' in resource:
        return revert_revision(event, context)
    else:
        # デフォルト：チャット編集
        return chat_edit(event, context)
