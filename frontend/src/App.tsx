import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { LoginPage, RegisterPage, ConfirmPage, ForgotPasswordPage } from './pages/auth';
import { ArticleSettingsPage } from './pages/settings';
import { GeneratePage } from './pages/generate';
import { EditorPage } from './pages/editor';
import { ArticlesPage } from './pages/articles';
import { HomePage } from './pages/home';
import { UpgradePage } from './pages/upgrade';
import { AccountSettingsPage } from './pages/account';
import { MainLayout } from './components/layout';
import { ToastProvider } from './components/ui';

// 保護されたページをレイアウトでラップするコンポーネント
const ProtectedWithLayout = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <MainLayout>{children}</MainLayout>
  </ProtectedRoute>
);

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
          <ProtectedWithLayout>
            <HomePage />
          </ProtectedWithLayout>
        }
      />
      <Route
        path="/generate"
        element={
          <ProtectedWithLayout>
            <GeneratePage />
          </ProtectedWithLayout>
        }
      />
      <Route
        path="/articles"
        element={
          <ProtectedWithLayout>
            <ArticlesPage />
          </ProtectedWithLayout>
        }
      />
      <Route
        path="/editor"
        element={
          <ProtectedWithLayout>
            <EditorPage />
          </ProtectedWithLayout>
        }
      />
      <Route
        path="/article-settings"
        element={
          <ProtectedWithLayout>
            <ArticleSettingsPage />
          </ProtectedWithLayout>
        }
      />
      <Route
        path="/account-settings"
        element={
          <ProtectedWithLayout>
            <AccountSettingsPage />
          </ProtectedWithLayout>
        }
      />
      <Route
        path="/upgrade"
        element={
          <ProtectedWithLayout>
            <UpgradePage />
          </ProtectedWithLayout>
        }
      />
      {/* 後方互換性のため */}
      <Route
        path="/settings"
        element={
          <ProtectedWithLayout>
            <ArticleSettingsPage />
          </ProtectedWithLayout>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
