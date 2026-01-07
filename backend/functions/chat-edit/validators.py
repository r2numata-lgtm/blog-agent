"""
チャット修正機能用バリデーター
Phase 3: チャット修正の実装
"""

import re
from typing import Any, Dict, List, Optional


# 定数
MAX_INSTRUCTION_LENGTH = 2000
MAX_ARTICLE_LENGTH = 50000
MAX_SELECTED_TEXT_LENGTH = 5000
MAX_CONVERSATION_MESSAGES = 50


def validate_chat_edit_input(body: Dict[str, Any]) -> Optional[str]:
    """
    チャット編集リクエストの入力検証

    Args:
        body: リクエストボディ

    Returns:
        エラーメッセージ、またはNone（検証成功時）
    """
    # 必須フィールドチェック
    if not body.get('instruction'):
        return '編集指示は必須です'

    if not body.get('articleId') and not body.get('currentContent'):
        return '記事IDまたは現在の記事内容が必要です'

    # 編集指示の検証
    instruction = body.get('instruction', '')
    if len(instruction) > MAX_INSTRUCTION_LENGTH:
        return f'編集指示は{MAX_INSTRUCTION_LENGTH}文字以内で入力してください'

    if len(instruction.strip()) < 5:
        return '編集指示が短すぎます'

    # 記事内容の検証（提供されている場合）
    current_content = body.get('currentContent', '')
    if current_content and len(current_content) > MAX_ARTICLE_LENGTH:
        return f'記事内容は{MAX_ARTICLE_LENGTH}文字以内です'

    # 選択テキストの検証（提供されている場合）
    selected_text = body.get('selectedText', '')
    if selected_text and len(selected_text) > MAX_SELECTED_TEXT_LENGTH:
        return f'選択テキストは{MAX_SELECTED_TEXT_LENGTH}文字以内です'

    return None


def validate_conversation_input(body: Dict[str, Any]) -> Optional[str]:
    """
    会話履歴取得リクエストの入力検証

    Args:
        body: リクエストボディ

    Returns:
        エラーメッセージ、またはNone（検証成功時）
    """
    # 記事IDチェック
    article_id = body.get('articleId')
    if not article_id:
        return '記事IDは必須です'

    # 記事ID形式チェック
    if not re.match(r'^art_[a-f0-9]{16}$', article_id):
        return '記事IDの形式が不正です'

    # リミットチェック
    limit = body.get('limit', 20)
    if not isinstance(limit, int) or limit < 1 or limit > MAX_CONVERSATION_MESSAGES:
        return f'取得件数は1〜{MAX_CONVERSATION_MESSAGES}の範囲で指定してください'

    return None


def validate_revision_input(body: Dict[str, Any]) -> Optional[str]:
    """
    リビジョン操作リクエストの入力検証

    Args:
        body: リクエストボディ

    Returns:
        エラーメッセージ、またはNone（検証成功時）
    """
    # 記事IDチェック
    article_id = body.get('articleId')
    if not article_id:
        return '記事IDは必須です'

    # アクションチェック
    action = body.get('action')
    if action not in ['list', 'get', 'revert']:
        return 'アクションはlist, get, revertのいずれかを指定してください'

    # revert時はrevisionIdが必要
    if action == 'revert' and not body.get('revisionId'):
        return '元に戻すにはリビジョンIDが必要です'

    return None


def sanitize_instruction(instruction: str) -> str:
    """
    編集指示をサニタイズ

    Args:
        instruction: 編集指示

    Returns:
        サニタイズされた編集指示
    """
    # 制御文字を除去
    sanitized = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', instruction)

    # 連続空白を正規化
    sanitized = re.sub(r' {3,}', '  ', sanitized)

    # 連続改行を正規化
    sanitized = re.sub(r'\n{4,}', '\n\n\n', sanitized)

    return sanitized.strip()


def sanitize_markdown(markdown: str) -> str:
    """
    Markdownコンテンツをサニタイズ

    Args:
        markdown: Markdownテキスト

    Returns:
        サニタイズされたMarkdown
    """
    # 制御文字を除去（改行・タブは維持）
    sanitized = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', markdown)

    # 危険なHTMLタグを除去（script, iframe など）
    dangerous_tags = ['script', 'iframe', 'object', 'embed', 'form']
    for tag in dangerous_tags:
        sanitized = re.sub(
            rf'<{tag}[^>]*>.*?</{tag}>',
            '',
            sanitized,
            flags=re.IGNORECASE | re.DOTALL
        )
        sanitized = re.sub(
            rf'<{tag}[^>]*/?>',
            '',
            sanitized,
            flags=re.IGNORECASE
        )

    # onイベントハンドラを除去
    sanitized = re.sub(r'\s+on\w+\s*=\s*["\'][^"\']*["\']', '', sanitized, flags=re.IGNORECASE)

    # javascript: URLを除去
    sanitized = re.sub(r'javascript:', '', sanitized, flags=re.IGNORECASE)

    return sanitized


def validate_ai_response(response: Dict[str, Any]) -> Optional[str]:
    """
    AI応答の検証

    Args:
        response: AIからの応答

    Returns:
        エラーメッセージ、またはNone（検証成功時）
    """
    # actionフィールドチェック
    action = response.get('action')
    valid_actions = ['edit', 'append', 'replace_section', 'no_change', 'undo']
    if action not in valid_actions:
        return f'不正なアクション: {action}'

    # no_change以外はmodifiedが必要
    if action != 'no_change' and not response.get('modified') and not response.get('full_markdown'):
        return '変更内容が含まれていません'

    # explanationチェック
    if not response.get('explanation'):
        return '変更の説明が含まれていません'

    return None


def validate_article_id(article_id: str) -> bool:
    """
    記事IDの形式を検証

    Args:
        article_id: 記事ID

    Returns:
        有効な形式かどうか
    """
    return bool(re.match(r'^art_[a-f0-9]{16}$', article_id))


def validate_conversation_id(conversation_id: str) -> bool:
    """
    会話IDの形式を検証

    Args:
        conversation_id: 会話ID

    Returns:
        有効な形式かどうか
    """
    return bool(re.match(r'^conv_[a-f0-9]{16}$', conversation_id))


def validate_revision_id(revision_id: str) -> bool:
    """
    リビジョンIDの形式を検証

    Args:
        revision_id: リビジョンID

    Returns:
        有効な形式かどうか
    """
    return bool(re.match(r'^rev_[a-f0-9]{12}$', revision_id))
