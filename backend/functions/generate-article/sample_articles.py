"""
標準サンプル記事（改訂版）
Phase 5: 記事生成時のスタイル参照用

参考記事の特徴:
- 一文が短く、読みやすい（30-50文字程度）
- 会話調の吹き出しで対話形式
- 装飾ボックス（ポイント、警告、成功など）を適度に使用
- テーブルやリストで情報を整理
- 段落ごとに1-2文、余白を大事にする
- 読者に語りかけるトーン
"""

from typing import TypedDict, Literal, List, Optional


class SampleArticle(TypedDict):
    id: str
    title: str
    content: str
    format: Literal['wordpress', 'markdown']


# 標準サンプル記事（WordPress Gutenberg形式）
DEFAULT_SAMPLE_ARTICLE_WORDPRESS: SampleArticle = {
    "id": "default-sample-wordpress",
    "title": "ブログ開設で失敗しない！選び方から設定まで5ステップで完了",
    "format": "wordpress",
    "content": """<!-- wp:paragraph -->
<p>「ブログを始めてみたいけど、情報が多すぎて何から手をつけていいかわからない」そんな悩みを抱えている皆さんへ。</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>実は、<span class="ba-highlight">ポイントを押さえれば、ブログ開設は思ったよりシンプルで、誰でも気軽に始められます</span>。</p>
<!-- /wp:paragraph -->

<!-- wp:html -->
<div class="ba-checklist">
<ul>
<li>たくさんのブログサービスがあって選べない</li>
<li>設定項目が多くて挫折しそう</li>
<li>何を書けばいいか分からない</li>
<li>続けられるか不安</li>
</ul>
</div>
<!-- /wp:html -->

<!-- wp:paragraph -->
<p>今回は、ブログ開設で失敗しないための5つのステップを、初心者の方にもわかりやすく解説していきます。</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>この記事を読み終わる頃には、自信を持ってブログ開設に取り組めるようになっているはずです。</p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2 class="wp-block-heading">ブログ開設前に知っておきたい基礎知識</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>ブログを始める前に、まず基本的な知識を整理しておきましょう。</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">無料ブログと有料ブログの違い</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>ブログサービスには大きく分けて<strong>無料ブログ</strong>と<strong>有料ブログ</strong>の2種類があり、それぞれに特徴があります。</p>
<!-- /wp:paragraph -->

<!-- wp:table -->
<figure class="wp-block-table"><table><thead><tr><th>種類</th><th>代表的なサービス</th><th>特徴</th></tr></thead><tbody><tr><td>無料ブログ</td><td>はてなブログ、アメブロ</td><td>初期費用0円、手軽に始められる</td></tr><tr><td>有料ブログ</td><td>WordPress（独自）</td><td>自由度高い、本格運営可能</td></tr></tbody></table></figure>
<!-- /wp:table -->

<!-- wp:paragraph -->
<p>無料ブログは、運営会社が提供するプラットフォームを利用するもので、登録すればすぐに記事を書き始められるのが魅力です。</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>一方、有料ブログは、自分でサーバーを契約して運営するため、より自由度が高く、本格的なブログ運営が可能になります。</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">初心者におすすめの始め方</h3>
<!-- /wp:heading -->

<!-- wp:html -->
<div class="ba-point">
<p>初心者の方には、まず無料ブログで始めて、慣れてきたらWordPressに移行するという方法もおすすめです。大切なのは、完璧を求めすぎず、まず一歩を踏み出してみることです。</p>
</div>
<!-- /wp:html -->

<!-- wp:heading -->
<h2 class="wp-block-heading">ステップ1：目的を明確にしてブログサービスを選ぶ</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>ブログ開設の第一歩は、<strong>なぜブログを始めるのか</strong>を明確にすることです。</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>日記として使いたいのか、趣味の情報を発信したいのか、それともビジネス目的なのかによって、最適なサービスは大きく変わってきます。</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">主要ブログサービスの比較</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>日記として使いたい場合は、無料ブログがおすすめで、特にはてなブログやアメブロが使いやすく、初心者にも親しみやすいインターフェースになっています。</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>主要なブログサービスの特徴を比較してみましょう。</p>
<!-- /wp:paragraph -->

<!-- wp:table -->
<figure class="wp-block-table"><table><thead><tr><th>サービス名</th><th>料金</th><th>カスタマイズ性</th><th>おすすめ用途</th></tr></thead><tbody><tr><td>はてなブログ</td><td>無料/有料</td><td>中程度</td><td>趣味・情報発信</td></tr><tr><td>アメブロ</td><td>無料</td><td>低い</td><td>日記・交流</td></tr><tr><td>WordPress</td><td>有料</td><td>高い</td><td>ビジネス・本格運営</td></tr><tr><td>note</td><td>無料</td><td>低い</td><td>クリエイター活動</td></tr></tbody></table></figure>
<!-- /wp:table -->

<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">目的に応じた選び方のポイント</h3>
<!-- /wp:heading -->

<!-- wp:html -->
<div class="ba-point">
<p>趣味や日記として気軽に始めたい方は無料ブログを、将来的に収益化を考えている方はWordPressを選ぶのが一般的です。自分の目的に合わせて、無理のないサービスを選びましょう。</p>
</div>
<!-- /wp:html -->

<!-- wp:heading -->
<h2 class="wp-block-heading">ステップ2：ブログ名とドメインを決める</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>ブログ名は、あなたのブログの「顔」となる重要な要素です。</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>覚えやすく、内容がイメージできる名前を心がけることで、読者の記憶に残りやすくなり、リピーターの獲得にもつながります。</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">ブログ名を決める手順</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>また、後から変更するのは大変なので、じっくり時間をかけて考えることをおすすめします。</p>
<!-- /wp:paragraph -->

<!-- wp:html -->
<div class="ba-number-list">
<ol>
<li><strong>テーマを決める</strong> - 何について書くブログなのかを明確にし、そこから連想される言葉を考えます</li>
<li><strong>キーワードを書き出す</strong> - テーマに関連する言葉をできるだけたくさんリストアップしてみましょう</li>
<li><strong>組み合わせてみる</strong> - キーワードを組み合わせて候補を作り、響きの良いものを選びます</li>
<li><strong>声に出して読んでみる</strong> - 発音しやすいか、覚えやすいかを実際に確認してみることが大切です</li>
</ol>
</div>
<!-- /wp:html -->

<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">ドメイン取得の必要性</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>無料ブログなら独自ドメインは不要ですが、本格的に運営するなら独自ドメインの取得を検討しましょう。</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>ドメインを取得する場合は、ブログ名と関連性があり、短くて覚えやすいものが理想的で、「.com」や「.jp」などの一般的な拡張子を選ぶと、読者にとっても親しみやすくなります。</p>
<!-- /wp:paragraph -->

<!-- wp:html -->
<div class="ba-warning">
<p>ドメイン名は一度決めると変更が難しいため、慎重に選びましょう。商標権を侵害するような名前や、スペルミスを誘発しやすい名前は避けることが重要です。</p>
</div>
<!-- /wp:html -->

<!-- wp:heading -->
<h2 class="wp-block-heading">ステップ3：基本設定とデザインをカスタマイズ</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>ブログサービスに登録できたら、次は基本設定を行っていきます。</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>プロフィール情報、ブログの説明文、カテゴリ設定などを丁寧に設定することで、読者にとって分かりやすく、魅力的なブログになります。</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">初期設定のチェックリスト</h3>
<!-- /wp:heading -->

<!-- wp:html -->
<div class="ba-checklist">
<ul>
<li>プロフィール画像の設定</li>
<li>自己紹介文の作成</li>
<li>カテゴリの設定（3〜5つ程度）</li>
<li>SNSアカウントの連携</li>
<li>コメント設定の確認</li>
</ul>
</div>
<!-- /wp:html -->

<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">デザインテンプレートの選び方</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>デザインテンプレートは、ブログの内容に合ったものを選ぶことが大切です。</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>読みやすさを重視し、あまり派手すぎないものがおすすめで、多くのサービスでは、シンプルなテンプレートから始めて、慣れてきたらカスタマイズしていくという方法もあります。</p>
<!-- /wp:paragraph -->

<!-- wp:html -->
<div class="ba-point">
<p>シンプルなテンプレートから始めて、慣れてきたらカスタマイズしていくのがおすすめです。最初から凝ったデザインにする必要はなく、記事を書くことに集中しましょう。</p>
</div>
<!-- /wp:html -->

<!-- wp:heading -->
<h2 class="wp-block-heading">ステップ4：最初の記事を書いてみる</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>設定が終わったら、いよいよ記事を書いていきます。</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>最初の記事は<span class="ba-highlight">自己紹介</span>がおすすめで、なぜブログを始めたのか、どんな情報を発信していくのかを読者に伝えることで、ブログの方向性が明確になります。</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">初心者が陥りがちな悩み</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>「何を書けばいいか分からない...」と思うかもしれませんが、完璧を求めなくて大丈夫です。</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>まずは1記事完成させることを目標にして、書きながら自分のスタイルを見つけていくのが一番の近道です。</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">記事を書く際の基本ポイント</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p><strong>記事を書く際のポイント:</strong></p>
<!-- /wp:paragraph -->

<!-- wp:list -->
<ul><li>読者目線で書く（自分が言いたいことだけでなく、読者が知りたいことを意識する）</li><li>見出しを活用する（長い文章は読みづらいので、適切に区切りを入れて読みやすくする）</li><li>画像を入れる（文字だけより、画像があると読みやすく、内容も伝わりやすくなる）</li><li>まとめを書く（記事の最後に要点を整理することで、読者の理解が深まる）</li></ul>
<!-- /wp:list -->

<!-- wp:heading -->
<h2 class="wp-block-heading">ステップ5：継続のためのルールを決める</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>ブログを始めても、多くの人が数ヶ月で更新が止まってしまうという現実があります。</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>継続するためには、<strong>自分なりのルールを決めておく</strong>ことが大切で、無理のない範囲で続けることが、長期的な成功の鍵となります。</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">更新頻度の決め方</h3>
<!-- /wp:heading -->

<!-- wp:table -->
<figure class="wp-block-table"><table><thead><tr><th>更新頻度</th><th>メリット</th><th>デメリット</th></tr></thead><tbody><tr><td>毎日</td><td>習慣化しやすい</td><td>負担が大きい</td></tr><tr><td>週1回</td><td>バランスが良い</td><td>ネタ切れに注意</td></tr><tr><td>月2-3回</td><td>無理なく続けられる</td><td>読者が離れやすい</td></tr></tbody></table></figure>
<!-- /wp:table -->

<!-- wp:paragraph -->
<p>例えば、「毎週日曜日に1記事投稿する」「通勤時間にネタをメモする」など、具体的で実行しやすいルールを設定しましょう。</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">モチベーションを保つコツ</h3>
<!-- /wp:heading -->

<!-- wp:html -->
<div class="ba-success">
<p>継続のコツは「小さな成功体験を積み重ねる」ことです。アクセス数やコメントなど、小さな反応でも嬉しいもので、そうした喜びを大切にしながら、楽しくブログを続けていくことが大切です。</p>
</div>
<!-- /wp:html -->

<!-- wp:heading -->
<h2 class="wp-block-heading">まとめ</h2>
<!-- /wp:heading -->

<!-- wp:html -->
<div class="ba-summary">
<p>今回は、ブログ開設で失敗しないための5つのステップをご紹介しました。</p>
<ul>
<li>目的を明確にしてサービスを選ぶ</li>
<li>ブログ名とドメインを慎重に決める</li>
<li>基本設定とデザインを整える</li>
<li>最初の記事を気軽に書いてみる</li>
<li>継続のためのルールを決める</li>
</ul>
<p>ブログは、あなたの考えや経験を世界に発信できる素晴らしいツールです。この記事で紹介したステップを参考に、ぜひブログ開設に挑戦してみてください。</p>
</div>
<!-- /wp:html -->

<!-- wp:paragraph -->
<p>あなたのブログライフが素敵なものになることを、心から願っています。</p>
<!-- /wp:paragraph -->"""
}"""
}


# 標準サンプル記事（Markdown形式）
DEFAULT_SAMPLE_ARTICLE_MARKDOWN: SampleArticle = {
    "id": "default-sample-markdown",
    "title": "プログラミング学習を効率化する5つの方法",
    "format": "markdown",
    "content": """「プログラミングを始めたけど、なかなか上達しない...」そんな悩みを抱えている皆さんへ。

私も最初は何度も挫折しかけましたが、**学習方法を見直すことで、確実に成長を実感できる**ようになりました。

今回は、プログラミング学習を効率化するための5つの方法を、実体験をもとにお伝えしていきます。

## 1. 小さなプロジェクトから始める

プログラミング学習で最も大切なのは、**実際に手を動かすこと**です。

教科書を読むだけでは、本当の意味で理解することはできず、実際にコードを書いて動かしてみることで初めて、知識が自分のものになります。

### 初心者向けのおすすめプロジェクト

最初から大きなアプリを作ろうとせず、小さなプロジェクトから始めましょう。

**おすすめの初心者向けプロジェクト:**

| プロジェクト | 難易度 | 学べること |
|------------|-------|----------|
| ToDoリスト | ★☆☆ | CRUD操作の基本 |
| 簡単な計算機 | ★☆☆ | 関数とイベント処理 |
| じゃんけんゲーム | ★★☆ | 条件分岐とランダム処理 |

### 完成を最優先にする理由

完成させることを最優先にして、機能は後から追加していけば大丈夫です。

最初から完璧なものを目指すよりも、まず動くものを作ることで、達成感を得られ、次のステップに進むモチベーションにもつながります。

## 2. エラーメッセージを恐れない

エラーが出ると落ち込んでしまう方も多いですが、実は**エラーは最高の学習機会**です。

エラーメッセージには、問題解決のヒントが含まれており、それを読み解くことで、プログラミングの理解が深まります。

### エラーへの正しい向き合い方

**エラーに遭遇したときの対処法:**

1. エラーメッセージをよく読む
2. わからない部分を検索する
3. 解決方法を試す
4. うまくいったら記録しておく

同じエラーを何度も経験することは無駄ではなく、繰り返すことで、自然と対処法が身につき、次第にエラーを見ただけで原因が分かるようになってきます。

## 3. 毎日30分でも継続する

プログラミングは、**継続が何より大切**で、週末にまとめて勉強するより、毎日少しずつ続ける方が効果的です。

### 効率的な学習スケジュール

**おすすめの学習スケジュール:**

| 時間帯 | 内容 | 所要時間 |
|-------|------|---------|
| 朝 | 前日の復習 | 10分 |
| 昼休み | 新しい概念を学ぶ | 20分 |
| 夜 | コードを書く | 30分 |

### 習慣化のコツ

「今日は疲れたから」という言い訳をしないために、学習を習慣化することが重要です。

最初は5分でも良いので、毎日必ずコードに触れる時間を作ることで、自然とプログラミングが生活の一部になっていきます。

## 4. アウトプットを意識する

学んだことを**アウトプット**することで、理解が深まり、自分の知識の穴も見えてきます。

### 効果的なアウトプット方法

以下のような方法がおすすめです:

- **ブログで発信する** - 人に説明することで自分の理解度がわかり、同じ悩みを持つ人の役にも立つ
- **GitHubにコードを公開する** - ポートフォリオにもなり、就職活動でのアピール材料にもなる
- **勉強会に参加する** - 同じ目標を持つ仲間と交流でき、モチベーション維持にもつながる

アウトプットは、自分の成長を実感できる最高の方法で、後から見返すことで、どれだけ成長したかを確認することもできます。

## 5. 完璧主義を捨てる

プログラミング学習で挫折する大きな原因は、**完璧を求めすぎること**です。

最初から美しいコードを書く必要はなく、動くコードを書くことが最優先で、リファクタリングは後からでもできます。

### 完璧主義を手放すための心構え

**完璧主義を捨てるための心構え:**

- まずは動くものを作る
- コードレビューは恐れない
- エラーは成長の証
- 比較するのは過去の自分だけ

他の人と比較するのではなく、昨日の自分より少しでも成長していれば、それで十分です。

## まとめ

プログラミング学習を効率化するための5つの方法をご紹介しました:

- 小さなプロジェクトから始める
- エラーメッセージを恐れない
- 毎日30分でも継続する
- アウトプットを意識する
- 完璧主義を捨てる

プログラミングは、正しい方法で継続すれば必ず上達します。

この記事を参考に、効率的な学習を始めてみてください。

あなたの成長を心から応援しています！"""
}


def get_default_sample_article(format: Literal['wordpress', 'markdown'] = 'wordpress') -> SampleArticle:
    """
    デフォルトサンプル記事を取得

    Args:
        format: 出力形式（'wordpress' または 'markdown'）

    Returns:
        指定された形式のサンプル記事
    """
    if format == 'markdown':
        return DEFAULT_SAMPLE_ARTICLE_MARKDOWN
    return DEFAULT_SAMPLE_ARTICLE_WORDPRESS


def get_sample_article_for_generation(
    user_samples: Optional[List[SampleArticle]] = None,
    output_format: Literal['wordpress', 'markdown'] = 'wordpress'
) -> SampleArticle:
    """
    記事生成に使用するサンプル記事を取得

    優先順位：
    1. ユーザーがアップロードしたサンプル記事
    2. 標準サンプル記事

    Args:
        user_samples: ユーザーがアップロードしたサンプル記事リスト
        output_format: 出力形式

    Returns:
        使用するサンプル記事
    """
    # ユーザーサンプルがあれば優先
    if user_samples and len(user_samples) > 0:
        # 同じ形式のサンプルを優先
        for sample in user_samples:
            if sample.get('format') == output_format:
                return sample
        # 形式が違っても最初のサンプルを使用
        return user_samples[0]

    # デフォルトサンプルを返す
    return get_default_sample_article(output_format)