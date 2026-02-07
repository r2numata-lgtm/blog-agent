import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import ProtectedRoute from './components/ProtectedRoute';
import SubscriptionGuard from './components/SubscriptionGuard';
import { LoginPage, RegisterPage, ConfirmPage, ForgotPasswordPage } from './pages/auth';
import { ArticleSettingsPage } from './pages/settings';
import { GeneratePage } from './pages/generate';
import { EditorPage } from './pages/editor';
import { ArticlesPage } from './pages/articles';
import { HomePage } from './pages/home';
import { AccountSettingsPage } from './pages/account';
import { SuccessPage, SettingsPage as SubscriptionSettingsPage } from './pages/subscription';
import { OnboardingPlanPage } from './pages/onboarding';
import { MainLayout } from './components/layout';
import { ToastProvider } from './components/ui';

// 完全保護されたページ（認証 + サブスクリプション必須）
const FullyProtected = ({ children }: { children: React.ReactNode }) => (
  <SubscriptionGuard>
    <MainLayout>{children}</MainLayout>
  </SubscriptionGuard>
);

// メインのApp Router
const AppRouter = () => {
  return (
    <Routes>
      {/* 公開ルート */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/confirm" element={<ConfirmPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* オンボーディングルート（認証のみ、サブスク不要） */}
      <Route
        path="/onboarding/plan"
        element={
          <ProtectedRoute>
            <OnboardingPlanPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/onboarding/success"
        element={
          <ProtectedRoute>
            <SuccessPage />
          </ProtectedRoute>
        }
      />

      {/* 完全保護ルート（認証 + サブスクリプション必須） */}
      <Route
        path="/"
        element={
          <FullyProtected>
            <HomePage />
          </FullyProtected>
        }
      />
      <Route
        path="/generate"
        element={
          <FullyProtected>
            <GeneratePage />
          </FullyProtected>
        }
      />
      <Route
        path="/articles"
        element={
          <FullyProtected>
            <ArticlesPage />
          </FullyProtected>
        }
      />
      <Route
        path="/editor"
        element={
          <FullyProtected>
            <EditorPage />
          </FullyProtected>
        }
      />
      <Route
        path="/article-settings"
        element={
          <FullyProtected>
            <ArticleSettingsPage />
          </FullyProtected>
        }
      />
      <Route
        path="/account-settings"
        element={
          <FullyProtected>
            <AccountSettingsPage />
          </FullyProtected>
        }
      />
      <Route
        path="/subscription/settings"
        element={
          <FullyProtected>
            <SubscriptionSettingsPage />
          </FullyProtected>
        }
      />
      {/* 後方互換性のため */}
      <Route
        path="/settings"
        element={
          <FullyProtected>
            <ArticleSettingsPage />
          </FullyProtected>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SubscriptionProvider>
          <ToastProvider>
            <AppRouter />
          </ToastProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
