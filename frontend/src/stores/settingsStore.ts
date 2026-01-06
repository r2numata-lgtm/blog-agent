import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 記事スタイル設定の型
export interface ArticleStyleSettings {
  // テイスト
  taste: 'formal' | 'casual' | 'friendly' | 'professional';
  // 一人称
  firstPerson: 'watashi' | 'boku' | 'hissha';
  // 読者への呼びかけ
  readerAddress: 'anata' | 'minasan' | 'custom';
  readerAddressCustom?: string;
  // トーン
  tone: 'explanatory' | 'story' | 'qa';
  // 導入の書き方
  introStyle: 'problem' | 'empathy' | 'question';
}

// 装飾プリセット設定の型
export interface DecorationSettings {
  infoBox: boolean;
  warningBox: boolean;
  successBox: boolean;
  balloon: boolean;
  quote: boolean;
  table: boolean;
}

// SEO設定の型
export interface SeoSettings {
  metaDescriptionLength: number; // 120-160
  maxKeywords: number; // 5-10
}

// サンプル記事の型
export interface SampleArticle {
  id: string;
  title: string;
  content: string;
  format: 'html' | 'markdown';
  createdAt: string;
}

// 全設定の型
export interface UserSettings {
  articleStyle: ArticleStyleSettings;
  decorations: DecorationSettings;
  seo: SeoSettings;
  sampleArticles: SampleArticle[];
  lastUpdated: string | null;
}

// デフォルト設定
const defaultSettings: UserSettings = {
  articleStyle: {
    taste: 'friendly',
    firstPerson: 'watashi',
    readerAddress: 'minasan',
    tone: 'explanatory',
    introStyle: 'problem',
  },
  decorations: {
    infoBox: true,
    warningBox: true,
    successBox: true,
    balloon: false,
    quote: true,
    table: true,
  },
  seo: {
    metaDescriptionLength: 140,
    maxKeywords: 7,
  },
  sampleArticles: [],
  lastUpdated: null,
};

// Storeの型
interface SettingsStore {
  settings: UserSettings;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Actions
  updateArticleStyle: (style: Partial<ArticleStyleSettings>) => void;
  updateDecorations: (decorations: Partial<DecorationSettings>) => void;
  updateSeo: (seo: Partial<SeoSettings>) => void;
  addSampleArticle: (article: Omit<SampleArticle, 'id' | 'createdAt'>) => boolean;
  removeSampleArticle: (id: string) => void;
  resetToDefaults: () => void;
  setSettings: (settings: UserSettings) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      isLoading: false,
      isSaving: false,
      error: null,

      updateArticleStyle: (style) =>
        set((state) => ({
          settings: {
            ...state.settings,
            articleStyle: { ...state.settings.articleStyle, ...style },
            lastUpdated: new Date().toISOString(),
          },
        })),

      updateDecorations: (decorations) =>
        set((state) => ({
          settings: {
            ...state.settings,
            decorations: { ...state.settings.decorations, ...decorations },
            lastUpdated: new Date().toISOString(),
          },
        })),

      updateSeo: (seo) =>
        set((state) => ({
          settings: {
            ...state.settings,
            seo: { ...state.settings.seo, ...seo },
            lastUpdated: new Date().toISOString(),
          },
        })),

      addSampleArticle: (article) => {
        let added = false;
        set((state) => {
          if (state.settings.sampleArticles.length >= 3) {
            return state;
          }
          added = true;
          return {
            settings: {
              ...state.settings,
              sampleArticles: [
                ...state.settings.sampleArticles,
                {
                  ...article,
                  id: crypto.randomUUID(),
                  createdAt: new Date().toISOString(),
                },
              ],
              lastUpdated: new Date().toISOString(),
            },
          };
        });
        return added;
      },

      removeSampleArticle: (id) =>
        set((state) => ({
          settings: {
            ...state.settings,
            sampleArticles: state.settings.sampleArticles.filter((a) => a.id !== id),
            lastUpdated: new Date().toISOString(),
          },
        })),

      resetToDefaults: () =>
        set({
          settings: { ...defaultSettings, lastUpdated: new Date().toISOString() },
        }),

      setSettings: (settings) => set({ settings }),
      setLoading: (isLoading) => set({ isLoading }),
      setSaving: (isSaving) => set({ isSaving }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'blog-agent-settings',
    }
  )
);

// ラベルマッピング
export const tasteLabels: Record<ArticleStyleSettings['taste'], string> = {
  formal: 'フォーマル',
  casual: 'カジュアル',
  friendly: '親しみやすい',
  professional: '専門的',
};

export const firstPersonLabels: Record<ArticleStyleSettings['firstPerson'], string> = {
  watashi: '私',
  boku: '僕',
  hissha: '筆者',
};

export const readerAddressLabels: Record<ArticleStyleSettings['readerAddress'], string> = {
  anata: 'あなた',
  minasan: '皆さん',
  custom: 'カスタム',
};

export const toneLabels: Record<ArticleStyleSettings['tone'], string> = {
  explanatory: '説明的',
  story: 'ストーリー形式',
  qa: 'Q&A形式',
};

export const introStyleLabels: Record<ArticleStyleSettings['introStyle'], string> = {
  problem: '問題提起',
  empathy: '共感',
  question: '質問形式',
};

export const decorationLabels: Record<keyof DecorationSettings, string> = {
  infoBox: '情報ボックス',
  warningBox: '警告ボックス',
  successBox: '成功ボックス',
  balloon: '吹き出し',
  quote: '引用',
  table: '表',
};
