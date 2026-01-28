# 開発フロー・運用ルール

## 目的

- 本番を壊さずに安心して開発したい
- Gitのブランチ運用とAWS環境を1対1で対応させたい
- 将来メンバーが増えても破綻しない構成にしたい

---

## 全体像

```
GitHub               AWS
───────────────      ─────────────────────────
main        ─────▶   prod 環境（本番）
develop     ─────▶   dev 環境（検証）
feature/*   ──┐
               └──▶  dev 環境（検証）
```

---

## 1. Gitブランチ設計

### ブランチ構成（固定）

| ブランチ | 役割 | デプロイ先 |
|---------|------|-----------|
| `main` | 本番専用（直接コミット禁止） | prod |
| `develop` | 検証用（dev環境と連動） | dev |
| `feature/*` | 作業用（個別機能開発） | dev（手動） |

### ルール

- **mainへの直接push禁止** - 必ずPR経由
- **マージフロー固定**: `feature/*` → `develop` → `main`
- featureブランチ命名規則: `feature/機能名` (例: `feature/box-title`)

### ブランチ保護設定（GitHub）

```
main:
  - Require pull request reviews
  - Require status checks to pass
  - No direct pushes

develop:
  - Require pull request reviews (optional)
```

---

## 2. AWS環境構成

### 環境分離（dev / prod）

| 環境 | 用途 | URL |
|-----|------|-----|
| prod | 本番 | https://d61rr8il37q8l.cloudfront.net |
| dev | 検証 | https://d3iztaxemgxo0e.cloudfront.net |

### リソース命名規則

```
prod環境:
  - Lambda: blog-agent-{function}-prod
  - DynamoDB: blog-agent-{table}
  - S3: blog-agent-frontend-prod-{account-id}

dev環境:
  - Lambda: blog-agent-{function}-dev
  - DynamoDB: blog-agent-{table}-dev
  - S3: blog-agent-frontend-dev-{account-id}
```

### 重要: 環境間のデータ分離

- **prod DBとdev DBは完全に分離**
- dev Lambdaからprod DBへのアクセス禁止
- IAMロールで環境ごとにアクセス制限

---

## 3. 環境切り替えの仕組み

### Lambda環境変数

```bash
# prod環境
ENV=prod
DYNAMODB_TABLE_ARTICLES=blog-agent-articles
DYNAMODB_TABLE_SETTINGS=blog-agent-settings
DYNAMODB_TABLE_JOBS=blog-agent-jobs

# dev環境
ENV=dev
DYNAMODB_TABLE_ARTICLES=blog-agent-articles-dev
DYNAMODB_TABLE_SETTINGS=blog-agent-settings-dev
DYNAMODB_TABLE_JOBS=blog-agent-jobs-dev
```

### フロントエンド環境変数

```bash
# frontend/.env.prod
VITE_API_BASE_URL=https://49aiga7ig2.execute-api.ap-northeast-1.amazonaws.com/prod

# frontend/.env.dev
VITE_API_BASE_URL=https://t22nn2nbqb.execute-api.ap-northeast-1.amazonaws.com/dev
```

**原則: コードは同じ、設定だけ違う**

---

## 4. デプロイフロー

### 手動デプロイ（現在）

```bash
# dev環境へデプロイ
./scripts/deploy.sh dev

# prod環境へデプロイ（mainブランチのみ）
./scripts/deploy.sh prod
```

### 自動デプロイ（GitHub Actions - 将来）

| トリガー | デプロイ先 |
|---------|-----------|
| `develop`へのpush/merge | AWS dev |
| `main`へのpush/merge | AWS prod |

### 標準的な開発フロー

```
1. feature/xxx ブランチ作成
   git checkout develop
   git pull origin develop
   git checkout -b feature/xxx

2. 開発・ローカルテスト
   npm run dev  # フロントエンド

3. dev環境で動作確認
   ./scripts/deploy.sh dev

4. develop へPR作成・マージ
   gh pr create --base develop

5. dev環境で最終確認

6. main へPR作成・マージ
   gh pr create --base main --head develop

7. prod環境へデプロイ
   ./scripts/deploy.sh prod

8. バージョンタグ作成（必要な場合）
   git tag -a v1.x.x -m "リリースノート"
   git push origin v1.x.x
```

---

## 5. バージョン管理ルール

### タグ付けルール

- **タグは本番リリースのみ**
- devではタグを切らない
- タグ = 本番で動いているコードを示す

### セマンティックバージョニング

```
MAJOR.MINOR.PATCH

例: v1.2.3
    │ │ └── PATCH: バグ修正（後方互換）
    │ └──── MINOR: 機能追加（後方互換）
    └────── MAJOR: 破壊的変更
```

| 変更内容 | バージョン例 |
|---------|-------------|
| バグ修正 | 1.0.0 → 1.0.1 |
| 新機能追加 | 1.0.1 → 1.1.0 |
| 破壊的変更（API変更等） | 1.1.0 → 2.0.0 |

### タグ作成コマンド

```bash
# タグ作成
git tag -a v1.1.0 -m "$(cat <<'EOF'
v1.1.0 - 機能追加

## 変更内容
- xxx機能を追加
- yyyを改善

## 影響範囲
- フロントエンド: GeneratePage
- バックエンド: generate-article Lambda
EOF
)"

# プッシュ
git push origin v1.1.0
```

---

## 6. 禁止事項

### 絶対禁止

| 禁止事項 | 理由 |
|---------|------|
| mainへ直接push | 本番事故防止 |
| dev LambdaからprodDBを触る | データ汚染防止 |
| 手動で本番Lambdaをいじる | 状態不整合防止 |
| タグなしで本番リリース | 追跡不能防止 |
| hotfixをdevelop経由しない | マージ漏れ防止 |

### 推奨しない

| 行為 | 代替案 |
|-----|-------|
| 大きなfeatureブランチ | 小さく分割してPR |
| 長期間マージしない | 1週間以内にマージ |
| テストせずにマージ | dev環境で必ず確認 |

---

## 7. 緊急時対応（Hotfix）

### 本番バグ発生時

```bash
# 1. mainからhotfixブランチ作成
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# 2. 修正・コミット

# 3. mainへ直接PR（緊急時のみ許可）
gh pr create --base main

# 4. マージ後、即座にデプロイ
./scripts/deploy.sh prod

# 5. タグ作成
git tag -a v1.0.1 -m "Hotfix: critical bug"
git push origin v1.0.1

# 6. developにもマージ（忘れずに！）
git checkout develop
git merge main
git push origin develop
```

---

## 8. 将来拡張

この構成なら以下の拡張が容易:

| 拡張 | 対応方法 |
|-----|---------|
| staging環境追加 | `staging`ブランチ + AWS staging環境 |
| 複数プロダクト | リポジトリ分離 or モノレポ |
| マルチリージョン | CloudFormationパラメータ追加 |
| CI/CD自動化 | GitHub Actions追加 |

---

## 9. チェックリスト

### 新機能開発時

- [ ] developから最新を取得
- [ ] feature/xxxブランチ作成
- [ ] ローカルで動作確認
- [ ] dev環境にデプロイして確認
- [ ] developへPR作成
- [ ] コードレビュー（将来）
- [ ] developにマージ
- [ ] dev環境で最終確認
- [ ] mainへPR作成
- [ ] mainにマージ
- [ ] prod環境にデプロイ
- [ ] 本番動作確認
- [ ] バージョンタグ作成（リリース時）

### リリース時

- [ ] 全テスト通過
- [ ] dev環境で動作確認完了
- [ ] mainにマージ済み
- [ ] prod環境にデプロイ済み
- [ ] 本番動作確認完了
- [ ] バージョンタグ作成
- [ ] リリースノート記載

---

## 10. 環境情報

### 本番環境（prod）

| リソース | 値 |
|---------|---|
| Frontend URL | https://d61rr8il37q8l.cloudfront.net |
| API URL | https://49aiga7ig2.execute-api.ap-northeast-1.amazonaws.com/prod |
| Cognito User Pool | ap-northeast-1_mMPitcdwE |
| Cognito Client ID | 5kpn6katcthc3lk1f0m4sbqqmq |

### 開発環境（dev）

| リソース | 値 |
|---------|---|
| Frontend URL | https://d3iztaxemgxo0e.cloudfront.net |
| API URL | https://t22nn2nbqb.execute-api.ap-northeast-1.amazonaws.com/dev |
| Cognito User Pool | ap-northeast-1_KGCi73tD7 |
| Cognito Client ID | 3hishtq8lik8p2dsqj0buho820 |

---

## まとめ

```
Git = コードの状態管理
AWS = 実行環境
dev / prod は必ず分ける
```

**このルールを守れば、安全に開発・デプロイができる。**
