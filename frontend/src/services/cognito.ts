import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';

// Cognito設定
const poolData = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
};

const userPool = new CognitoUserPool(poolData);

export interface AuthResult {
  success: boolean;
  message?: string;
  session?: CognitoUserSession;
  user?: CognitoUser;
}

export interface UserInfo {
  email: string;
  sub: string;
}

// サインアップ（ユーザー登録）
export const signUp = (email: string, password: string): Promise<AuthResult> => {
  return new Promise((resolve) => {
    const attributeList = [
      new CognitoUserAttribute({
        Name: 'email',
        Value: email,
      }),
    ];

    userPool.signUp(email, password, attributeList, [], (err, result) => {
      if (err) {
        resolve({
          success: false,
          message: getErrorMessage(err),
        });
        return;
      }
      resolve({
        success: true,
        message: '確認コードをメールに送信しました',
        user: result?.user,
      });
    });
  });
};

// メール確認コードの検証
export const confirmSignUp = (email: string, code: string): Promise<AuthResult> => {
  return new Promise((resolve) => {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.confirmRegistration(code, true, (err) => {
      if (err) {
        resolve({
          success: false,
          message: getErrorMessage(err),
        });
        return;
      }
      resolve({
        success: true,
        message: 'メールアドレスが確認されました',
      });
    });
  });
};

// 確認コードの再送信
export const resendConfirmationCode = (email: string): Promise<AuthResult> => {
  return new Promise((resolve) => {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.resendConfirmationCode((err) => {
      if (err) {
        resolve({
          success: false,
          message: getErrorMessage(err),
        });
        return;
      }
      resolve({
        success: true,
        message: '確認コードを再送信しました',
      });
    });
  });
};

// サインイン（ログイン）
export const signIn = (email: string, password: string): Promise<AuthResult> => {
  return new Promise((resolve) => {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    const authenticationDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (session) => {
        resolve({
          success: true,
          session,
          user: cognitoUser,
        });
      },
      onFailure: (err) => {
        resolve({
          success: false,
          message: getErrorMessage(err),
        });
      },
    });
  });
};

// サインアウト（ログアウト）
export const signOut = (): void => {
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) {
    cognitoUser.signOut();
  }
};

// 現在のユーザーセッションを取得
export const getCurrentSession = (): Promise<CognitoUserSession | null> => {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
      resolve(null);
      return;
    }

    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }
      resolve(session);
    });
  });
};

// 現在のユーザー情報を取得
export const getCurrentUser = (): Promise<UserInfo | null> => {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
      resolve(null);
      return;
    }

    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }

      cognitoUser.getUserAttributes((attrErr, attributes) => {
        if (attrErr || !attributes) {
          resolve(null);
          return;
        }

        const email = attributes.find((attr) => attr.Name === 'email')?.Value || '';
        const sub = attributes.find((attr) => attr.Name === 'sub')?.Value || '';

        resolve({ email, sub });
      });
    });
  });
};

// アクセストークンを取得
export const getAccessToken = async (): Promise<string | null> => {
  const session = await getCurrentSession();
  return session?.getAccessToken().getJwtToken() || null;
};

// IDトークンを取得
export const getIdToken = async (): Promise<string | null> => {
  const session = await getCurrentSession();
  return session?.getIdToken().getJwtToken() || null;
};

// トークンをリフレッシュ
export const refreshSession = (): Promise<CognitoUserSession | null> => {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
      resolve(null);
      return;
    }

    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session) {
        resolve(null);
        return;
      }

      const refreshToken = session.getRefreshToken();
      cognitoUser.refreshSession(refreshToken, (refreshErr, newSession) => {
        if (refreshErr || !newSession) {
          resolve(null);
          return;
        }
        resolve(newSession);
      });
    });
  });
};

// トークンの有効期限を確認（5分以内に期限切れならtrue）
export const isTokenExpiringSoon = async (thresholdMinutes = 5): Promise<boolean> => {
  const session = await getCurrentSession();
  if (!session) return true;

  const accessToken = session.getAccessToken();
  const expiration = accessToken.getExpiration();
  const now = Math.floor(Date.now() / 1000);
  const thresholdSeconds = thresholdMinutes * 60;

  return expiration - now < thresholdSeconds;
};

// 有効なアクセストークンを取得（必要に応じてリフレッシュ）
export const getValidAccessToken = async (): Promise<string | null> => {
  const expiringSoon = await isTokenExpiringSoon();

  if (expiringSoon) {
    const newSession = await refreshSession();
    if (newSession) {
      return newSession.getAccessToken().getJwtToken();
    }
    return null;
  }

  return getAccessToken();
};

// 有効なIDトークンを取得（必要に応じてリフレッシュ）
export const getValidIdToken = async (): Promise<string | null> => {
  const expiringSoon = await isTokenExpiringSoon();

  if (expiringSoon) {
    const newSession = await refreshSession();
    if (newSession) {
      return newSession.getIdToken().getJwtToken();
    }
    return null;
  }

  return getIdToken();
};

// パスワードリセットを開始（確認コードをメールに送信）
export const forgotPassword = (email: string): Promise<AuthResult> => {
  return new Promise((resolve) => {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.forgotPassword({
      onSuccess: () => {
        resolve({
          success: true,
          message: 'パスワードリセットコードをメールに送信しました',
        });
      },
      onFailure: (err) => {
        resolve({
          success: false,
          message: getErrorMessage(err),
        });
      },
    });
  });
};

// 新しいパスワードを設定（確認コードを使用）
export const confirmForgotPassword = (
  email: string,
  code: string,
  newPassword: string
): Promise<AuthResult> => {
  return new Promise((resolve) => {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.confirmPassword(code, newPassword, {
      onSuccess: () => {
        resolve({
          success: true,
          message: 'パスワードが正常にリセットされました',
        });
      },
      onFailure: (err) => {
        resolve({
          success: false,
          message: getErrorMessage(err),
        });
      },
    });
  });
};

// パスワード変更（ログイン中のユーザー）
export const changePassword = (
  oldPassword: string,
  newPassword: string
): Promise<AuthResult> => {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
      resolve({
        success: false,
        message: 'ログインが必要です',
      });
      return;
    }

    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve({
          success: false,
          message: 'セッションが無効です',
        });
        return;
      }

      cognitoUser.changePassword(oldPassword, newPassword, (changeErr) => {
        if (changeErr) {
          resolve({
            success: false,
            message: getErrorMessage(changeErr),
          });
          return;
        }
        resolve({
          success: true,
          message: 'パスワードが正常に変更されました',
        });
      });
    });
  });
};

// エラーメッセージの変換
const getErrorMessage = (err: Error & { code?: string }): string => {
  switch (err.code) {
    case 'UsernameExistsException':
      return 'このメールアドレスは既に登録されています';
    case 'InvalidPasswordException':
      return 'パスワードは8文字以上で、大文字・小文字・数字を含む必要があります';
    case 'CodeMismatchException':
      return '確認コードが正しくありません';
    case 'ExpiredCodeException':
      return '確認コードの有効期限が切れています。再送信してください';
    case 'UserNotFoundException':
      return 'ユーザーが見つかりません';
    case 'NotAuthorizedException':
      return 'メールアドレスまたはパスワードが正しくありません';
    case 'UserNotConfirmedException':
      return 'メールアドレスの確認が完了していません';
    case 'LimitExceededException':
      return 'リクエスト回数が多すぎます。しばらくしてからお試しください';
    default:
      return err.message || '予期しないエラーが発生しました';
  }
};
