"""
チャット修正用プロンプト構築
Phase 3: チャット修正の実装
"""

from typing import Any, Dict, List, Optional


def build_chat_edit_system_prompt() -> str:
    """
    チャット修正用のシステムプロンプトを構築

    Returns:
        システムプロンプト
    """
    return """あなたは日本語ブログ記事の編集アシスタントです。
ユーザーの指示に従って、記事の修正・改善を行います。

# 役割
- ユーザーの編集指示を正確に理解する
- 記事の文体・トーンを維持しながら修正を行う
- 必要最小限の変更で目的を達成する
- 修正箇所を明確に示す

# 出力形式
修正を行う際は、以下のJSON形式で出力してください：

```json
{
  "action": "edit" | "append" | "replace_section" | "no_change",
  "target": "修正対象の説明（セクション名やテキスト）",
  "original": "変更前のテキスト（部分修正の場合）",
  "modified": "変更後のテキスト",
  "explanation": "変更内容の簡潔な説明",
  "full_markdown": "修正後の記事全文（Markdown形式）"
}
```

# ルール
1. 指示された箇所のみ変更し、他の部分は維持する
2. Markdown形式を維持する
3. 見出し構造（H2, H3など）を崩さない
4. 内部リンクや装飾は維持する
5. 文体の一貫性を保つ
6. 変更理由を簡潔に説明する

# 禁止事項
- H1見出しを使用しない
- 記事全体を不必要に書き換えない
- 元の意図から外れた修正を行わない
- 修正不要な場合に無理に変更しない"""


def build_chat_edit_prompt(
    instruction: str,
    current_article: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    edit_context: Optional[Dict[str, Any]] = None
) -> str:
    """
    チャット修正用のプロンプトを構築

    Args:
        instruction: ユーザーの編集指示
        current_article: 現在の記事内容（Markdown）
        conversation_history: これまでの会話履歴
        edit_context: 編集コンテキスト（選択範囲など）

    Returns:
        完成したプロンプト
    """
    prompt_parts = []

    # 現在の記事
    prompt_parts.append("# 現在の記事\n")
    prompt_parts.append("```markdown")
    prompt_parts.append(current_article)
    prompt_parts.append("```\n")

    # 選択範囲がある場合
    if edit_context and edit_context.get('selected_text'):
        prompt_parts.append("# 選択されたテキスト\n")
        prompt_parts.append("```")
        prompt_parts.append(edit_context['selected_text'])
        prompt_parts.append("```\n")

        if edit_context.get('selection_context'):
            prompt_parts.append(f"（{edit_context['selection_context']}）\n")

    # 編集指示
    prompt_parts.append("# 編集指示\n")
    prompt_parts.append(instruction)
    prompt_parts.append("\n")

    # 追加の指示
    prompt_parts.append("---")
    prompt_parts.append("上記の指示に従って記事を修正し、指定のJSON形式で出力してください。")
    prompt_parts.append("修正が不要または不可能な場合は、actionを\"no_change\"とし、explanationで理由を説明してください。")

    return '\n'.join(prompt_parts)


def build_section_edit_prompt(
    instruction: str,
    section_heading: str,
    section_content: str,
    full_article: str
) -> str:
    """
    セクション編集用のプロンプトを構築

    Args:
        instruction: ユーザーの編集指示
        section_heading: 対象セクションの見出し
        section_content: 対象セクションの現在の内容
        full_article: 記事全文（コンテキスト用）

    Returns:
        完成したプロンプト
    """
    prompt_parts = []

    prompt_parts.append("# 編集対象セクション\n")
    prompt_parts.append(f"見出し: {section_heading}\n")
    prompt_parts.append("```markdown")
    prompt_parts.append(section_content)
    prompt_parts.append("```\n")

    prompt_parts.append("# 記事全文（参考）\n")
    prompt_parts.append("```markdown")
    prompt_parts.append(full_article[:2000])  # コンテキストサイズ制限
    if len(full_article) > 2000:
        prompt_parts.append("\n... (省略)")
    prompt_parts.append("```\n")

    prompt_parts.append("# 編集指示\n")
    prompt_parts.append(instruction)
    prompt_parts.append("\n")

    prompt_parts.append("---")
    prompt_parts.append("上記のセクションを編集指示に従って修正してください。")
    prompt_parts.append("出力形式:")
    prompt_parts.append("```json")
    prompt_parts.append('{')
    prompt_parts.append('  "action": "replace_section",')
    prompt_parts.append('  "target": "セクション名",')
    prompt_parts.append('  "original": "変更前のセクション内容",')
    prompt_parts.append('  "modified": "変更後のセクション内容",')
    prompt_parts.append('  "explanation": "変更内容の説明"')
    prompt_parts.append('}')
    prompt_parts.append("```")

    return '\n'.join(prompt_parts)


def build_text_replace_prompt(
    instruction: str,
    target_text: str,
    surrounding_context: str
) -> str:
    """
    テキスト置換用のプロンプトを構築

    Args:
        instruction: ユーザーの編集指示
        target_text: 置換対象テキスト
        surrounding_context: 周辺のコンテキスト

    Returns:
        完成したプロンプト
    """
    prompt_parts = []

    prompt_parts.append("# 置換対象テキスト\n")
    prompt_parts.append("```")
    prompt_parts.append(target_text)
    prompt_parts.append("```\n")

    prompt_parts.append("# 周辺コンテキスト\n")
    prompt_parts.append("```markdown")
    prompt_parts.append(surrounding_context)
    prompt_parts.append("```\n")

    prompt_parts.append("# 編集指示\n")
    prompt_parts.append(instruction)
    prompt_parts.append("\n")

    prompt_parts.append("---")
    prompt_parts.append("上記のテキストを編集指示に従って置換してください。")
    prompt_parts.append("出力形式:")
    prompt_parts.append("```json")
    prompt_parts.append('{')
    prompt_parts.append('  "action": "edit",')
    prompt_parts.append('  "target": "置換対象の説明",')
    prompt_parts.append('  "original": "変更前のテキスト",')
    prompt_parts.append('  "modified": "変更後のテキスト",')
    prompt_parts.append('  "explanation": "変更内容の説明"')
    prompt_parts.append('}')
    prompt_parts.append("```")

    return '\n'.join(prompt_parts)


def build_append_prompt(
    instruction: str,
    current_article: str,
    append_position: str = 'end'
) -> str:
    """
    追加用のプロンプトを構築

    Args:
        instruction: ユーザーの追加指示
        current_article: 現在の記事内容
        append_position: 追加位置（'end', 'section_name', など）

    Returns:
        完成したプロンプト
    """
    prompt_parts = []

    prompt_parts.append("# 現在の記事\n")
    prompt_parts.append("```markdown")
    prompt_parts.append(current_article)
    prompt_parts.append("```\n")

    prompt_parts.append("# 追加指示\n")
    prompt_parts.append(instruction)
    prompt_parts.append("\n")

    if append_position != 'end':
        prompt_parts.append(f"追加位置: {append_position}\n")
    else:
        prompt_parts.append("追加位置: 記事の末尾\n")

    prompt_parts.append("---")
    prompt_parts.append("上記の指示に従って記事に内容を追加してください。")
    prompt_parts.append("出力形式:")
    prompt_parts.append("```json")
    prompt_parts.append('{')
    prompt_parts.append('  "action": "append",')
    prompt_parts.append('  "target": "追加位置の説明",')
    prompt_parts.append('  "modified": "追加するテキスト",')
    prompt_parts.append('  "explanation": "追加内容の説明",')
    prompt_parts.append('  "full_markdown": "追加後の記事全文"')
    prompt_parts.append('}')
    prompt_parts.append("```")

    return '\n'.join(prompt_parts)


def build_follow_up_prompt(
    instruction: str,
    current_article: str,
    previous_changes: List[Dict[str, Any]]
) -> str:
    """
    フォローアップ編集用のプロンプトを構築

    Args:
        instruction: ユーザーの追加指示
        current_article: 現在の記事内容
        previous_changes: これまでの変更履歴

    Returns:
        完成したプロンプト
    """
    prompt_parts = []

    # 直近の変更を要約
    if previous_changes:
        prompt_parts.append("# 直近の変更履歴\n")
        for i, change in enumerate(previous_changes[-3:], 1):  # 最新3件
            prompt_parts.append(f"{i}. {change.get('explanation', '変更内容不明')}")
        prompt_parts.append("\n")

    prompt_parts.append("# 現在の記事\n")
    prompt_parts.append("```markdown")
    prompt_parts.append(current_article)
    prompt_parts.append("```\n")

    prompt_parts.append("# 追加の編集指示\n")
    prompt_parts.append(instruction)
    prompt_parts.append("\n")

    prompt_parts.append("---")
    prompt_parts.append("前回の変更を踏まえて、追加の編集を行ってください。")
    prompt_parts.append("指定のJSON形式で出力してください。")

    return '\n'.join(prompt_parts)


def build_undo_prompt(
    current_article: str,
    previous_article: str,
    change_to_undo: Dict[str, Any]
) -> str:
    """
    元に戻す操作用のプロンプトを構築

    Args:
        current_article: 現在の記事内容
        previous_article: 変更前の記事内容
        change_to_undo: 取り消す変更の情報

    Returns:
        完成したプロンプト
    """
    prompt_parts = []

    prompt_parts.append("# 取り消す変更\n")
    prompt_parts.append(f"変更内容: {change_to_undo.get('explanation', '不明')}")
    prompt_parts.append("\n")

    prompt_parts.append("# 変更前の記事\n")
    prompt_parts.append("```markdown")
    prompt_parts.append(previous_article)
    prompt_parts.append("```\n")

    prompt_parts.append("# 現在の記事\n")
    prompt_parts.append("```markdown")
    prompt_parts.append(current_article)
    prompt_parts.append("```\n")

    prompt_parts.append("---")
    prompt_parts.append("上記の変更を取り消し、変更前の状態に戻してください。")
    prompt_parts.append("出力形式:")
    prompt_parts.append("```json")
    prompt_parts.append('{')
    prompt_parts.append('  "action": "undo",')
    prompt_parts.append('  "target": "取り消した変更の説明",')
    prompt_parts.append('  "explanation": "元に戻しました",')
    prompt_parts.append('  "full_markdown": "変更前の記事全文"')
    prompt_parts.append('}')
    prompt_parts.append("```")

    return '\n'.join(prompt_parts)
