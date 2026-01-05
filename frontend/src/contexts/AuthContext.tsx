import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  signIn as cognitoSignIn,
  signUp as cognitoSignUp,
  signOut as cognitoSignOut,
  confirmSignUp as cognitoConfirmSignUp,
  resendConfirmationCode as cognitoResendCode,
  getCurrentUser,
  type UserInfo,
} from '../services/cognito';

interface AuthState {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signOut: () => void;
  confirmSignUp: (email: string, code: string) => Promise<{ success: boolean; message?: string }>;
  resendConfirmationCode: (email: string) => Promise<{ success: boolean; message?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // 認証状態を確認
  const checkAuth = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      setState({
        user,
        isAuthenticated: !!user,
        isLoading: false,
      });
    } catch {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // サインイン
  const signIn = async (email: string, password: string) => {
    const result = await cognitoSignIn(email, password);
    if (result.success) {
      await checkAuth();
    }
    return { success: result.success, message: result.message };
  };

  // サインアップ
  const signUp = async (email: string, password: string) => {
    const result = await cognitoSignUp(email, password);
    return { success: result.success, message: result.message };
  };

  // サインアウト
  const signOut = () => {
    cognitoSignOut();
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  // メール確認
  const confirmSignUp = async (email: string, code: string) => {
    const result = await cognitoConfirmSignUp(email, code);
    return { success: result.success, message: result.message };
  };

  // 確認コード再送信
  const resendConfirmationCode = async (email: string) => {
    const result = await cognitoResendCode(email);
    return { success: result.success, message: result.message };
  };

  // ユーザー情報を再取得
  const refreshUser = async () => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        signOut,
        confirmSignUp,
        resendConfirmationCode,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// カスタムフック
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
