import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { LoginPage, RegisterPage, ConfirmPage, ForgotPasswordPage } from './pages/auth';
import GutenbergTest from './components/GutenbergTest';

// ダッシュボード（認証後のホーム画面）
const Dashboard = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm p-4 mb-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex gap-4">
            <Link
              to="/"
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              ホーム
            </Link>
            <Link
              to="/gutenberg-test"
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              Gutenberg検証
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={signOut}
              className="text-sm text-red-600 hover:text-red-800"
            >
              ログアウト
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-4">Blog Agent</h1>
        <p className="text-gray-600 mb-6">
          ブログ記事生成エージェント - Phase 1
        </p>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">ようこそ！</h2>
          <p className="text-gray-600 mb-4">
            ログインに成功しました。これから記事生成機能を追加していきます。
          </p>
          <Link
            to="/gutenberg-test"
            className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Gutenberg検証ページへ
          </Link>
        </div>
      </div>
    </div>
  );
};

// メインのApp Router
const AppRouter = () => {
  return (
    <Routes>
      {/* 認証関連ルート */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/confirm" element={<ConfirmPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* 保護されたルート */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/gutenberg-test"
        element={
          <ProtectedRoute>
            <GutenbergTest />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
