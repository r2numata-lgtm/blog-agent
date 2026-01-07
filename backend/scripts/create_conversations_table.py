"""
会話履歴テーブル作成スクリプト
Phase 3: チャット修正の実装
"""

import boto3
import sys
from botocore.exceptions import ClientError


def create_conversations_table(region: str = 'ap-northeast-1'):
    """
    blog-agent-conversations テーブルを作成

    Args:
        region: AWSリージョン
    """
    dynamodb = boto3.client('dynamodb', region_name=region)

    table_name = 'blog-agent-conversations'

    # テーブル定義
    table_definition = {
        'TableName': table_name,
        'KeySchema': [
            {
                'AttributeName': 'userId',
                'KeyType': 'HASH'  # パーティションキー
            },
            {
                'AttributeName': 'articleId',
                'KeyType': 'RANGE'  # ソートキー
            }
        ],
        'AttributeDefinitions': [
            {
                'AttributeName': 'userId',
                'AttributeType': 'S'
            },
            {
                'AttributeName': 'articleId',
                'AttributeType': 'S'
            },
            {
                'AttributeName': 'updatedAt',
                'AttributeType': 'N'
            }
        ],
        'GlobalSecondaryIndexes': [
            {
                'IndexName': 'UpdatedAtIndex',
                'KeySchema': [
                    {
                        'AttributeName': 'userId',
                        'KeyType': 'HASH'
                    },
                    {
                        'AttributeName': 'updatedAt',
                        'KeyType': 'RANGE'
                    }
                ],
                'Projection': {
                    'ProjectionType': 'ALL'
                }
            }
        ],
        'BillingMode': 'PAY_PER_REQUEST',
        'Tags': [
            {
                'Key': 'Project',
                'Value': 'blog-agent'
            },
            {
                'Key': 'Phase',
                'Value': '3'
            }
        ]
    }

    try:
        # テーブルが存在するか確認
        dynamodb.describe_table(TableName=table_name)
        print(f'テーブル {table_name} は既に存在します')
        return True
    except ClientError as e:
        if e.response['Error']['Code'] != 'ResourceNotFoundException':
            print(f'エラー: {e}')
            return False

    # テーブル作成
    try:
        response = dynamodb.create_table(**table_definition)
        print(f'テーブル {table_name} を作成中...')

        # テーブルがアクティブになるまで待機
        waiter = dynamodb.get_waiter('table_exists')
        waiter.wait(TableName=table_name)

        print(f'テーブル {table_name} が正常に作成されました')

        # ポイントインタイムリカバリを有効化
        dynamodb.update_continuous_backups(
            TableName=table_name,
            PointInTimeRecoverySpecification={
                'PointInTimeRecoveryEnabled': True
            }
        )
        print('ポイントインタイムリカバリを有効化しました')

        return True

    except ClientError as e:
        print(f'テーブル作成エラー: {e}')
        return False


def describe_table_schema():
    """
    テーブルスキーマの説明を出力
    """
    schema = """
=== blog-agent-conversations テーブルスキーマ ===

パーティションキー: userId (String)
  - ユーザーID（Cognito sub）

ソートキー: articleId (String)
  - 記事ID

属性:
  - conversationId: 会話ID (String)
  - messages: メッセージリスト (List)
    - messageId: メッセージID (String)
    - role: 'user' | 'assistant' (String)
    - content: メッセージ内容 (String)
    - timestamp: タイムスタンプ (Number)
    - action: アクション種別（assistant のみ）(String)
  - revisions: リビジョンリスト (List, 最大10件)
    - revisionId: リビジョンID (String)
    - timestamp: タイムスタンプ (Number)
    - instruction: 編集指示 (String)
    - action: アクション種別 (String)
    - explanation: 変更説明 (String)
    - originalContent: 変更前の内容 (String)
    - newContent: 変更後の内容 (String)
    - diff: 差分情報 (Map)
  - createdAt: 作成日時 (Number)
  - updatedAt: 更新日時 (Number)

GSI:
  - UpdatedAtIndex
    - パーティションキー: userId
    - ソートキー: updatedAt
    - 用途: ユーザーの会話を更新日時順に取得

アクセスパターン:
  1. 特定記事の会話履歴取得: userId + articleId
  2. ユーザーの最近の会話一覧: userId + UpdatedAtIndex（降順）
"""
    print(schema)


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--schema':
        describe_table_schema()
    else:
        success = create_conversations_table()
        if success:
            describe_table_schema()
        sys.exit(0 if success else 1)
