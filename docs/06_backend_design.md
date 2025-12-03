# バックエンド設計

**ドキュメントバージョン**: 1.0  
**最終更新日**: 2024-12-03  
**関連ドキュメント**: 02_architecture.md, 04_api_specification.md

---

## 🔧 Lambda関数設計

### Lambda関数一覧

| 関数名 | ランタイム | メモリ | タイムアウト | 責務 |
|--------|-----------|--------|-------------|------|
| generate-article | Python 3.11 | 1024 MB | 60秒 | 記事生成 |
| manage-articles | Python 3.11 | 512 MB | 30秒 | 記事CRUD |
| authorizer | Python 3.11 | 256 MB | 5秒 | JWT検証 |
| convert-html | Node.js 20 | 512 MB | 10秒 | HTML変換 |

---

## 📝 Lambda関数実装詳細

### 1. generate-article Lambda

**ディレクトリ構成**
```
backend/functions/generate-article/
├── app.py              # メインハンドラー
├── requirements.txt    # 依存関係
├── prompt_builder.py   # プロンプト構築
├── validators.py       # 入力検証
└── utils.py           # ユーティリティ
```

**app.py**
```python
import json
import boto3
import anthropic
from datetime import datetime
from validators import validate_article_input
from prompt_builder import build_prompt
from utils import generate_article_id, log_error

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('blog-agent-articles')
claude_client = anthropic.Anthropic(
    api_key=os.environ['CLAUDE_API_KEY']
)

def lambda_handler(event, context):
    """記事生成Lambda関数"""
    try:
        # ユーザーID取得（Authorizerから）
        user_id = event['requestContext']['authorizer']['principalId']
        
        # リクエストボディ解析
        body = json.loads(event['body'])
        
        # 入力検証
        validation_error = validate_article_input(body)
        if validation_error:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'success': False,
                    'error': {
                        'code': 'VALIDATION_001',
                        'message': validation_error
                    }
                })
            }
        
        # Claude APIで記事生成
        start_time = datetime.now()
        
        message = claude_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            temperature=0.7,
            messages=[{
                "role": "user",
                "content": build_prompt(body)
            }]
        )
        
        generation_time = (datetime.now() - start_time).total_seconds()
        markdown_content = message.content[0].text
        
        # 記事ID生成
        article_id = generate_article_id()
        current_time = int(datetime.now().timestamp())
        
        # DynamoDBに保存
        article = {
            'userId': user_id,
            'articleId': article_id,
            'title': body['title'],
            'markdown': markdown_content,
            'status': 'draft',
            'createdAt': current_time,
            'updatedAt': current_time,
            'metadata': {
                'wordCount': len(markdown_content),
                'targetAudience': body.get('targetAudience', ''),
                'purpose': body.get('purpose', ''),
                'keywords': body.get('keywords', []),
                'generationTime': generation_time,
                'prompt': {
                    'model': 'claude-sonnet-4-20250514',
                    'temperature': 0.7
                }
            }
        }
        
        table.put_item(Item=article)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': True,
                'data': {
                    'articleId': article_id,
                    'markdown': markdown_content,
                    'metadata': {
                        'wordCount': article['metadata']['wordCount'],
                        'generationTime': generation_time
                    }
                }
            })
        }
        
    except anthropic.APIError as e:
        log_error('Claude API Error', str(e))
        return {
            'statusCode': 503,
            'body': json.dumps({
                'success': False,
                'error': {
                    'code': 'CLAUDE_001',
                    'message': 'Claude APIでエラーが発生しました'
                }
            })
        }
    
    except Exception as e:
        log_error('Unexpected Error', str(e))
        return {
            'statusCode': 500,
            'body': json.dumps({
                'success': False,
                'error': {
                    'code': 'SERVER_001',
                    'message': 'サーバーエラーが発生しました'
                }
            })
        }
```

**validators.py**
```python
def validate_article_input(body):
    """入力検証"""
    # 必須フィールド
    if not body.get('title'):
        return 'タイトルは必須です'
    
    if not body.get('contentPoints'):
        return '本文の要点は必須です'
    
    # 文字数制限
    if len(body['title']) > 100:
        return 'タイトルは100文字以内にしてください'
    
    if len(body.get('contentPoints', '')) > 2000:
        return '本文の要点は2000文字以内にしてください'
    
    # キーワード数制限
    keywords = body.get('keywords', [])
    if len(keywords) > 10:
        return 'キーワードは10個以内にしてください'
    
    return None
```

**prompt_builder.py**
```python
def build_prompt(body):
    """プロンプト構築"""
    prompt = f"""あなたはブログ記事生成の専門家です。以下の情報をもとに、読みやすく魅力的な記事を生成してください。

## 記事情報
- タイトル: {body['title']}
- 対象読者: {body.get('targetAudience', '一般')}
- 記事の目的: {body.get('purpose', '情報提供')}
- キーワード: {', '.join(body.get('keywords', []))}

## 内容要件
{body['contentPoints']}

## 装飾ルール
記事には以下の独自タグを使用してください：

### ボックス装飾
:::box type="info"
ここに内容
:::

type: info, warning, success, error

### 吹き出し装飾
:::balloon position="left" icon="😊"
ここに内容
:::

position: left, right

## 出力形式
- Markdown形式で出力
- 見出しはh2(##)から開始
- 適切な箇所に装飾タグを挿入
- 読みやすさを重視

## 制約
- 文字数: {body.get('wordCount', 1500)}文字程度
- 見出し数: 3〜5個
- 装飾: 最低2箇所使用
"""
    return prompt
```

---

### 2. manage-articles Lambda

**app.py**
```python
import json
import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('blog-agent-articles')

def lambda_handler(event, context):
    """記事管理Lambda関数"""
    user_id = event['requestContext']['authorizer']['principalId']
    http_method = event['httpMethod']
    path_parameters = event.get('pathParameters', {})
    
    if http_method == 'GET' and not path_parameters:
        # 記事一覧取得
        return get_articles_list(user_id, event.get('queryStringParameters', {}))
    
    elif http_method == 'GET' and path_parameters:
        # 記事詳細取得
        return get_article(user_id, path_parameters['articleId'])
    
    elif http_method == 'PUT':
        # 記事更新
        return update_article(user_id, path_parameters['articleId'], json.loads(event['body']))
    
    elif http_method == 'DELETE':
        # 記事削除
        return delete_article(user_id, path_parameters['articleId'])
    
    return {
        'statusCode': 405,
        'body': json.dumps({'error': 'Method not allowed'})
    }

def get_articles_list(user_id, query_params):
    """記事一覧取得"""
    limit = int(query_params.get('limit', 20))
    offset = int(query_params.get('offset', 0))
    sort_by = query_params.get('sortBy', 'createdAt')
    order = query_params.get('order', 'desc')
    
    # CreatedAtIndexを使用してクエリ
    response = table.query(
        IndexName='CreatedAtIndex',
        KeyConditionExpression=Key('userId').eq(user_id),
        ScanIndexForward=(order == 'asc'),
        Limit=limit + offset
    )
    
    items = response['Items'][offset:offset+limit]
    
    # 軽量化（詳細情報は除外）
    articles = [{
        'articleId': item['articleId'],
        'title': item['title'],
        'status': item['status'],
        'wordCount': item['metadata']['wordCount'],
        'createdAt': item['createdAt'],
        'updatedAt': item['updatedAt']
    } for item in items]
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'success': True,
            'data': {
                'articles': articles,
                'pagination': {
                    'total': response.get('Count', 0),
                    'limit': limit,
                    'offset': offset,
                    'hasMore': response.get('LastEvaluatedKey') is not None
                }
            }
        })
    }

def get_article(user_id, article_id):
    """記事詳細取得"""
    response = table.get_item(
        Key={
            'userId': user_id,
            'articleId': article_id
        }
    )
    
    if 'Item' not in response:
        return {
            'statusCode': 404,
            'body': json.dumps({
                'success': False,
                'error': {
                    'code': 'ARTICLE_001',
                    'message': '記事が見つかりません'
                }
            })
        }
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'success': True,
            'data': response['Item']
        })
    }

def update_article(user_id, article_id, update_data):
    """記事更新"""
    update_expression = "SET "
    expression_values = {}
    expression_names = {}
    
    if 'title' in update_data:
        update_expression += "#title = :title, "
        expression_names['#title'] = 'title'
        expression_values[':title'] = update_data['title']
    
    if 'markdown' in update_data:
        update_expression += "markdown = :markdown, "
        expression_values[':markdown'] = update_data['markdown']
    
    if 'status' in update_data:
        update_expression += "#status = :status, "
        expression_names['#status'] = 'status'
        expression_values[':status'] = update_data['status']
    
    # 更新日時を追加
    update_expression += "updatedAt = :updatedAt"
    expression_values[':updatedAt'] = int(datetime.now().timestamp())
    
    response = table.update_item(
        Key={
            'userId': user_id,
            'articleId': article_id
        },
        UpdateExpression=update_expression,
        ExpressionAttributeNames=expression_names if expression_names else None,
        ExpressionAttributeValues=expression_values,
        ReturnValues='ALL_NEW'
    )
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'success': True,
            'data': {
                'articleId': article_id,
                'updatedAt': response['Attributes']['updatedAt']
            }
        })
    }

def delete_article(user_id, article_id):
    """記事削除"""
    table.delete_item(
        Key={
            'userId': user_id,
            'articleId': article_id
        }
    )
    
    return {
        'statusCode': 204,
        'body': ''
    }
```

---

### 3. authorizer Lambda

**app.py**
```python
import jwt
import os
from jwt import PyJWKClient

COGNITO_REGION = os.environ['COGNITO_REGION']
USER_POOL_ID = os.environ['COGNITO_USER_POOL_ID']
JWKS_URL = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json"

def lambda_handler(event, context):
    """Lambda Authorizer"""
    try:
        # トークン取得
        token = event['authorizationToken'].replace('Bearer ', '')
        
        # JWT検証
        jwks_client = PyJWKClient(JWKS_URL)
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        
        decoded = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=os.environ.get('COGNITO_CLIENT_ID'),
            options={"verify_exp": True}
        )
        
        # ポリシー生成
        return generate_policy(decoded['sub'], 'Allow', event['methodArn'])
        
    except jwt.ExpiredSignatureError:
        return generate_policy('user', 'Deny', event['methodArn'])
    
    except Exception as e:
        print(f"Authorization failed: {str(e)}")
        return generate_policy('user', 'Deny', event['methodArn'])

def generate_policy(principal_id, effect, resource):
    """IAMポリシー生成"""
    policy = {
        'principalId': principal_id,
        'policyDocument': {
            'Version': '2012-10-17',
            'Statement': [{
                'Action': 'execute-api:Invoke',
                'Effect': effect,
                'Resource': resource
            }]
        }
    }
    
    # コンテキスト追加（後続Lambda で使用可能）
    policy['context'] = {
        'userId': principal_id
    }
    
    return policy
```

---

## 🔐 セキュリティ実装

### 入力サニタイゼーション

```python
import bleach

def sanitize_input(text):
    """HTMLタグを除去"""
    return bleach.clean(text, strip=True)

def sanitize_markdown(markdown):
    """危険なMarkdownを除去"""
    # スクリプトタグを削除
    markdown = re.sub(r'<script.*?>.*?</script>', '', markdown, flags=re.DOTALL)
    # iframeを削除
    markdown = re.sub(r'<iframe.*?>.*?</iframe>', '', markdown, flags=re.DOTALL)
    return markdown
```

### レート制限

```python
import redis

redis_client = redis.Redis(host=os.environ['REDIS_HOST'])

def check_rate_limit(user_id, limit=10, window=60):
    """レート制限チェック"""
    key = f"rate_limit:{user_id}"
    current = redis_client.incr(key)
    
    if current == 1:
        redis_client.expire(key, window)
    
    if current > limit:
        raise RateLimitExceeded(f"制限: {limit}回/{window}秒")
    
    return current
```

---

## 📊 ログ・モニタリング

### ログ実装

```python
import logging
import json

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def log_info(message, **kwargs):
    """情報ログ"""
    logger.info(json.dumps({
        'level': 'INFO',
        'message': message,
        **kwargs
    }))

def log_error(message, error, **kwargs):
    """エラーログ"""
    logger.error(json.dumps({
        'level': 'ERROR',
        'message': message,
        'error': str(error),
        **kwargs
    }))
```

### CloudWatch メトリクス

```python
import boto3

cloudwatch = boto3.client('cloudwatch')

def put_metric(metric_name, value, unit='Count'):
    """カスタムメトリクス送信"""
    cloudwatch.put_metric_data(
        Namespace='BlogAgent',
        MetricData=[{
            'MetricName': metric_name,
            'Value': value,
            'Unit': unit,
            'Timestamp': datetime.now()
        }]
    )
```

---

## 🔗 関連ドキュメント

- **02_architecture.md** - Lambda構成
- **04_api_specification.md** - API仕様
- **03_database_schema.md** - データアクセス
- **09_testing_strategy.md** - バックエンドテスト

---

**最終更新**: 2024-12-03  
**レビュー者**: れんじろう  
**次回レビュー**: Phase 3完了時
