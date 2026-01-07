"""
入力検証モジュール
"""

from typing import Optional, Dict, Any, List


def validate_article_input(body: Dict[str, Any]) -> Optional[str]:
    """
    記事生成リクエストの入力検証

    Args:
        body: リクエストボディ

    Returns:
        エラーメッセージ（検証成功時はNone）
    """
    # 必須フィールド
    if not body.get('title'):
        return 'タイトルは必須です'

    if not body.get('contentPoints'):
        return '本文の要点は必須です'

    # タイトルの文字数制限
    title = body['title']
    if len(title) > 100:
        return 'タイトルは100文字以内にしてください'

    if len(title) < 5:
        return 'タイトルは5文字以上にしてください'

    # 本文要点の文字数制限
    content_points = body.get('contentPoints', '')
    if len(content_points) > 5000:
        return '本文の要点は5000文字以内にしてください'

    if len(content_points) < 10:
        return '本文の要点は10文字以上にしてください'

    # キーワード数制限
    keywords = body.get('keywords', [])
    if not isinstance(keywords, list):
        return 'キーワードはリスト形式で指定してください'

    if len(keywords) > 15:
        return 'キーワードは15個以内にしてください'

    for keyword in keywords:
        if not isinstance(keyword, str):
            return 'キーワードは文字列で指定してください'
        if len(keyword) > 50:
            return 'キーワードは50文字以内にしてください'

    # 文字数制限
    word_count = body.get('wordCount', 1500)
    if not isinstance(word_count, int):
        return '文字数は数値で指定してください'

    if word_count < 500:
        return '文字数は500文字以上を指定してください'

    if word_count > 10000:
        return '文字数は10000文字以下を指定してください'

    # 記事タイプ検証
    article_type = body.get('articleType', 'info')
    valid_types = ['info', 'howto', 'review']
    if article_type not in valid_types:
        return f'記事タイプは {", ".join(valid_types)} のいずれかを指定してください'

    # 対象読者
    target_audience = body.get('targetAudience', '')
    if target_audience and len(target_audience) > 100:
        return '対象読者は100文字以内にしてください'

    # 目的
    purpose = body.get('purpose', '')
    if purpose and len(purpose) > 200:
        return '目的は200文字以内にしてください'

    # 内部リンク検証
    internal_links = body.get('internalLinks', [])
    if not isinstance(internal_links, list):
        return '内部リンクはリスト形式で指定してください'

    if len(internal_links) > 10:
        return '内部リンクは10個以内にしてください'

    for i, link in enumerate(internal_links):
        if not isinstance(link, dict):
            return f'内部リンク{i+1}は辞書形式で指定してください'

        if not link.get('url'):
            return f'内部リンク{i+1}のURLは必須です'

        if not link.get('title'):
            return f'内部リンク{i+1}のタイトルは必須です'

        url = link['url']
        if len(url) > 500:
            return f'内部リンク{i+1}のURLは500文字以内にしてください'

        if not url.startswith(('http://', 'https://', '/')):
            return f'内部リンク{i+1}のURLは正しい形式で指定してください'

    return None


def validate_settings(settings: Dict[str, Any]) -> Optional[str]:
    """
    ユーザー設定の検証

    Args:
        settings: ユーザー設定

    Returns:
        エラーメッセージ（検証成功時はNone）
    """
    # articleStyle検証
    article_style = settings.get('articleStyle', {})
    if article_style:
        valid_tastes = ['formal', 'casual', 'friendly', 'professional']
        if article_style.get('taste') and article_style['taste'] not in valid_tastes:
            return f'テイストは {", ".join(valid_tastes)} のいずれかを指定してください'

        valid_first_persons = ['watashi', 'boku', 'hissha']
        if article_style.get('firstPerson') and article_style['firstPerson'] not in valid_first_persons:
            return f'一人称は {", ".join(valid_first_persons)} のいずれかを指定してください'

        valid_reader_addresses = ['anata', 'minasan', 'custom']
        if article_style.get('readerAddress') and article_style['readerAddress'] not in valid_reader_addresses:
            return f'読者への呼びかけは {", ".join(valid_reader_addresses)} のいずれかを指定してください'

        valid_tones = ['explanatory', 'story', 'qa']
        if article_style.get('tone') and article_style['tone'] not in valid_tones:
            return f'トーンは {", ".join(valid_tones)} のいずれかを指定してください'

        valid_intro_styles = ['problem', 'empathy', 'question']
        if article_style.get('introStyle') and article_style['introStyle'] not in valid_intro_styles:
            return f'導入スタイルは {", ".join(valid_intro_styles)} のいずれかを指定してください'

    # SEO設定検証
    seo = settings.get('seo', {})
    if seo:
        meta_length = seo.get('metaDescriptionLength')
        if meta_length is not None:
            if not isinstance(meta_length, int) or meta_length < 50 or meta_length > 200:
                return 'メタディスクリプション長は50〜200の整数で指定してください'

        max_keywords = seo.get('maxKeywords')
        if max_keywords is not None:
            if not isinstance(max_keywords, int) or max_keywords < 1 or max_keywords > 20:
                return 'キーワード上限数は1〜20の整数で指定してください'

    # サンプル記事検証
    sample_articles = settings.get('sampleArticles', [])
    if sample_articles:
        if len(sample_articles) > 3:
            return 'サンプル記事は3件以内にしてください'

        for i, article in enumerate(sample_articles):
            if not article.get('title'):
                return f'サンプル記事{i+1}のタイトルは必須です'

            if not article.get('content'):
                return f'サンプル記事{i+1}の内容は必須です'

            if len(article['content']) > 100000:
                return f'サンプル記事{i+1}の内容は100KB以内にしてください'

    return None


def sanitize_input(text: str) -> str:
    """
    入力テキストのサニタイズ

    Args:
        text: 入力テキスト

    Returns:
        サニタイズされたテキスト
    """
    if not text:
        return ''

    # HTMLタグを除去（基本的なもの）
    import re
    text = re.sub(r'<script.*?>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<iframe.*?>.*?</iframe>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<style.*?>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'javascript:', '', text, flags=re.IGNORECASE)
    text = re.sub(r'on\w+\s*=', '', text, flags=re.IGNORECASE)

    return text.strip()


def sanitize_body(body: Dict[str, Any]) -> Dict[str, Any]:
    """
    リクエストボディ全体をサニタイズ

    Args:
        body: リクエストボディ

    Returns:
        サニタイズされたボディ
    """
    sanitized = body.copy()

    # 文字列フィールドをサニタイズ
    string_fields = ['title', 'contentPoints', 'targetAudience', 'purpose']
    for field in string_fields:
        if field in sanitized and isinstance(sanitized[field], str):
            sanitized[field] = sanitize_input(sanitized[field])

    # キーワードリストをサニタイズ
    if 'keywords' in sanitized and isinstance(sanitized['keywords'], list):
        sanitized['keywords'] = [
            sanitize_input(k) for k in sanitized['keywords']
            if isinstance(k, str)
        ]

    # 内部リンクをサニタイズ
    if 'internalLinks' in sanitized and isinstance(sanitized['internalLinks'], list):
        sanitized_links = []
        for link in sanitized['internalLinks']:
            if isinstance(link, dict):
                sanitized_link = {
                    'url': sanitize_input(link.get('url', '')),
                    'title': sanitize_input(link.get('title', '')),
                }
                if link.get('description'):
                    sanitized_link['description'] = sanitize_input(link['description'])
                sanitized_links.append(sanitized_link)
        sanitized['internalLinks'] = sanitized_links

    return sanitized
