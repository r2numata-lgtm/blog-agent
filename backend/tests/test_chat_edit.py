"""
チャット修正機能のテスト
Phase 3: チャット修正の実装
"""

import pytest
import json
import sys
import os

# パスを追加
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'functions', 'chat-edit'))

from diff_utils import (
    split_markdown_sections,
    find_section_by_heading,
    calculate_line_diff,
    merge_consecutive_diffs,
    apply_section_replacement,
    apply_text_replacement,
    detect_edit_intent,
    create_revision_record,
    DiffType
)
from prompt_builder import (
    build_chat_edit_system_prompt,
    build_chat_edit_prompt,
    build_section_edit_prompt,
    build_follow_up_prompt
)
from validators import (
    validate_chat_edit_input,
    validate_conversation_input,
    validate_revision_input,
    sanitize_instruction,
    sanitize_markdown,
    validate_ai_response,
    validate_article_id,
    validate_conversation_id,
    validate_revision_id
)
from utils import (
    generate_conversation_id,
    generate_message_id,
    generate_revision_id,
    format_conversation_history,
    truncate_text
)


class TestDiffUtils:
    """差分ユーティリティのテスト"""

    def test_split_markdown_sections(self):
        """Markdownをセクションに分割"""
        markdown = """# タイトル
導入部分

## セクション1
セクション1の内容

## セクション2
セクション2の内容

### サブセクション
サブセクションの内容
"""
        sections = split_markdown_sections(markdown)

        assert len(sections) >= 3
        assert any(s.get('heading_text') == 'セクション1' for s in sections)
        assert any(s.get('heading_text') == 'セクション2' for s in sections)

    def test_find_section_by_heading(self):
        """見出しでセクションを検索"""
        sections = [
            {'heading': '## はじめに', 'heading_text': 'はじめに', 'content': '導入'},
            {'heading': '## 本文', 'heading_text': '本文', 'content': '内容'},
            {'heading': '## まとめ', 'heading_text': 'まとめ', 'content': '結論'},
        ]

        result = find_section_by_heading(sections, '本文')
        assert result is not None
        assert result['heading_text'] == '本文'

        result = find_section_by_heading(sections, '存在しない')
        assert result is None

    def test_calculate_line_diff(self):
        """行単位の差分計算"""
        old_text = "行1\n行2\n行3"
        new_text = "行1\n変更された行2\n行3"

        diffs = calculate_line_diff(old_text, new_text)

        assert len(diffs) > 0
        # 置換が検出されていること
        replace_diffs = [d for d in diffs if d['type'] == DiffType.REPLACE]
        assert len(replace_diffs) >= 1

    def test_merge_consecutive_diffs(self):
        """連続する差分をマージ"""
        diffs = [
            {'type': DiffType.DELETE, 'old_line': 1, 'old_text': '削除1'},
            {'type': DiffType.DELETE, 'old_line': 2, 'old_text': '削除2'},
            {'type': DiffType.INSERT, 'new_line': 1, 'new_text': '追加1'},
            {'type': DiffType.INSERT, 'new_line': 2, 'new_text': '追加2'},
        ]

        merged = merge_consecutive_diffs(diffs)

        # マージされて1つの置換になること
        assert len(merged) == 1
        assert merged[0]['type'] == DiffType.REPLACE

    def test_apply_section_replacement(self):
        """セクション置換"""
        original = """## はじめに
古い内容

## 本文
変更対象

## まとめ
結論
"""
        new_content, info = apply_section_replacement(
            original,
            '本文',
            '新しい内容\nここが変更されました'
        )

        assert info['success'] is True
        assert '新しい内容' in new_content
        assert '変更対象' not in new_content
        assert 'はじめに' in new_content
        assert 'まとめ' in new_content

    def test_apply_text_replacement(self):
        """テキスト置換"""
        original = "これは古いテキストです。古いテキストは2回出現します。"

        new_text, info = apply_text_replacement(
            original,
            '古いテキスト',
            '新しいテキスト',
            occurrence=1
        )

        assert info['success'] is True
        assert '新しいテキスト' in new_text
        # 1回目のみ置換されること
        assert new_text.count('新しいテキスト') == 1
        assert new_text.count('古いテキスト') == 1

    def test_detect_edit_intent_section(self):
        """セクション編集の意図を検出"""
        instruction = "「はじめに」セクションを修正してください"
        content = "## はじめに\n内容"

        intent = detect_edit_intent(instruction, content)
        assert intent['type'] == 'section_edit'

    def test_detect_edit_intent_replace(self):
        """テキスト置換の意図を検出"""
        instruction = "「古い表現」を「新しい表現」に変更してください"
        content = "これは古い表現です"

        intent = detect_edit_intent(instruction, content)
        assert intent['type'] == 'text_replace'

    def test_detect_edit_intent_append(self):
        """追加の意図を検出"""
        instruction = "最後に結論を追加してください"
        content = "本文"

        intent = detect_edit_intent(instruction, content)
        assert intent['type'] == 'append'

    def test_create_revision_record(self):
        """リビジョンレコード作成"""
        original = "古い内容"
        new = "新しい内容"
        instruction = "内容を更新"

        record = create_revision_record(
            original, new, instruction, {'type': 'edit'}
        )

        assert record['instruction'] == instruction
        assert record['edit_type'] == 'edit'
        assert 'diffs' in record
        assert record['original_length'] == len(original)
        assert record['new_length'] == len(new)


class TestPromptBuilder:
    """プロンプトビルダーのテスト"""

    def test_build_chat_edit_system_prompt(self):
        """システムプロンプト構築"""
        prompt = build_chat_edit_system_prompt()

        assert 'ブログ記事' in prompt
        assert '編集アシスタント' in prompt
        assert 'JSON' in prompt

    def test_build_chat_edit_prompt(self):
        """チャット編集プロンプト構築"""
        instruction = "もっと詳しく書いて"
        current_article = "## はじめに\n簡単な説明"

        prompt = build_chat_edit_prompt(instruction, current_article)

        assert instruction in prompt
        assert current_article in prompt
        assert 'markdown' in prompt.lower()

    def test_build_chat_edit_prompt_with_selection(self):
        """選択テキスト付きプロンプト"""
        instruction = "この部分を改善して"
        current_article = "## はじめに\n詳細な説明"
        edit_context = {
            'selected_text': '詳細な説明',
            'selection_context': 'はじめにセクション'
        }

        prompt = build_chat_edit_prompt(
            instruction, current_article,
            edit_context=edit_context
        )

        assert '選択されたテキスト' in prompt
        assert '詳細な説明' in prompt

    def test_build_section_edit_prompt(self):
        """セクション編集プロンプト"""
        prompt = build_section_edit_prompt(
            instruction="内容を充実させて",
            section_heading="## 本文",
            section_content="簡単な内容",
            full_article="## はじめに\n導入\n## 本文\n簡単な内容\n## まとめ\n結論"
        )

        assert '## 本文' in prompt
        assert '簡単な内容' in prompt
        assert 'replace_section' in prompt

    def test_build_follow_up_prompt(self):
        """フォローアップ編集プロンプト"""
        previous_changes = [
            {'explanation': '導入部分を追加'},
            {'explanation': 'タイトルを変更'},
        ]

        prompt = build_follow_up_prompt(
            instruction="さらに詳しく",
            current_article="## 記事",
            previous_changes=previous_changes
        )

        assert '直近の変更履歴' in prompt
        assert '導入部分を追加' in prompt


class TestValidators:
    """バリデーターのテスト"""

    def test_validate_chat_edit_input_valid(self):
        """有効な入力"""
        body = {
            'instruction': '導入部分を改善してください',
            'articleId': 'art_1234567890abcdef',
        }

        error = validate_chat_edit_input(body)
        assert error is None

    def test_validate_chat_edit_input_missing_instruction(self):
        """指示なし"""
        body = {
            'articleId': 'art_1234567890abcdef',
        }

        error = validate_chat_edit_input(body)
        assert error is not None
        assert '必須' in error

    def test_validate_chat_edit_input_short_instruction(self):
        """短すぎる指示"""
        body = {
            'instruction': '修正',
            'articleId': 'art_1234567890abcdef',
        }

        error = validate_chat_edit_input(body)
        assert error is not None
        assert '短すぎ' in error

    def test_validate_conversation_input_valid(self):
        """有効な会話入力"""
        body = {
            'articleId': 'art_1234567890abcdef',
        }

        error = validate_conversation_input(body)
        assert error is None

    def test_validate_conversation_input_invalid_id(self):
        """無効な記事ID"""
        body = {
            'articleId': 'invalid_id',
        }

        error = validate_conversation_input(body)
        assert error is not None

    def test_validate_revision_input_valid(self):
        """有効なリビジョン入力"""
        body = {
            'articleId': 'art_1234567890abcdef',
            'action': 'revert',
            'revisionId': 'rev_abc123456789'
        }

        error = validate_revision_input(body)
        assert error is None

    def test_sanitize_instruction(self):
        """指示のサニタイズ"""
        dirty = "  修正してください\x00\x01  \n\n\n\nたくさん改行  "
        clean = sanitize_instruction(dirty)

        assert '\x00' not in clean
        assert clean.startswith('修正')
        # 連続改行が正規化されていること
        assert '\n\n\n\n' not in clean

    def test_sanitize_markdown(self):
        """Markdownのサニタイズ"""
        dirty = """# 見出し
<script>alert('xss')</script>
本文
<iframe src="evil.com"></iframe>
<a onclick="evil()">リンク</a>
"""
        clean = sanitize_markdown(dirty)

        assert '<script>' not in clean
        assert '<iframe' not in clean
        assert 'onclick' not in clean
        assert '# 見出し' in clean
        assert '本文' in clean

    def test_validate_ai_response_valid(self):
        """有効なAI応答"""
        response = {
            'action': 'edit',
            'modified': '修正された内容',
            'explanation': '内容を改善しました'
        }

        error = validate_ai_response(response)
        assert error is None

    def test_validate_ai_response_invalid_action(self):
        """無効なアクション"""
        response = {
            'action': 'invalid_action',
            'modified': '内容',
            'explanation': '説明'
        }

        error = validate_ai_response(response)
        assert error is not None

    def test_validate_ai_response_no_change(self):
        """変更なしの場合はmodified不要"""
        response = {
            'action': 'no_change',
            'explanation': '変更の必要がありません'
        }

        error = validate_ai_response(response)
        assert error is None

    def test_validate_article_id(self):
        """記事ID検証"""
        assert validate_article_id('art_1234567890abcdef') is True
        assert validate_article_id('art_abc123') is False
        assert validate_article_id('invalid') is False

    def test_validate_conversation_id(self):
        """会話ID検証"""
        assert validate_conversation_id('conv_1234567890abcdef') is True
        assert validate_conversation_id('conv_abc') is False

    def test_validate_revision_id(self):
        """リビジョンID検証"""
        assert validate_revision_id('rev_123456789abc') is True
        assert validate_revision_id('rev_abc') is False


class TestUtils:
    """ユーティリティのテスト"""

    def test_generate_conversation_id(self):
        """会話ID生成"""
        conv_id = generate_conversation_id()

        assert conv_id.startswith('conv_')
        assert len(conv_id) == 21  # conv_ + 16文字

    def test_generate_message_id(self):
        """メッセージID生成"""
        msg_id = generate_message_id()

        assert msg_id.startswith('msg_')
        assert len(msg_id) == 16  # msg_ + 12文字

    def test_generate_revision_id(self):
        """リビジョンID生成"""
        rev_id = generate_revision_id()

        assert rev_id.startswith('rev_')
        assert len(rev_id) == 16  # rev_ + 12文字

    def test_format_conversation_history(self):
        """会話履歴のフォーマット"""
        messages = [
            {'role': 'user', 'content': 'こんにちは'},
            {'role': 'assistant', 'content': 'こんにちは！'},
        ]

        formatted = format_conversation_history(messages)

        assert len(formatted) == 2
        assert formatted[0]['role'] == 'user'
        assert formatted[1]['role'] == 'assistant'

    def test_truncate_text(self):
        """テキスト切り詰め"""
        long_text = "あ" * 1000
        short_text = "短いテキスト"

        truncated = truncate_text(long_text, 100)
        assert len(truncated) == 100
        assert truncated.endswith('...')

        not_truncated = truncate_text(short_text, 100)
        assert not_truncated == short_text


class TestIntegration:
    """統合テスト"""

    def test_full_edit_flow(self):
        """編集フロー全体のテスト"""
        # 元の記事
        original_article = """## はじめに
これは導入部分です。

## 本文
メインの内容がここに書かれています。

## まとめ
結論を述べます。
"""
        # 編集指示
        instruction = "「本文」セクションをもっと詳しく書いてください"

        # 1. 入力検証
        body = {
            'instruction': instruction,
            'currentContent': original_article,
        }
        error = validate_chat_edit_input(body)
        assert error is None

        # 2. 編集意図検出
        intent = detect_edit_intent(instruction, original_article)
        assert intent['type'] == 'section_edit'

        # 3. セクション検索
        sections = split_markdown_sections(original_article)
        target = find_section_by_heading(sections, '本文')
        assert target is not None

        # 4. プロンプト構築
        prompt = build_section_edit_prompt(
            instruction=instruction,
            section_heading=target['heading'],
            section_content=target['content'],
            full_article=original_article
        )
        assert instruction in prompt
        assert 'メインの内容' in prompt

        # 5. AI応答のシミュレーション（実際はClaude APIを呼び出す）
        ai_response = {
            'action': 'replace_section',
            'target': '本文',
            'original': 'メインの内容がここに書かれています。',
            'modified': 'メインの内容がここに書かれています。\n\nさらに詳しい説明を追加しました。具体的な例も含めています。',
            'explanation': '本文セクションに詳細な説明を追加しました'
        }

        # 6. AI応答検証
        response_error = validate_ai_response(ai_response)
        assert response_error is None

        # 7. 変更適用
        new_article, apply_info = apply_section_replacement(
            original_article,
            ai_response['target'],
            ai_response['modified']
        )
        assert apply_info['success'] is True
        assert 'さらに詳しい説明' in new_article

        # 8. リビジョンレコード作成
        revision = create_revision_record(
            original_article,
            new_article,
            instruction,
            {'type': ai_response['action']}
        )
        assert revision['edit_type'] == 'replace_section'
        assert revision['length_change'] > 0


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
