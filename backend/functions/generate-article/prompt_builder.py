"""
プロンプト構築モジュール
Phase 2: P2-01〜P2-04のプロンプト設計を実装
"""

from typing import TypedDict, List, Optional, Literal


# 型定義
class ArticleStyleSettings(TypedDict, total=False):
    taste: Literal['formal', 'casual', 'friendly', 'professional']
    firstPerson: Literal['watashi', 'boku', 'hissha']
    readerAddress: Literal['anata', 'minasan', 'custom']
    readerAddressCustom: str
    tone: Literal['explanatory', 'story', 'qa']
    introStyle: Literal['problem', 'empathy', 'question']


class DecorationSettings(TypedDict, total=False):
    infoBox: bool
    warningBox: bool
    successBox: bool
    balloon: bool
    quote: bool
    table: bool


# 新しい装飾スキーマ（roles対応）
class DecorationWithRoles(TypedDict):
    id: str
    label: str
    roles: List[str]  # 'attention', 'warning', 'summarize', 'explain', 'action'
    css: str
    enabled: bool


# 意味的ロールの定義
SEMANTIC_ROLES = {
    'attention': '重要なポイントや強調したい内容',
    'warning': '注意点や警告、気をつけるべきこと',
    'summarize': 'まとめや要点の整理',
    'explain': '詳しい説明や補足情報',
    'action': '次のステップや行動を促す内容'
}


class SeoSettings(TypedDict, total=False):
    metaDescriptionLength: int
    maxKeywords: int


class SampleArticle(TypedDict):
    id: str
    title: str
    content: str
    format: Literal['html', 'markdown']


class InternalLink(TypedDict):
    url: str
    title: str
    description: Optional[str]


class UserSettings(TypedDict, total=False):
    articleStyle: ArticleStyleSettings
    decorations: DecorationSettings
    seo: SeoSettings
    sampleArticles: List[SampleArticle]


class ArticleInput(TypedDict, total=False):
    title: str
    targetAudience: str
    purpose: str
    keywords: List[str]
    contentPoints: str
    wordCount: int
    articleType: Literal['info', 'howto', 'review']
    internalLinks: List[InternalLink]


# ラベルマッピング
TASTE_DESCRIPTIONS = {
    'formal': '丁寧で格式のある文体を使用してください。敬語を適切に使い、客観的で信頼性のある表現を心がけてください。',
    'casual': 'くだけた親しみやすい文体を使用してください。読者との距離を縮めるような表現を使ってください。',
    'friendly': '親しみやすく温かみのある文体を使用してください。読者に寄り添うような表現を心がけてください。',
    'professional': '専門的で知識のある印象を与える文体を使用してください。正確で的確な表現を使ってください。'
}

FIRST_PERSON_MAP = {
    'watashi': '私',
    'boku': '僕',
    'hissha': '筆者'
}

READER_ADDRESS_MAP = {
    'anata': 'あなた',
    'minasan': '皆さん'
}

TONE_DESCRIPTIONS = {
    'explanatory': '説明的なトーンで、順序立てて論理的に説明してください。',
    'story': 'ストーリー形式で、体験談や物語のように展開してください。',
    'qa': 'Q&A形式で、読者の疑問に答えるように構成してください。'
}

INTRO_STYLE_DESCRIPTIONS = {
    'problem': '読者が抱える問題を提起し、その解決策を提供する流れで書き始めてください。',
    'empathy': '読者の気持ちに共感し、同じ悩みを持つ者として語りかけるように書き始めてください。',
    'question': '読者に問いかける形式で、興味を引きつけるような質問から書き始めてください。'
}


def build_style_instructions(style: ArticleStyleSettings) -> str:
    """
    P2-02: スタイル反映プロンプト
    ユーザー設定に基づいて文体指示を生成
    """
    instructions = []

    # テイスト
    taste = style.get('taste', 'friendly')
    instructions.append(TASTE_DESCRIPTIONS.get(taste, TASTE_DESCRIPTIONS['friendly']))

    # 一人称
    first_person = style.get('firstPerson', 'watashi')
    fp_text = FIRST_PERSON_MAP.get(first_person, '私')
    instructions.append(f'一人称は「{fp_text}」を使用してください。')

    # 読者への呼びかけ
    reader_address = style.get('readerAddress', 'minasan')
    if reader_address == 'custom':
        ra_text = style.get('readerAddressCustom', '皆さん')
    else:
        ra_text = READER_ADDRESS_MAP.get(reader_address, '皆さん')
    instructions.append(f'読者への呼びかけは「{ra_text}」を使用してください。')

    # トーン
    tone = style.get('tone', 'explanatory')
    instructions.append(TONE_DESCRIPTIONS.get(tone, TONE_DESCRIPTIONS['explanatory']))

    # 導入スタイル
    intro_style = style.get('introStyle', 'problem')
    instructions.append(INTRO_STYLE_DESCRIPTIONS.get(intro_style, INTRO_STYLE_DESCRIPTIONS['problem']))

    return '\n'.join(instructions)


def build_decoration_instructions(decorations: DecorationSettings) -> str:
    """
    装飾プリセットに基づいて使用可能な装飾タグを指示
    """
    available_decorations = []
    decoration_rules = []

    # ボックス装飾
    box_types = []
    if decorations.get('infoBox', True):
        box_types.append('info（情報・補足）')
    if decorations.get('warningBox', True):
        box_types.append('warning（注意・警告）')
    if decorations.get('successBox', True):
        box_types.append('success（成功・おすすめ）')

    if box_types:
        available_decorations.append('ボックス装飾')
        decoration_rules.append(f"""### ボックス装飾
使用可能なタイプ: {', '.join(box_types)}

```
:::box type="info"
ここに内容を記載
:::
```""")

    # 吹き出し
    if decorations.get('balloon', False):
        available_decorations.append('吹き出し')
        decoration_rules.append("""### 吹き出し装飾
読者の疑問（左）や筆者のアドバイス（右）を表現できます。

```
:::balloon position="left" icon="🤔"
読者の疑問や悩み
:::

:::balloon position="right" icon="😊"
筆者の回答やアドバイス
:::
```""")

    # 引用
    if decorations.get('quote', True):
        available_decorations.append('引用')
        decoration_rules.append("""### 引用
重要な引用や強調したいテキストに使用してください。

```
> 引用文をここに記載
```""")

    # 表
    if decorations.get('table', True):
        available_decorations.append('表')
        decoration_rules.append("""### 表
比較や一覧を分かりやすく表示する際に使用してください。

```
| 項目1 | 項目2 | 項目3 |
|-------|-------|-------|
| 内容  | 内容  | 内容  |
```""")

    if not available_decorations:
        return """## 装飾について
装飾は使用せず、シンプルなMarkdownで記述してください。"""

    result = f"""## 使用可能な装飾
以下の装飾を適切に使用してください: {', '.join(available_decorations)}

{chr(10).join(decoration_rules)}

**注意**: 装飾は適度に使用し、記事の読みやすさを損なわないようにしてください。"""

    return result


def build_sample_article_context(samples: List[SampleArticle]) -> str:
    """
    P2-03: サンプル記事学習プロンプト
    アップロードされたサンプル記事から文体・構成を学習させる
    """
    if not samples:
        return ""

    sample_texts = []
    for i, sample in enumerate(samples, 1):
        sample_texts.append(f"""### サンプル記事{i}: {sample['title']}

```
{sample['content'][:3000]}{'...' if len(sample['content']) > 3000 else ''}
```""")

    return f"""## 参考スタイル（重要）
以下のサンプル記事の文体、表現、構成を参考にして、同様のスタイルで記事を生成してください。
特に以下の点を分析し、模倣してください：
- 文末表現のパターン
- 段落の長さと区切り方
- 説明の詳細度
- 読者への語りかけ方
- 装飾の使い方

{chr(10).join(sample_texts)}

上記のサンプル記事と同様の雰囲気・文体で新しい記事を生成してください。"""


def build_internal_links_instructions(links: List[InternalLink]) -> str:
    """
    P2-04: 内部リンク挿入プロンプト
    関連する内部リンクを自然に挿入する指示
    """
    if not links:
        return ""

    link_list = []
    for link in links:
        desc = f" - {link.get('description', '')}" if link.get('description') else ""
        link_list.append(f"- [{link['title']}]({link['url']}){desc}")

    return f"""## 内部リンク挿入
以下の関連記事へのリンクを、記事内の適切な箇所に自然な形で挿入してください。
無理に全てのリンクを入れる必要はありませんが、内容に関連する箇所では積極的に紹介してください。

### 挿入可能なリンク
{chr(10).join(link_list)}

### リンク挿入のガイドライン
1. 文脈に合った場所にリンクを挿入する
2. 「詳しくは○○をご覧ください」のような自然な導入文を使う
3. 同じリンクを複数回挿入しない
4. 無理にリンクを入れず、関連性が高い場合のみ挿入する
5. リンクはMarkdown形式 [タイトル](URL) で記述する"""


def build_article_type_instructions(article_type: str) -> str:
    """
    記事タイプ別の構成指示
    """
    if article_type == 'howto':
        return """## 記事タイプ: ハウツー型
以下の構成で記事を作成してください：
1. 導入（この記事で学べること）
2. 必要な準備・前提条件
3. 手順（ステップバイステップで番号付き）
4. よくある質問・トラブルシューティング
5. まとめ（実践を促す）

各ステップは具体的で、読者がすぐに実践できるように書いてください。"""

    elif article_type == 'review':
        return """## 記事タイプ: レビュー・体験談型
以下の構成で記事を作成してください：
1. 導入（なぜこの記事を書いたか）
2. 使用前の状況・悩み
3. 実際の使用体験
4. 良い点（メリット）
5. 注意点（デメリット）
6. こんな人におすすめ
7. まとめ（総合評価）

正直な感想を述べ、メリット・デメリットの両方を公平に記載してください。"""

    else:  # info (default)
        return """## 記事タイプ: 情報提供型
以下の構成で記事を作成してください：
1. 導入（問題提起または概要）
2. 背景・基礎知識
3. 本題（3〜4つのポイント）
4. 応用・発展
5. まとめ（要点整理）

論理的で分かりやすい構成を心がけてください。"""


def build_seo_instructions(seo: SeoSettings, keywords: List[str]) -> str:
    """
    SEO設定に基づいた指示
    """
    meta_length = seo.get('metaDescriptionLength', 140)
    max_keywords = seo.get('maxKeywords', 7)

    keyword_text = ''
    if keywords:
        # 最大キーワード数で制限
        limited_keywords = keywords[:max_keywords]
        keyword_text = f"""
### キーワードの活用
以下のキーワードを記事内で自然に使用してください：
{', '.join(limited_keywords)}

- 見出しに主要キーワードを含める
- 本文中で過度にキーワードを繰り返さない
- 同義語や関連語も適宜使用する"""

    return f"""## SEO最適化
### メタディスクリプション
記事の最後に、以下の形式でメタディスクリプションを生成してください：

```
---
meta_description: （{meta_length}文字以内で記事の要約を記載）
---
```
{keyword_text}"""


def build_prompt(body: ArticleInput, settings: Optional[UserSettings] = None) -> str:
    """
    P2-01: 基本プロンプトテンプレート
    全ての設定を統合してプロンプトを構築

    Args:
        body: 記事生成リクエストの入力データ
        settings: ユーザー設定（オプション）

    Returns:
        Claude APIに送信するプロンプト文字列
    """
    settings = settings or {}

    # 基本情報
    title = body.get('title', '')
    target_audience = body.get('targetAudience', '一般')
    purpose = body.get('purpose', '情報提供')
    keywords = body.get('keywords', [])
    content_points = body.get('contentPoints', '')
    word_count = body.get('wordCount', 1500)
    article_type = body.get('articleType', 'info')
    internal_links = body.get('internalLinks', [])

    # 設定から取得
    article_style = settings.get('articleStyle', {})
    decorations = settings.get('decorations', {})
    seo = settings.get('seo', {})
    sample_articles = settings.get('sampleArticles', [])

    # 各セクションを構築
    style_instructions = build_style_instructions(article_style)
    decoration_instructions = build_decoration_instructions(decorations)
    sample_context = build_sample_article_context(sample_articles)
    internal_link_instructions = build_internal_links_instructions(internal_links)
    article_type_instructions = build_article_type_instructions(article_type)
    seo_instructions = build_seo_instructions(seo, keywords)

    # プロンプト組み立て
    prompt = f"""あなたはブログ記事生成の専門家です。以下の情報をもとに、読みやすく魅力的な記事を生成してください。

## 記事情報
- タイトル: {title}
- 対象読者: {target_audience}
- 記事の目的: {purpose}
- キーワード: {', '.join(keywords) if keywords else 'なし'}
- 目標文字数: {word_count}文字程度

## 内容要件
{content_points}

## 文体・スタイル
{style_instructions}

{article_type_instructions}

{decoration_instructions}

{sample_context}

{internal_link_instructions}

{seo_instructions}

## 出力形式
- Markdown形式で出力
- 見出しはh2(##)から開始（h1は絶対に使わない）
- 段落は3〜5文程度で区切り、読みやすさを重視
- 箇条書きや番号付きリストを適宜使用して情報を整理
- 重要なポイントは**太字**で強調

## 制約条件
- 文字数: {word_count}文字程度（±10%の範囲内で）
- 見出し（h2）数: 3〜6個
- 装飾: 使用可能な装飾を最低2箇所、最大5箇所使用
- 口調: 「です・ます調」を一貫して使用
- 文の長さ: 1文は40〜60文字程度を目安に

## 品質チェックリスト
生成前に以下を確認してください：
1. タイトルに沿った内容になっているか
2. 対象読者に適した説明レベルか
3. 導入→本文→まとめの流れが自然か
4. 同じ表現の繰り返しを避けているか
5. 装飾が適切に配置されているか

## 注意事項
- 嘘や不正確な情報は絶対に書かない
- 情報が不確かな場合は「〜と言われています」など表現を工夫する
- 専門用語は初出時に簡単な説明を添える
- 読者を見下すような表現は避ける

では、上記の条件に従って、高品質な記事を生成してください。"""

    return prompt


def build_title_generation_prompt(body: ArticleInput, settings: Optional[UserSettings] = None) -> str:
    """
    タイトル案を3つ生成するプロンプト
    """
    title = body.get('title', '')
    content_points = body.get('contentPoints', '')
    keywords = body.get('keywords', [])
    target_audience = body.get('targetAudience', '一般')

    return f"""以下の情報をもとに、ブログ記事のタイトル案を3つ提案してください。

## 記事の概要
- 仮タイトル: {title}
- 対象読者: {target_audience}
- キーワード: {', '.join(keywords) if keywords else 'なし'}

## 記事の内容
{content_points}

## タイトル作成のガイドライン
1. SEOを意識し、主要キーワードを含める
2. 読者の興味を引く表現を使う
3. 30〜50文字程度に収める
4. 具体的な数字や効果を入れると効果的

## 出力形式
以下のJSON形式で3つのタイトル案を出力してください：

```json
{{
  "titles": [
    {{
      "title": "タイトル案1",
      "reason": "このタイトルの狙い"
    }},
    {{
      "title": "タイトル案2",
      "reason": "このタイトルの狙い"
    }},
    {{
      "title": "タイトル案3",
      "reason": "このタイトルの狙い"
    }}
  ]
}}
```"""


def build_meta_generation_prompt(markdown_content: str, seo: Optional[SeoSettings] = None) -> str:
    """
    記事からメタ情報を生成するプロンプト
    """
    seo = seo or {}
    meta_length = seo.get('metaDescriptionLength', 140)
    max_keywords = seo.get('maxKeywords', 7)

    return f"""以下のブログ記事を分析し、SEO用のメタ情報を生成してください。

## 記事本文
{markdown_content[:5000]}

## 出力形式
以下のJSON形式で出力してください：

```json
{{
  "metaDescription": "（{meta_length}文字以内の記事要約）",
  "keywords": ["キーワード1", "キーワード2", ...],  // 最大{max_keywords}個
  "suggestedSlug": "url-friendly-slug",
  "estimatedReadingTime": 5  // 分単位
}}
```

## ガイドライン
- metaDescription: 記事の要点を簡潔にまとめ、検索結果で魅力的に見える文章
- keywords: 記事内で重要なキーワードを抽出
- suggestedSlug: URLに使える英数字とハイフンのみ
- estimatedReadingTime: 平均的な読者が読み終わる時間（1分あたり400文字で計算）"""


# ============================================================
# 2段階生成システム（Phase 2）
# Step 1: 構造生成（roleのみ、CSSなし）
# Step 2: 出力生成（decorationIdのみ、CSSなし）
# ============================================================

def get_available_roles(decorations: List[DecorationWithRoles]) -> List[str]:
    """有効な装飾からrolesを抽出"""
    roles = set()
    for dec in decorations:
        if dec.get('enabled', True) and dec.get('roles'):
            roles.update(dec['roles'])
    return list(roles)


def build_structure_prompt(body: ArticleInput, settings: Optional[UserSettings] = None) -> str:
    """
    Step 1: 記事構造をJSON形式で生成（roleのみ、CSSなし）
    Claudeは意味的なroleのみを判断し、具体的な装飾IDは決めない
    """
    settings = settings or {}

    # 基本情報
    title = body.get('title', '')
    target_audience = body.get('targetAudience', '一般')
    purpose = body.get('purpose', '情報提供')
    keywords = body.get('keywords', [])
    content_points = body.get('contentPoints', '')
    word_count = body.get('wordCount', 1500)
    article_type = body.get('articleType', 'info')

    # 設定から取得
    article_style = settings.get('articleStyle', {})
    decorations = settings.get('decorations', [])
    sample_articles = settings.get('sampleArticles', [])

    # 利用可能なrolesを取得
    available_roles = get_available_roles(decorations) if isinstance(decorations, list) else []

    # 文体指示
    style_instructions = build_style_instructions(article_style)

    # サンプル記事コンテキスト
    sample_context = build_sample_article_context(sample_articles)

    # 記事タイプ指示
    article_type_instructions = build_article_type_instructions(article_type)

    # 利用可能なroles説明
    roles_explanation = ""
    if available_roles:
        role_descriptions = []
        for role in available_roles:
            if role in SEMANTIC_ROLES:
                role_descriptions.append(f'- "{role}": {SEMANTIC_ROLES[role]}')
        roles_explanation = f"""## 使用可能な意味的ロール
以下のroleを適切な箇所で使用してください。roleは段落やブロックの「意味・目的」を表します。

{chr(10).join(role_descriptions)}

### ロール使用のガイドライン
- 同じroleを連続して使わない
- 1記事内で同じroleは最大3回まで
- roleが不要な通常の段落はrolesを空配列[]にする
- 装飾に頼りすぎず、本文の流れを重視する"""

    prompt = f"""あなたはブログ記事生成の専門家です。以下の情報をもとに、記事の構造をJSON形式で生成してください。

## 記事情報
- タイトル: {title}
- 対象読者: {target_audience}
- 記事の目的: {purpose}
- キーワード: {', '.join(keywords) if keywords else 'なし'}
- 目標文字数: {word_count}文字程度

## 内容要件
{content_points}

## 文体・スタイル
{style_instructions}

{article_type_instructions}

{roles_explanation}

{sample_context}

## 出力形式（JSON）
以下の形式で記事構造を出力してください。**必ずJSONのみを出力し、他の説明は不要です。**

```json
{{
  "title": "記事タイトル",
  "sections": [
    {{
      "heading": "H2見出し",
      "blocks": [
        {{
          "type": "paragraph",
          "content": "段落の内容",
          "roles": []
        }},
        {{
          "type": "paragraph",
          "content": "重要なポイントの内容",
          "roles": ["attention"]
        }},
        {{
          "type": "list",
          "listType": "unordered",
          "items": ["項目1", "項目2", "項目3"],
          "roles": []
        }},
        {{
          "type": "subsection",
          "heading": "H3見出し",
          "blocks": [
            {{
              "type": "paragraph",
              "content": "小見出し内の内容",
              "roles": []
            }}
          ]
        }}
      ]
    }}
  ],
  "meta": {{
    "metaDescription": "メタディスクリプション（140文字以内）"
  }}
}}
```

## ブロックタイプ
- "paragraph": 通常の段落
- "list": リスト（listType: "unordered" または "ordered"）
- "subsection": H3小見出しセクション（blocks配列を含む）

## 制約条件
- sections数（H2見出し）: 3〜6個
- 各sectionにblocks: 2〜5個
- roles付きブロック: 記事全体で2〜5箇所
- 同じroleの連続使用禁止
- 同じroleは記事内で最大3回

**重要: JSONのみを出力してください。説明文や前置きは不要です。**"""

    return prompt


def build_output_prompt(
    mapped_structure: dict,
    decorations: List[DecorationWithRoles],
    output_format: str = 'markdown'
) -> str:
    """
    Step 2: マッピング済み構造からMarkdown/HTML出力を生成
    decorationIdは既にマッピング済み、CSSは含まない
    """

    # 装飾ID -> ラベルのマッピング作成（出力時の参照用）
    decoration_map = {d['id']: d['label'] for d in decorations if d.get('enabled', True)}

    decoration_instructions = ""
    if decoration_map:
        dec_list = [f'- {did}: {label}' for did, label in decoration_map.items()]
        decoration_instructions = f"""## 使用する装飾
以下の装飾IDが構造データに含まれています。指定された形式で出力してください。

{chr(10).join(dec_list)}

### 装飾の出力形式（Markdown）
```
:::box id="{list(decoration_map.keys())[0] if decoration_map else 'ba-point'}"
ここに内容を記載
:::
```"""

    import json
    structure_json = json.dumps(mapped_structure, ensure_ascii=False, indent=2)

    prompt = f"""以下の記事構造データをMarkdown形式に変換してください。

## 記事構造データ
```json
{structure_json}
```

{decoration_instructions}

## 出力形式
- Markdown形式で出力
- 見出しはh2(##)から開始（h1は使わない）
- decorationIdが指定されているブロックは `:::box id="装飾ID"` 形式で囲む
- decorationIdがないブロックは通常のMarkdownで出力
- 段落間は1行空ける

## 出力例
```markdown
## 見出し

通常の段落テキストです。

:::box id="ba-point"
重要なポイントの内容です。
:::

- リスト項目1
- リスト項目2

### 小見出し

小見出し内の内容です。
```

**重要: Markdownのみを出力してください。説明文や前置きは不要です。**"""

    return prompt


def build_prompt_two_step(body: ArticleInput, settings: Optional[UserSettings] = None) -> dict:
    """
    2段階生成用のプロンプトセットを返す

    Returns:
        dict: {
            'structure_prompt': Step1用プロンプト,
            'settings': 設定データ（Step2で使用）
        }
    """
    return {
        'structure_prompt': build_structure_prompt(body, settings),
        'settings': settings or {}
    }
