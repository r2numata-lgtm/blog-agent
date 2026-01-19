import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { getValidIdToken, signOut } from './cognito';

// API設定
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// APIレスポンスの型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

// エラー型
export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

// 認証付きAxiosインスタンスを作成
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 120000, // 記事生成に時間がかかるため2分に延長
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // リクエストインターセプター：認証トークンを自動付与
  client.interceptors.request.use(
    async (config) => {
      const token = await getValidIdToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // レスポンスインターセプター：エラーハンドリング
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiResponse<unknown>>) => {
      const status = error.response?.status || 500;
      const errorData = error.response?.data?.error;

      // 認証エラーの場合はサインアウト
      if (status === 401) {
        signOut();
        window.location.href = '/login';
        return Promise.reject(new ApiError('AUTH_001', '認証が必要です', status));
      }

      // 403 Forbidden
      if (status === 403) {
        return Promise.reject(new ApiError('AUTH_003', '権限がありません', status));
      }

      // APIエラーレスポンスがある場合
      if (errorData) {
        return Promise.reject(new ApiError(errorData.code, errorData.message, status));
      }

      // その他のエラー
      return Promise.reject(
        new ApiError('SERVER_001', error.message || 'サーバーエラーが発生しました', status)
      );
    }
  );

  return client;
};

// シングルトンインスタンス
let apiClient: AxiosInstance | null = null;

export const getApiClient = (): AxiosInstance => {
  if (!apiClient) {
    apiClient = createApiClient();
  }
  return apiClient;
};

// 便利なAPIメソッド
export const api = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await getApiClient().get<ApiResponse<T>>(url, config);
    if (!response.data.success) {
      throw new ApiError(
        response.data.error?.code || 'UNKNOWN',
        response.data.error?.message || 'エラーが発生しました',
        response.status
      );
    }
    return response.data.data as T;
  },

  post: async <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    const response = await getApiClient().post<ApiResponse<T>>(url, data, config);
    if (!response.data.success) {
      throw new ApiError(
        response.data.error?.code || 'UNKNOWN',
        response.data.error?.message || 'エラーが発生しました',
        response.status
      );
    }
    return response.data.data as T;
  },

  put: async <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    const response = await getApiClient().put<ApiResponse<T>>(url, data, config);
    if (!response.data.success) {
      throw new ApiError(
        response.data.error?.code || 'UNKNOWN',
        response.data.error?.message || 'エラーが発生しました',
        response.status
      );
    }
    return response.data.data as T;
  },

  delete: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await getApiClient().delete<ApiResponse<T>>(url, config);
    if (!response.data.success) {
      throw new ApiError(
        response.data.error?.code || 'UNKNOWN',
        response.data.error?.message || 'エラーが発生しました',
        response.status
      );
    }
    return response.data.data as T;
  },
};

export default api;
