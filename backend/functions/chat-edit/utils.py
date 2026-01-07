"""
チャット修正機能用ユーティリティモジュール
Phase 3: チャット修正の実装
"""

import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

# ロガー設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def generate_conversation_id() -> str:
    """
    会話IDを生成

    Returns:
        一意の会話ID
    """
    return f"conv_{uuid.uuid4().hex[:16]}"


def generate_message_id() -> str:
    """
    メッセージIDを生成

    Returns:
        一意のメッセージID
    """
    return f"msg_{uuid.uuid4().hex[:12]}"


def generate_revision_id() -> str:
    """
    リビジョンIDを生成

    Returns:
        一意のリビジョンID
    """
    return f"rev_{uuid.uuid4().hex[:12]}"


def get_current_timestamp() -> int:
    """
    現在のUNIXタイムスタンプを取得

    Returns:
        UNIXタイムスタンプ（秒）
    """
    return int(datetime.now().timestamp())


def log_info(message: str, **kwargs) -> None:
    """
    情報ログを出力

    Args:
        message: ログメッセージ
        **kwargs: 追加のログデータ
    """
    log_data = {
        'level': 'INFO',
        'message': message,
        'timestamp': datetime.now().isoformat(),
        **kwargs
    }
    logger.info(json.dumps(log_data, ensure_ascii=False))


def log_error(message: str, error: Optional[Exception] = None, **kwargs) -> None:
    """
    エラーログを出力

    Args:
        message: ログメッセージ
        error: エラーオブジェクト
        **kwargs: 追加のログデータ
    """
    log_data = {
        'level': 'ERROR',
        'message': message,
        'timestamp': datetime.now().isoformat(),
        **kwargs
    }
    if error:
        log_data['error'] = str(error)
        log_data['error_type'] = type(error).__name__

    logger.error(json.dumps(log_data, ensure_ascii=False))


def log_warning(message: str, **kwargs) -> None:
    """
    警告ログを出力

    Args:
        message: ログメッセージ
        **kwargs: 追加のログデータ
    """
    log_data = {
        'level': 'WARNING',
        'message': message,
        'timestamp': datetime.now().isoformat(),
        **kwargs
    }
    logger.warning(json.dumps(log_data, ensure_ascii=False))


def create_response(
    status_code: int,
    data: Optional[Dict[str, Any]] = None,
    error_code: Optional[str] = None,
    error_message: Optional[str] = None
) -> Dict[str, Any]:
    """
    API Gatewayレスポンスを作成

    Args:
        status_code: HTTPステータスコード
        data: レスポンスデータ（成功時）
        error_code: エラーコード（エラー時）
        error_message: エラーメッセージ（エラー時）

    Returns:
        API Gatewayレスポンス形式の辞書
    """
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    }

    if error_code:
        body = {
            'success': False,
            'error': {
                'code': error_code,
                'message': error_message or 'エラーが発生しました'
            }
        }
    else:
        body = {
            'success': True,
            'data': data
        }

    return {
        'statusCode': status_code,
        'headers': headers,
        'body': json.dumps(body, ensure_ascii=False)
    }


def parse_event_body(event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    API GatewayイベントからボディをJSONとしてパース

    Args:
        event: API Gatewayイベント

    Returns:
        パースされたボディ、またはNone
    """
    body = event.get('body')
    if not body:
        return None

    try:
        if isinstance(body, str):
            return json.loads(body)
        return body
    except json.JSONDecodeError:
        return None


def get_user_id(event: Dict[str, Any]) -> Optional[str]:
    """
    API GatewayイベントからユーザーIDを取得

    Args:
        event: API Gatewayイベント

    Returns:
        ユーザーID、またはNone
    """
    request_context = event.get('requestContext', {})
    authorizer = request_context.get('authorizer', {})
    return authorizer.get('principalId') or authorizer.get('claims', {}).get('sub')


def get_path_parameter(event: Dict[str, Any], param_name: str) -> Optional[str]:
    """
    パスパラメータを取得

    Args:
        event: API Gatewayイベント
        param_name: パラメータ名

    Returns:
        パラメータ値、またはNone
    """
    path_params = event.get('pathParameters') or {}
    return path_params.get(param_name)


def format_conversation_history(messages: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """
    会話履歴をClaude API形式に整形

    Args:
        messages: 会話メッセージのリスト

    Returns:
        Claude API形式のメッセージリスト
    """
    formatted = []
    for msg in messages:
        role = 'user' if msg.get('role') == 'user' else 'assistant'
        content = msg.get('content', '')
        formatted.append({
            'role': role,
            'content': content
        })
    return formatted


def truncate_text(text: str, max_length: int = 500) -> str:
    """
    テキストを指定長さで切り詰め

    Args:
        text: 対象テキスト
        max_length: 最大長さ

    Returns:
        切り詰められたテキスト
    """
    if len(text) <= max_length:
        return text
    return text[:max_length - 3] + '...'
