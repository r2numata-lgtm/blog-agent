/**
 * 記事生成APIサービス
 * Phase 2: P2-10〜P2-13 フロントエンド実装
 */

import api from './api';

/**
 * 内部リンクの型
 */
export interface InternalLink {
  url: string;
  title: string;
  description?: string;
}

/**
 * 記事生成リクエストの型
 */
export interface GenerateArticleRequest {
  title: string;
  targetAudience?: string;
  purpose?: string;
  keywords?: string[];
  contentPoints: string;
  wordCount?: number;
  articleType?: 'info' | 'howto' | 'review';
  internalLinks?: InternalLink[];
}

/**
 * 構造検証結果の型
 */
export interface StructureValidation {
  valid: boolean;
  issues: string[];
  headingCount: number;
  h2Count: number;
}

/**
 * 記事生成レスポンスの型
 */
export interface GenerateArticleResponse {
  articleId: string;
  title: string;
  markdown: string;
  metadata: {
    wordCount: number;
    readingTime: number;
    generationTime: number;
    structureValidation: StructureValidation;
  };
}

/**
 * タイトル案の型
 */
export interface TitleSuggestion {
  title: string;
  reason: string;
}

/**
 * タイトル生成レスポンスの型
 */
export interface GenerateTitlesResponse {
  titles: TitleSuggestion[];
}

/**
 * タイトル生成リクエストの型
 */
export interface GenerateTitlesRequest {
  title?: string;
  targetAudience?: string;
  keywords?: string[];
  contentPoints: string;
}

/**
 * メタ情報生成レスポンスの型
 */
export interface GenerateMetaResponse {
  metaDescription: string;
  keywords: string[];
  suggestedSlug: string;
  estimatedReadingTime: number;
}

/**
 * 記事一覧の型
 */
export interface ArticleListItem {
  articleId: string;
  title: string;
  status: 'draft' | 'published';
  wordCount: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * 記事一覧レスポンスの型
 */
export interface ArticlesListResponse {
  articles: ArticleListItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * 記事詳細の型
 */
export interface ArticleDetail {
  articleId: string;
  title: string;
  markdown: string;
  status: 'draft' | 'published';
  createdAt: number;
  updatedAt: number;
  metadata: {
    wordCount: number;
    readingTime: number;
    targetAudience: string;
    purpose: string;
    keywords: string[];
    articleType: string;
    generationTime: number;
    structureValidation: StructureValidation;
  };
}

/**
 * 記事生成APIサービス
 */
export const articleApi = {
  /**
   * 記事を生成
   */
  async generate(request: GenerateArticleRequest): Promise<GenerateArticleResponse> {
    return api.post<GenerateArticleResponse>('/articles/generate', request);
  },

  /**
   * タイトル案を生成（3案）
   */
  async generateTitles(request: GenerateTitlesRequest): Promise<GenerateTitlesResponse> {
    return api.post<GenerateTitlesResponse>('/articles/generate/titles', request);
  },

  /**
   * メタ情報を生成
   */
  async generateMeta(markdown: string): Promise<GenerateMetaResponse> {
    return api.post<GenerateMetaResponse>('/articles/generate/meta', { markdown });
  },

  /**
   * 記事一覧を取得
   */
  async list(params?: {
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'updatedAt';
    order?: 'asc' | 'desc';
  }): Promise<ArticlesListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.offset) queryParams.append('offset', String(params.offset));
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.order) queryParams.append('order', params.order);

    const queryString = queryParams.toString();
    const url = queryString ? `/articles?${queryString}` : '/articles';
    return api.get<ArticlesListResponse>(url);
  },

  /**
   * 記事詳細を取得
   */
  async get(articleId: string): Promise<ArticleDetail> {
    return api.get<ArticleDetail>(`/articles/${articleId}`);
  },

  /**
   * 記事を更新
   */
  async update(
    articleId: string,
    data: Partial<{
      title: string;
      markdown: string;
      status: 'draft' | 'published';
    }>
  ): Promise<{ articleId: string; updatedAt: number }> {
    return api.put(`/articles/${articleId}`, data);
  },

  /**
   * 記事を削除
   */
  async delete(articleId: string): Promise<void> {
    await api.delete(`/articles/${articleId}`);
  },
};

export default articleApi;
