import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export const AccountSettingsPage = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [email, setEmail] = useState(user?.email || '');
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: API呼び出し
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setIsEditing(false);
    alert('設定を保存しました');
  };

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          アカウント設定
        </h1>
        <p className="text-gray-600 mb-8">
          アカウント情報の確認と変更ができます
        </p>

        {/* プロフィール */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">プロフィール</h2>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {isEditing ? 'キャンセル' : '編集'}
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{user?.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                表示名
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="表示名を入力"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{name || '未設定'}</p>
              )}
            </div>

            {isEditing && (
              <div className="pt-4">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? '保存中...' : '保存'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* パスワード変更 */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            パスワード変更
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            パスワードを変更する場合は、下のボタンをクリックしてください。
          </p>
          <button
            onClick={() => alert('パスワード変更機能は準備中です')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            パスワードを変更
          </button>
        </div>

        {/* 通知設定 */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            通知設定
          </h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-gray-700">メール通知</span>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-gray-700">お知らせメール</span>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        {/* 危険な操作 */}
        <div className="bg-white rounded-xl p-6 border border-red-200 mb-6">
          <h2 className="text-xl font-semibold text-red-600 mb-4">
            危険な操作
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            アカウントを削除すると、すべてのデータが完全に削除されます。この操作は取り消せません。
          </p>
          <button
            onClick={() => {
              if (confirm('本当にアカウントを削除しますか？この操作は取り消せません。')) {
                alert('アカウント削除機能は準備中です');
              }
            }}
            className="px-6 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            アカウントを削除
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountSettingsPage;
