"""
差分検出・適用ロジック
Phase 3: チャット修正の実装
"""

import difflib
import re
from typing import Any, Dict, List, Optional, Tuple


class DiffType:
    """差分タイプの定数"""
    INSERT = 'insert'
    DELETE = 'delete'
    REPLACE = 'replace'
    EQUAL = 'equal'


def split_markdown_sections(markdown: str) -> List[Dict[str, Any]]:
    """
    Markdownを見出しでセクションに分割

    Args:
        markdown: Markdownテキスト

    Returns:
        セクションのリスト
        [{'heading': '## 見出し', 'level': 2, 'content': '本文...', 'start_line': 5}, ...]
    """
    lines = markdown.split('\n')
    sections = []
    current_section = {
        'heading': '',
        'level': 0,
        'content': '',
        'start_line': 0,
        'lines': []
    }

    heading_pattern = re.compile(r'^(#{1,6})\s+(.+)$')

    for i, line in enumerate(lines):
        match = heading_pattern.match(line)
        if match:
            # 前のセクションを保存
            if current_section['lines'] or current_section['heading']:
                current_section['content'] = '\n'.join(current_section['lines'])
                sections.append(current_section)

            # 新しいセクションを開始
            current_section = {
                'heading': line,
                'heading_text': match.group(2),
                'level': len(match.group(1)),
                'content': '',
                'start_line': i,
                'lines': []
            }
        else:
            current_section['lines'].append(line)

    # 最後のセクションを保存
    if current_section['lines'] or current_section['heading']:
        current_section['content'] = '\n'.join(current_section['lines'])
        sections.append(current_section)

    return sections


def find_section_by_heading(sections: List[Dict[str, Any]], heading_text: str) -> Optional[Dict[str, Any]]:
    """
    見出しテキストでセクションを検索

    Args:
        sections: セクションのリスト
        heading_text: 検索する見出しテキスト

    Returns:
        見つかったセクション、またはNone
    """
    heading_text_normalized = heading_text.strip().lower()
    for section in sections:
        section_heading = section.get('heading_text', '').strip().lower()
        if section_heading == heading_text_normalized:
            return section
        # 部分一致も許容
        if heading_text_normalized in section_heading or section_heading in heading_text_normalized:
            return section
    return None


def calculate_line_diff(old_text: str, new_text: str) -> List[Dict[str, Any]]:
    """
    行単位の差分を計算

    Args:
        old_text: 変更前のテキスト
        new_text: 変更後のテキスト

    Returns:
        差分のリスト
        [{'type': 'replace', 'old_line': 5, 'new_line': 5, 'old_text': '...', 'new_text': '...'}, ...]
    """
    old_lines = old_text.split('\n')
    new_lines = new_text.split('\n')

    differ = difflib.unified_diff(old_lines, new_lines, lineterm='')
    diffs = []

    old_line_num = 0
    new_line_num = 0

    for line in differ:
        if line.startswith('@@'):
            # ハンク情報をパース
            match = re.match(r'^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@', line)
            if match:
                old_line_num = int(match.group(1)) - 1
                new_line_num = int(match.group(2)) - 1
        elif line.startswith('-') and not line.startswith('---'):
            diffs.append({
                'type': DiffType.DELETE,
                'old_line': old_line_num,
                'old_text': line[1:]
            })
            old_line_num += 1
        elif line.startswith('+') and not line.startswith('+++'):
            diffs.append({
                'type': DiffType.INSERT,
                'new_line': new_line_num,
                'new_text': line[1:]
            })
            new_line_num += 1
        elif line.startswith(' '):
            old_line_num += 1
            new_line_num += 1

    # 連続する削除と挿入を置換としてまとめる
    merged_diffs = merge_consecutive_diffs(diffs)

    return merged_diffs


def merge_consecutive_diffs(diffs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    連続する削除と挿入を置換にまとめる

    Args:
        diffs: 差分リスト

    Returns:
        最適化された差分リスト
    """
    if not diffs:
        return []

    merged = []
    i = 0

    while i < len(diffs):
        current = diffs[i]

        # 削除の後に挿入が続く場合は置換としてまとめる
        if current['type'] == DiffType.DELETE:
            deletes = [current]
            j = i + 1

            # 連続する削除を収集
            while j < len(diffs) and diffs[j]['type'] == DiffType.DELETE:
                deletes.append(diffs[j])
                j += 1

            # その後の挿入を収集
            inserts = []
            while j < len(diffs) and diffs[j]['type'] == DiffType.INSERT:
                inserts.append(diffs[j])
                j += 1

            if inserts:
                # 置換としてまとめる
                merged.append({
                    'type': DiffType.REPLACE,
                    'old_line': deletes[0].get('old_line'),
                    'new_line': inserts[0].get('new_line'),
                    'old_text': '\n'.join(d['old_text'] for d in deletes),
                    'new_text': '\n'.join(d['new_text'] for d in inserts),
                    'old_line_count': len(deletes),
                    'new_line_count': len(inserts)
                })
            else:
                # 削除のみ
                for d in deletes:
                    merged.append(d)

            i = j
        else:
            merged.append(current)
            i += 1

    return merged


def apply_section_replacement(
    original_markdown: str,
    section_heading: str,
    new_content: str
) -> Tuple[str, Dict[str, Any]]:
    """
    特定セクションの内容を置換

    Args:
        original_markdown: 元のMarkdown
        section_heading: 置換対象セクションの見出し
        new_content: 新しいセクション内容

    Returns:
        (置換後のMarkdown, 変更情報)
    """
    sections = split_markdown_sections(original_markdown)
    target_section = find_section_by_heading(sections, section_heading)

    if not target_section:
        return original_markdown, {
            'success': False,
            'error': f'セクション "{section_heading}" が見つかりません'
        }

    # 新しいMarkdownを構築
    lines = original_markdown.split('\n')
    start_line = target_section['start_line']

    # セクションの終了行を特定
    section_idx = sections.index(target_section)
    if section_idx + 1 < len(sections):
        end_line = sections[section_idx + 1]['start_line']
    else:
        end_line = len(lines)

    # 新しい内容で置換
    new_lines = lines[:start_line]
    new_lines.append(target_section['heading'])
    new_lines.extend(new_content.split('\n'))
    new_lines.extend(lines[end_line:])

    new_markdown = '\n'.join(new_lines)

    return new_markdown, {
        'success': True,
        'section': section_heading,
        'old_content': target_section['content'],
        'new_content': new_content,
        'line_range': (start_line, end_line)
    }


def apply_text_replacement(
    original_markdown: str,
    old_text: str,
    new_text: str,
    occurrence: int = 1
) -> Tuple[str, Dict[str, Any]]:
    """
    テキストの置換を適用

    Args:
        original_markdown: 元のMarkdown
        old_text: 置換対象テキスト
        new_text: 新しいテキスト
        occurrence: 何番目の出現を置換するか（1から開始）

    Returns:
        (置換後のMarkdown, 変更情報)
    """
    if old_text not in original_markdown:
        return original_markdown, {
            'success': False,
            'error': '指定されたテキストが見つかりません'
        }

    # 指定番目の出現位置を特定
    count = 0
    start = 0
    position = -1

    while True:
        pos = original_markdown.find(old_text, start)
        if pos == -1:
            break
        count += 1
        if count == occurrence:
            position = pos
            break
        start = pos + 1

    if position == -1:
        return original_markdown, {
            'success': False,
            'error': f'{occurrence}番目の出現が見つかりません'
        }

    # 置換を適用
    new_markdown = (
        original_markdown[:position] +
        new_text +
        original_markdown[position + len(old_text):]
    )

    return new_markdown, {
        'success': True,
        'old_text': old_text,
        'new_text': new_text,
        'position': position,
        'occurrence': occurrence
    }


def detect_edit_intent(instruction: str, current_content: str) -> Dict[str, Any]:
    """
    編集指示から意図を検出

    Args:
        instruction: ユーザーの編集指示
        current_content: 現在の記事内容

    Returns:
        検出された意図
        {'type': 'section_edit' | 'text_replace' | 'append' | 'full_rewrite', ...}
    """
    instruction_lower = instruction.lower()

    # テキスト置換のパターン（セクション編集より先にチェック）
    # 「A」を「B」に変更 の形式
    replace_patterns = [
        r'「([^」]+)」\s*(を|から)\s*「([^」]+)」\s*(に|へ)?\s*(変更|置換|修正)',
        r'「([^」]+)」\s*(という|って|の)\s*(部分|表現|文).*?「([^」]+)」\s*(に|へ)',
    ]

    for pattern in replace_patterns:
        match = re.search(pattern, instruction)
        if match:
            return {
                'type': 'text_replace',
                'old_text': match.group(1),
                'new_text': match.group(3) if match.lastindex >= 3 else None,
                'matched_pattern': pattern
            }

    # セクション編集のパターン
    section_patterns = [
        r'「([^」]+)」\s*(セクション|部分|箇所)',
        r'(##?\s*[^\n]+)\s*の\s*(内容|部分)',
        r'(見出し|セクション)\s*「([^」]+)」',
        r'「([^」]+)」\s*を[^「]*?(修正|変更|書き直|追加|詳しく|書いて)',
    ]

    for pattern in section_patterns:
        match = re.search(pattern, instruction)
        if match:
            return {
                'type': 'section_edit',
                'target': match.group(1) if match.lastindex >= 1 else None,
                'matched_pattern': pattern
            }

    # 追加のパターン
    append_patterns = [
        r'(最後|末尾|終わり).*?(追加|付け加え|入れて)',
        r'(追加|付け加え).*?(して|しろ|ください)',
    ]

    for pattern in append_patterns:
        if re.search(pattern, instruction):
            return {
                'type': 'append',
                'matched_pattern': pattern
            }

    # 全体書き直しのパターン
    rewrite_patterns = [
        r'(全体|全部|すべて).*?(書き直|修正|変更)',
        r'(最初から|一から).*?(書き直)',
    ]

    for pattern in rewrite_patterns:
        if re.search(pattern, instruction):
            return {
                'type': 'full_rewrite',
                'matched_pattern': pattern
            }

    # デフォルト: AI判断に委ねる
    return {
        'type': 'ai_decide',
        'instruction': instruction
    }


def create_revision_record(
    original_content: str,
    new_content: str,
    instruction: str,
    edit_info: Dict[str, Any]
) -> Dict[str, Any]:
    """
    リビジョンレコードを作成

    Args:
        original_content: 変更前の内容
        new_content: 変更後の内容
        instruction: 編集指示
        edit_info: 編集情報

    Returns:
        リビジョンレコード
    """
    diffs = calculate_line_diff(original_content, new_content)

    return {
        'instruction': instruction,
        'edit_type': edit_info.get('type', 'unknown'),
        'diffs': diffs,
        'diff_count': len(diffs),
        'original_length': len(original_content),
        'new_length': len(new_content),
        'length_change': len(new_content) - len(original_content)
    }
