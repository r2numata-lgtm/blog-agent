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
