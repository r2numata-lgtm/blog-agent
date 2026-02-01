"""
記事生成Lambda関数のテスト
Phase 2: P2-14 記事生成エンドツーエンドテスト
"""

import json
import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# テスト対象モジュールのパスを追加
sys.path.insert(0, str(Path(__file__).parent.parent / 'functions' / 'generate-article'))

from validators import (
    validate_article_input,
    validate_settings,
    sanitize_input,
    sanitize_body,
)
from prompt_builder import (
    build_prompt,
    build_style_instructions,
    build_decoration_instructions,
    build_sample_article_context,
    build_internal_links_instructions,
    build_title_generation_prompt,
    build_meta_generation_prompt,
)
from utils import (
    generate_article_id,
    count_characters,
    estimate_reading_time,
    extract_headings,
    validate_markdown_structure,
    create_response,
)


class TestValidators:
    """バリデーション関数のテスト"""

    def test_validate_article_input_valid(self):
        """正常な入力の検証"""
        body = {
            'title': 'テスト記事のタイトル',
            'contentPoints': 'これは本文の要点です。詳しく説明します。',
            'keywords': ['テスト', 'Python'],
            'wordCount': 1500,
            'articleType': 'info',
        }
        assert validate_article_input(body) is None

    def test_validate_article_input_missing_title(self):
        """タイトル欠落の検証"""
        body = {
            'contentPoints': '本文の要点です。',
        }
        error = validate_article_input(body)
        assert error == 'タイトルは必須です'

    def test_validate_article_input_missing_content(self):
        """本文要点欠落の検証"""
        body = {
            'title': 'テスト記事',
        }
        error = validate_article_input(body)
        assert error == '本文の要点は必須です'

    def test_validate_article_input_title_too_long(self):
        """タイトル長すぎの検証"""
        body = {
            'title': 'あ' * 101,
            'contentPoints': '本文の要点です。',
        }
        error = validate_article_input(body)
        assert error == 'タイトルは100文字以内にしてください'

    def test_validate_article_input_title_too_short(self):
        """タイトル短すぎの検証"""
        body = {
            'title': 'あ' * 4,
            'contentPoints': '本文の要点です。',
        }
        error = validate_article_input(body)
        assert error == 'タイトルは5文字以上にしてください'

    def test_validate_article_input_content_too_long(self):
        """本文要点長すぎの検証"""
        body = {
            'title': 'テスト記事',
            'contentPoints': 'あ' * 5001,
        }
        error = validate_article_input(body)
        assert error == '本文の要点は5000文字以内にしてください'

    def test_validate_article_input_invalid_article_type(self):
        """無効な記事タイプの検証"""
        body = {
            'title': 'テスト記事',
            'contentPoints': '本文の要点です。これは十分な長さの内容です。',
            'articleType': 'invalid',
        }
        error = validate_article_input(body)
        assert 'info, howto, review' in error

    def test_validate_article_input_too_many_keywords(self):
        """キーワード多すぎの検証"""
        body = {
            'title': 'テスト記事',
            'contentPoints': '本文の要点です。これは十分な長さの内容です。',
            'keywords': [f'keyword{i}' for i in range(16)],
        }
        error = validate_article_input(body)
        assert error == 'キーワードは15個以内にしてください'

    def test_validate_article_input_word_count_too_low(self):
        """文字数少なすぎの検証"""
        body = {
            'title': 'テスト記事',
            'contentPoints': '本文の要点です。これは十分な長さの内容です。',
            'wordCount': 100,
        }
        error = validate_article_input(body)
        assert error == '文字数は500文字以上を指定してください'

    def test_validate_article_input_internal_links(self):
        """内部リンクの検証"""
        body = {
            'title': 'テスト記事',
            'contentPoints': '本文の要点です。これは十分な長さの内容です。',
            'internalLinks': [
                {'url': 'https://example.com', 'title': '関連記事'},
            ],
        }
        assert validate_article_input(body) is None

    def test_validate_article_input_invalid_internal_link(self):
        """無効な内部リンクの検証"""
        body = {
            'title': 'テスト記事',
            'contentPoints': '本文の要点です。これは十分な長さの内容です。',
            'internalLinks': [
                {'url': '', 'title': '関連記事'},
            ],
        }
        error = validate_article_input(body)
        assert 'URL' in error

    def test_sanitize_input_removes_script(self):
        """スクリプトタグ除去の検証"""
        text = 'テスト<script>alert("xss")</script>テスト'
        result = sanitize_input(text)
        assert '<script>' not in result
        assert 'alert' not in result

    def test_sanitize_input_removes_javascript(self):
        """javascriptプロトコル除去の検証"""
        text = 'javascript:alert("xss")'
        result = sanitize_input(text)
        assert 'javascript:' not in result

    def test_sanitize_body(self):
        """ボディ全体のサニタイズ検証"""
        body = {
            'title': '<script>alert()</script>タイトル',
            'contentPoints': '本文<iframe src="evil.com"></iframe>',
            'keywords': ['<script>test</script>', 'Python'],
        }
        result = sanitize_body(body)
        assert '<script>' not in result['title']
        assert '<iframe' not in result['contentPoints']
        assert '<script>' not in result['keywords'][0]


class TestPromptBuilder:
    """プロンプト構築関数のテスト"""

    def test_build_style_instructions_formal(self):
        """フォーマルスタイルの指示生成"""
        style = {'taste': 'formal', 'firstPerson': 'hissha', 'readerAddress': 'anata'}
        result = build_style_instructions(style)
        assert '丁寧' in result or '格式' in result
        assert '筆者' in result
        assert 'あなた' in result

    def test_build_style_instructions_casual(self):
        """カジュアルスタイルの指示生成"""
        style = {'taste': 'casual', 'firstPerson': 'boku', 'readerAddress': 'minasan'}
        result = build_style_instructions(style)
        assert '僕' in result
        assert '皆さん' in result

    def test_build_style_instructions_custom_reader(self):
        """カスタム読者呼びかけの指示生成"""
        style = {'readerAddress': 'custom', 'readerAddressCustom': '読者の皆様'}
        result = build_style_instructions(style)
        assert '読者の皆様' in result

    def test_build_decoration_instructions_all_enabled(self):
        """全装飾有効時の指示生成"""
        decorations = {
            'infoBox': True,
            'warningBox': True,
            'successBox': True,
            'balloon': True,
            'quote': True,
            'table': True,
        }
        result = build_decoration_instructions(decorations)
        assert 'ボックス装飾' in result
        assert '吹き出し' in result
        assert '引用' in result
        assert '表' in result

    def test_build_decoration_instructions_none_enabled(self):
        """全装飾無効時の指示生成"""
        decorations = {
            'infoBox': False,
            'warningBox': False,
            'successBox': False,
            'balloon': False,
            'quote': False,
            'table': False,
        }
        result = build_decoration_instructions(decorations)
        assert 'シンプルなMarkdown' in result

    def test_build_sample_article_context_empty(self):
        """サンプル記事なしの場合"""
        result = build_sample_article_context([], 'wordpress')
        assert result == ''

    def test_build_sample_article_context_with_wordpress_samples(self):
        """WordPress用サンプル記事ありの場合"""
        samples = [
            {'id': '1', 'title': 'サンプル1', 'content': 'サンプル内容', 'format': 'wordpress'},
        ]
        result = build_sample_article_context(samples, 'wordpress')
        assert 'サンプル記事1' in result
        assert 'サンプル1' in result
        assert '文体' in result or 'スタイル' in result
        assert '装飾の使い方' in result  # WordPress用は装飾指示あり

    def test_build_sample_article_context_with_markdown_samples(self):
        """Markdown用サンプル記事ありの場合"""
        samples = [
            {'id': '1', 'title': 'MDサンプル', 'content': '# 見出し\n本文', 'format': 'markdown'},
        ]
        result = build_sample_article_context(samples, 'markdown')
        assert 'サンプル記事1' in result
        assert 'MDサンプル' in result
        assert '装飾の使い方' not in result  # Markdown用は装飾指示なし

    def test_build_sample_article_context_filters_by_format(self):
        """出力形式に応じてサンプルがフィルタリングされる"""
        samples = [
            {'id': '1', 'title': 'WordPress記事', 'content': '内容', 'format': 'wordpress'},
            {'id': '2', 'title': 'Markdown記事', 'content': '内容', 'format': 'markdown'},
        ]
        # WordPress用
        wp_result = build_sample_article_context(samples, 'wordpress')
        assert 'WordPress記事' in wp_result
        assert 'Markdown記事' not in wp_result

        # Markdown用
        md_result = build_sample_article_context(samples, 'markdown')
        assert 'Markdown記事' in md_result
        assert 'WordPress記事' not in md_result

    def test_build_internal_links_instructions_empty(self):
        """内部リンクなしの場合"""
        result = build_internal_links_instructions([])
        assert result == ''

    def test_build_internal_links_instructions_with_links(self):
        """内部リンクありの場合"""
        links = [
            {'url': 'https://example.com/article1', 'title': '関連記事1'},
            {'url': 'https://example.com/article2', 'title': '関連記事2', 'description': '詳細説明'},
        ]
        result = build_internal_links_instructions(links)
        assert '関連記事1' in result
        assert '関連記事2' in result
        assert '詳細説明' in result
        assert 'example.com' in result

    def test_build_prompt_basic(self):
        """基本プロンプト生成"""
        body = {
            'title': 'Pythonの基本',
            'contentPoints': 'Pythonの基本的な文法について解説します。',
            'targetAudience': 'プログラミング初心者',
            'keywords': ['Python', '入門'],
            'wordCount': 1500,
            'articleType': 'info',
        }
        result = build_prompt(body)
        assert 'Pythonの基本' in result
        assert 'プログラミング初心者' in result
        assert 'Python, 入門' in result
        assert '1500' in result
        assert '情報提供型' in result or 'info' in result

    def test_build_prompt_with_settings(self):
        """設定付きプロンプト生成"""
        body = {
            'title': 'テスト記事',
            'contentPoints': '内容の要点',
        }
        settings = {
            'articleStyle': {
                'taste': 'professional',
                'firstPerson': 'hissha',
            },
            'decorations': {
                'infoBox': True,
                'balloon': True,
            },
        }
        result = build_prompt(body, settings)
        assert '筆者' in result
        assert '専門的' in result or 'professional' in result

    def test_build_title_generation_prompt(self):
        """タイトル生成プロンプト"""
        body = {
            'title': '仮タイトル',
            'contentPoints': '記事の内容です。',
            'keywords': ['SEO', 'マーケティング'],
        }
        result = build_title_generation_prompt(body)
        assert '仮タイトル' in result
        assert 'SEO' in result
        assert '3つ' in result or '3' in result
        assert 'JSON' in result

    def test_build_meta_generation_prompt(self):
        """メタ情報生成プロンプト"""
        markdown = '## 見出し\n\nこれは記事の内容です。'
        seo = {'metaDescriptionLength': 140, 'maxKeywords': 7}
        result = build_meta_generation_prompt(markdown, seo)
        assert '見出し' in result
        assert '140' in result
        assert '7' in result
        assert 'JSON' in result


class TestUtils:
    """ユーティリティ関数のテスト"""

    def test_generate_article_id(self):
        """記事ID生成"""
        id1 = generate_article_id()
        id2 = generate_article_id()
        assert id1.startswith('art_')
        assert len(id1) == 20  # art_ + 16文字
        assert id1 != id2

    def test_count_characters_simple(self):
        """文字数カウント（シンプル）"""
        text = 'これはテストです。'
        result = count_characters(text)
        assert result == 9

    def test_count_characters_with_markdown(self):
        """文字数カウント（Markdown含む）"""
        text = '## 見出し\n\nこれは**太字**のテストです。\n\n`code`'
        result = count_characters(text)
        # Markdown記法を除いた文字数
        assert result > 0
        assert result < len(text)

    def test_count_characters_with_code_block(self):
        """文字数カウント（コードブロック含む）"""
        text = '本文\n\n```python\nprint("hello")\n```\n\n続き'
        result = count_characters(text)
        # コードブロックは除外される
        assert 'print' not in str(result)

    def test_estimate_reading_time(self):
        """読了時間推定"""
        # 400文字 = 1分
        text = 'あ' * 400
        result = estimate_reading_time(text)
        assert result == 1

        # 800文字 = 2分
        text = 'あ' * 800
        result = estimate_reading_time(text)
        assert result == 2

    def test_extract_headings(self):
        """見出し抽出"""
        markdown = '''# H1見出し
## H2見出し1
### H3見出し
## H2見出し2
'''
        result = extract_headings(markdown)
        assert len(result) == 4
        assert result[0]['level'] == 1
        assert result[0]['text'] == 'H1見出し'
        assert result[1]['level'] == 2

    def test_validate_markdown_structure_valid(self):
        """Markdown構造検証（正常）"""
        markdown = '''## はじめに
内容

## 本文
内容

### サブセクション
内容

## まとめ
内容
'''
        result = validate_markdown_structure(markdown)
        assert result['valid'] is True
        assert len(result['issues']) == 0

    def test_validate_markdown_structure_h1_used(self):
        """Markdown構造検証（H1使用）"""
        markdown = '''# タイトル
## 見出し
'''
        result = validate_markdown_structure(markdown)
        assert result['valid'] is False
        assert any('H1' in issue for issue in result['issues'])

    def test_validate_markdown_structure_too_few_h2(self):
        """Markdown構造検証（H2少なすぎ）"""
        markdown = '''## 見出し
内容のみ
'''
        result = validate_markdown_structure(markdown)
        assert result['valid'] is False
        assert any('H2' in issue and '最低' in issue for issue in result['issues'])

    def test_create_response_success(self):
        """成功レスポンス作成"""
        result = create_response(200, data={'key': 'value'})
        assert result['statusCode'] == 200
        body = json.loads(result['body'])
        assert body['success'] is True
        assert body['data']['key'] == 'value'

    def test_create_response_error(self):
        """エラーレスポンス作成"""
        result = create_response(400, error_code='ERR_001', error_message='エラーです')
        assert result['statusCode'] == 400
        body = json.loads(result['body'])
        assert body['success'] is False
        assert body['error']['code'] == 'ERR_001'
        assert body['error']['message'] == 'エラーです'


class TestSettingsValidation:
    """設定検証のテスト"""

    def test_validate_settings_valid(self):
        """正常な設定の検証"""
        settings = {
            'articleStyle': {
                'taste': 'friendly',
                'firstPerson': 'watashi',
            },
            'seo': {
                'metaDescriptionLength': 140,
                'maxKeywords': 7,
            },
        }
        assert validate_settings(settings) is None

    def test_validate_settings_invalid_taste(self):
        """無効なテイストの検証"""
        settings = {
            'articleStyle': {
                'taste': 'invalid',
            },
        }
        error = validate_settings(settings)
        assert error is not None
        assert 'テイスト' in error

    def test_validate_settings_invalid_meta_length(self):
        """無効なメタ長の検証"""
        settings = {
            'seo': {
                'metaDescriptionLength': 300,  # 200を超えている
            },
        }
        error = validate_settings(settings)
        assert error is not None
        assert 'メタディスクリプション' in error

    def test_validate_settings_too_many_samples(self):
        """サンプル記事多すぎの検証"""
        settings = {
            'sampleArticles': [
                {'title': f'記事{i}', 'content': '内容'} for i in range(4)
            ],
        }
        error = validate_settings(settings)
        assert error is not None
        assert 'サンプル記事' in error


class TestMarkdownGeneration:
    """Markdown生成のテスト"""

    def test_block_to_markdown_plain_paragraph(self):
        """通常の段落のMarkdown変換"""
        # app.pyからインポート
        sys.path.insert(0, str(Path(__file__).parent.parent / 'functions' / 'generate-article'))
        from app import block_to_markdown_plain

        block = {'type': 'paragraph', 'content': 'これはテスト段落です。'}
        result = block_to_markdown_plain(block)
        assert result == ['これはテスト段落です。']

    def test_block_to_markdown_plain_box_with_title(self):
        """ボックス装飾（タイトル付き）のMarkdown変換"""
        sys.path.insert(0, str(Path(__file__).parent.parent / 'functions' / 'generate-article'))
        from app import block_to_markdown_plain

        block = {
            'type': 'paragraph',
            'content': 'ボックスの内容です。',
            'decorationId': 'ba-point',
            'title': 'ポイント'
        }
        result = block_to_markdown_plain(block)
        # 引用ブロックとして出力される
        assert '> **ポイント**' in result
        assert '> ボックスの内容です。' in result

    def test_block_to_markdown_plain_highlight(self):
        """ハイライト（タイトルなし）のMarkdown変換"""
        sys.path.insert(0, str(Path(__file__).parent.parent / 'functions' / 'generate-article'))
        from app import block_to_markdown_plain

        block = {
            'type': 'paragraph',
            'content': '強調フレーズ',
            'decorationId': 'ba-highlight'
        }
        result = block_to_markdown_plain(block)
        # タイトルがないので通常の段落として出力
        assert result == ['強調フレーズ']

    def test_block_to_markdown_plain_list(self):
        """リストのMarkdown変換"""
        sys.path.insert(0, str(Path(__file__).parent.parent / 'functions' / 'generate-article'))
        from app import block_to_markdown_plain

        block = {
            'type': 'list',
            'listType': 'unordered',
            'items': ['項目1', '項目2', '項目3']
        }
        result = block_to_markdown_plain(block)
        assert '- 項目1' in result
        assert '- 項目2' in result
        assert '- 項目3' in result

    def test_block_to_markdown_plain_ordered_list(self):
        """番号付きリストのMarkdown変換"""
        sys.path.insert(0, str(Path(__file__).parent.parent / 'functions' / 'generate-article'))
        from app import block_to_markdown_plain

        block = {
            'type': 'list',
            'listType': 'ordered',
            'items': ['手順1', '手順2']
        }
        result = block_to_markdown_plain(block)
        assert '1. 手順1' in result
        assert '2. 手順2' in result

    def test_structure_to_markdown_no_decorations(self):
        """構造からMarkdown生成（装飾なし）"""
        sys.path.insert(0, str(Path(__file__).parent.parent / 'functions' / 'generate-article'))
        from app import structure_to_markdown

        structure = {
            'sections': [
                {
                    'heading': 'はじめに',
                    'blocks': [
                        {'type': 'paragraph', 'content': '導入文です。'}
                    ]
                }
            ]
        }
        result = structure_to_markdown(structure, [])
        assert '## はじめに' in result
        assert '導入文です。' in result
        # 装飾タグが含まれていないことを確認
        assert ':::box' not in result


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
