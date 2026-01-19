/**
 * LoginPage - ログインページ
 * P6-01〜03: UI改善版
 */
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Alert } from '../../components/ui';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await signIn(email, password);
    setIsLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      if (result.message?.includes('確認が完了していません')) {
        navigate('/confirm', { state: { email } });
      } else {
        setError(getErrorMessage(result.message || ''));
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* ロゴ・タイトル */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white mb-4 shadow-lg">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Blog Agent</h1>
          <p className="mt-2 text-gray-600">AIでブログ記事を簡単作成</p>
        </div>

        {/* ログインカード */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-6">
            ログイン
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert type="error" onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            <Input
              label="メールアドレス"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              leftIcon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              }
            />

            <Input
              label="パスワード"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
            />

            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                パスワードをお忘れですか？
              </Link>
            </div>

            <Button type="submit" isLoading={isLoading} fullWidth size="lg">
              ログイン
            </Button>
          </form>

          {/* 区切り線 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">または</span>
            </div>
          </div>

          {/* 新規登録リンク */}
          <p className="text-center text-gray-600">
            アカウントをお持ちでない方は{' '}
            <Link
              to="/register"
              className="font-semibold text-blue-600 hover:text-blue-800"
            >
              新規登録
            </Link>
          </p>
        </div>

        {/* フッター */}
        <p className="mt-6 text-center text-sm text-gray-500">
          ログインすることで、
          <a href="#" className="text-blue-600 hover:underline">利用規約</a>
          と
          <a href="#" className="text-blue-600 hover:underline">プライバシーポリシー</a>
          に同意したものとみなされます。
        </p>
      </div>
    </div>
  );
};

/**
 * エラーメッセージを分かりやすく変換
 */
function getErrorMessage(message: string): string {
  if (message.includes('Incorrect username or password')) {
    return 'メールアドレスまたはパスワードが正しくありません。';
  }
  if (message.includes('User does not exist')) {
    return 'このメールアドレスは登録されていません。';
  }
  if (message.includes('Password attempts exceeded')) {
    return 'ログイン試行回数が上限に達しました。しばらくしてからお試しください。';
  }
  if (message.includes('User is not confirmed')) {
    return 'メールアドレスの確認が完了していません。';
  }
  if (message.includes('Network')) {
    return 'ネットワークエラーが発生しました。接続を確認してください。';
  }
  return message || 'ログインに失敗しました。もう一度お試しください。';
}

export default LoginPage;
