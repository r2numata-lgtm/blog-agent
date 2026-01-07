"""
ユーティリティモジュール
"""

import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

# ロガー設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def generate_article_id() -> str:
    """
    記事IDを生成

    Returns:
        一意の記事ID
    """
    return f"art_{uuid.uuid4().hex[:16]}"


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
    API Gatewayイベントからユーザー IDを取得

    Args:
        event: API Gatewayイベント

    Returns:
        ユーザーID、またはNone
    """
    request_context = event.get('requestContext', {})
    authorizer = request_context.get('authorizer', {})
    return authorizer.get('principalId') or authorizer.get('claims', {}).get('sub')


def count_characters(text: str) -> int:
    """
    テキストの文字数をカウント（日本語対応）

    Args:
        text: カウント対象のテキスト

    Returns:
        文字数
    """
    if not text:
        return 0
    # Markdownの装飾を除いた純粋な文字数
    import re
    # コードブロックを除去
    text = re.sub(r'```.*?```', '', text, flags=re.DOTALL)
    # インラインコードを除去
    text = re.sub(r'`[^`]+`', '', text)
    # リンクをテキストのみに
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    # 画像を除去
    text = re.sub(r'!\[[^\]]*\]\([^)]+\)', '', text)
    # 見出し記号を除去
    text = re.sub(r'^#{1,6}\s*', '', text, flags=re.MULTILINE)
    # 強調記号を除去
    text = re.sub(r'[*_]{1,3}([^*_]+)[*_]{1,3}', r'\1', text)
    # 空白を除去してカウント
    text = re.sub(r'\s+', '', text)
    return len(text)


def estimate_reading_time(text: str, chars_per_minute: int = 400) -> int:
    """
    読了時間を推定（分単位）

    Args:
        text: 記事テキスト
        chars_per_minute: 1分あたりの読み文字数

    Returns:
        推定読了時間（分）
    """
    char_count = count_characters(text)
    minutes = char_count / chars_per_minute
    return max(1, round(minutes))


def extract_headings(markdown: str) -> list:
    """
    Markdownから見出しを抽出

    Args:
        markdown: Markdownテキスト

    Returns:
        見出しのリスト [{'level': 2, 'text': '見出し'}, ...]
    """
    import re
    headings = []
    pattern = r'^(#{1,6})\s+(.+)$'

    for match in re.finditer(pattern, markdown, re.MULTILINE):
        level = len(match.group(1))
        text = match.group(2).strip()
        headings.append({
            'level': level,
            'text': text
        })

    return headings


def validate_markdown_structure(markdown: str) -> Dict[str, Any]:
    """
    Markdown構造の検証

    Args:
        markdown: Markdownテキスト

    Returns:
        検証結果 {'valid': bool, 'issues': [...]}
    """
    issues = []
    headings = extract_headings(markdown)

    # H1チェック（使用禁止）
    h1_headings = [h for h in headings if h['level'] == 1]
    if h1_headings:
        issues.append('H1見出しは使用しないでください')

    # 見出し数チェック
    h2_headings = [h for h in headings if h['level'] == 2]
    if len(h2_headings) < 2:
        issues.append('H2見出しは最低2つ必要です')
    elif len(h2_headings) > 8:
        issues.append('H2見出しが多すぎます（8個以下推奨）')

    # 見出し階層チェック
    prev_level = 1
    for heading in headings:
        if heading['level'] > prev_level + 1:
            issues.append(f'見出し階層がスキップされています: {heading["text"]}')
        prev_level = heading['level']

    return {
        'valid': len(issues) == 0,
        'issues': issues,
        'headingCount': len(headings),
        'h2Count': len(h2_headings)
    }
