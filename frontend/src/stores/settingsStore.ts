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

// 意味的ロールの型
export type SemanticRole = 'attention' | 'warning' | 'summarize' | 'explain' | 'action';

// 意味的ロールのラベル定義
export const SEMANTIC_ROLES: Record<SemanticRole, { label: string; description: string }> = {
  attention: { label: '注目', description: '重要なポイントを強調' },
  warning: { label: '警告', description: '注意点や警告' },
  summarize: { label: '要約', description: 'まとめや要点' },
  explain: { label: '説明', description: '詳しい説明' },
  action: { label: '行動', description: '次のステップやアクション' },
};

// 新スキーマ: roles対応の装飾設定
export interface DecorationWithRoles {
  id: string;
  label: string;
  roles: SemanticRole[];
  css: string;
  enabled: boolean;
}

// 旧スキーマ: 後方互換性のため保持
export interface DecorationSettingsLegacy {
  infoBox: boolean;
  warningBox: boolean;
  successBox: boolean;
  balloon: boolean;
  quote: boolean;
  table: boolean;
}

// 装飾設定の型（新旧両方に対応）
export type DecorationSettings = DecorationWithRoles[] | DecorationSettingsLegacy;

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
  baseClass?: string;
  seo: SeoSettings;
  sampleArticles: SampleArticle[];
  lastUpdated: string | null;
}

// デフォルト装飾設定（新スキーマ）
export const DEFAULT_DECORATIONS: DecorationWithRoles[] = [
  {
    id: 'ba-highlight',
    label: 'ハイライト',
    roles: ['attention'],
    css: '.ba-highlight { background: linear-gradient(transparent 60%, #fff59d 60%); padding: 0 4px; font-weight: 600; }',
    enabled: true,
  },
  {
    id: 'ba-point',
    label: 'ポイント',
    roles: ['attention', 'explain'],
    css: '.ba-point { background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0; } .ba-point::before { content: "ポイント"; display: block; font-weight: 700; color: #1976d2; margin-bottom: 8px; font-size: 14px; }',
    enabled: true,
  },
  {
    id: 'ba-warning',
    label: '警告',
    roles: ['warning'],
    css: '.ba-warning { background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0; } .ba-warning::before { content: "注意"; display: block; font-weight: 700; color: #e65100; margin-bottom: 8px; font-size: 14px; }',
    enabled: true,
  },
  {
    id: 'ba-success',
    label: '成功',
    roles: ['action'],
    css: '.ba-success { background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0; } .ba-success::before { content: "成功"; display: block; font-weight: 700; color: #2e7d32; margin-bottom: 8px; font-size: 14px; }',
    enabled: true,
  },
  {
    id: 'ba-quote',
    label: '引用',
    roles: ['explain'],
    css: '.ba-quote { background-color: #f5f5f5; border-left: 4px solid #9e9e9e; padding: 16px 20px; margin: 24px 0; font-style: italic; color: #616161; border-radius: 0 8px 8px 0; }',
    enabled: true,
  },
  {
    id: 'ba-summary',
    label: 'まとめ',
    roles: ['summarize'],
    css: '.ba-summary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px 24px; margin: 24px 0; border-radius: 12px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25); } .ba-summary::before { content: "まとめ"; display: block; font-weight: 700; margin-bottom: 12px; font-size: 16px; }',
    enabled: true,
  },
  {
    id: 'ba-checklist',
    label: 'チェックリスト',
    roles: ['summarize', 'action'],
    css: '.ba-checklist { background-color: #fafafa; padding: 16px 20px; margin: 24px 0; border-radius: 8px; border: 1px solid #e0e0e0; }',
    enabled: true,
  },
  {
    id: 'ba-number-list',
    label: '番号付きリスト',
    roles: ['explain', 'action'],
    css: '.ba-number-list { background-color: #fff; padding: 16px 20px; margin: 24px 0; border-radius: 8px; border: 1px solid #e0e0e0; }',
    enabled: true,
  },
];

// デフォルト設定
const defaultSettings: UserSettings = {
  articleStyle: {
    taste: 'friendly',
    firstPerson: 'watashi',
    readerAddress: 'minasan',
    tone: 'explanatory',
    introStyle: 'problem',
  },
  decorations: DEFAULT_DECORATIONS,
  baseClass: 'ba-article',
  seo: {
    metaDescriptionLength: 140,
    maxKeywords: 7,
  },
  sampleArticles: [],
  lastUpdated: null,
};

// 装飾設定が新スキーマかどうかを判定
export function isNewDecorationSchema(decorations: DecorationSettings): decorations is DecorationWithRoles[] {
  return Array.isArray(decorations);
}

// Storeの型
interface SettingsStore {
  settings: UserSettings;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Actions
  updateArticleStyle: (style: Partial<ArticleStyleSettings>) => void;
  updateDecorations: (decorations: DecorationWithRoles[]) => void;
  updateDecoration: (id: string, updates: Partial<DecorationWithRoles>) => void;
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
            decorations: decorations,
            lastUpdated: new Date().toISOString(),
          },
        })),

      updateDecoration: (id, updates) =>
        set((state) => {
          const currentDecorations = state.settings.decorations;
          if (!isNewDecorationSchema(currentDecorations)) {
            return state; // 旧スキーマの場合は何もしない
          }
          const newDecorations = currentDecorations.map((dec) =>
            dec.id === id ? { ...dec, ...updates } : dec
          );
          return {
            settings: {
              ...state.settings,
              decorations: newDecorations,
              lastUpdated: new Date().toISOString(),
            },
          };
        }),

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

// 旧スキーマ用のラベル（後方互換性のため保持）
export const decorationLabelsLegacy: Record<keyof DecorationSettingsLegacy, string> = {
  infoBox: '情報ボックス',
  warningBox: '警告ボックス',
  successBox: '成功ボックス',
  balloon: '吹き出し',
  quote: '引用',
  table: '表',
};

// 新スキーマ用: 装飾ラベル取得ヘルパー
export function getDecorationLabel(decoration: DecorationWithRoles): string {
  return decoration.label;
}

// API連携用の関数（将来的にDynamoDBと同期）
import api from '../services/api';

export const settingsApi = {
  // サーバーから設定を読み込み
  async load(): Promise<UserSettings | null> {
    try {
      const store = useSettingsStore.getState();
      store.setLoading(true);
      store.setError(null);

      const response = await api.get<{
        articleStyle: ArticleStyleSettings | null;
        decorations: DecorationSettings | null;
        baseClass?: string;
        seo: SeoSettings | null;
        sampleArticles: SampleArticle[];
      }>('/settings');

      // サーバーからのデータをマージ
      if (response) {
        // 装飾設定の変換（旧スキーマの場合はデフォルトを使用）
        let decorations: DecorationWithRoles[];
        if (response.decorations && isNewDecorationSchema(response.decorations)) {
          decorations = response.decorations;
        } else {
          // 旧スキーマまたはnullの場合はデフォルトを使用
          decorations = DEFAULT_DECORATIONS;
        }

        const newSettings: UserSettings = {
          articleStyle: response.articleStyle || store.settings.articleStyle,
          decorations: decorations,
          baseClass: response.baseClass || 'ba-article',
          seo: response.seo || store.settings.seo,
          sampleArticles: response.sampleArticles || [],
          lastUpdated: new Date().toISOString(),
        };
        store.setSettings(newSettings);
        return newSettings;
      }
      return null;
    } catch (error) {
      const store = useSettingsStore.getState();
      store.setError('設定の読み込みに失敗しました');
      console.error('Failed to load settings:', error);
      return null;
    } finally {
      useSettingsStore.getState().setLoading(false);
    }
  },

  // サーバーに設定を保存
  async save(): Promise<boolean> {
    try {
      const store = useSettingsStore.getState();
      store.setSaving(true);
      store.setError(null);

      await api.put('/settings', {
        articleStyle: store.settings.articleStyle,
        decorations: store.settings.decorations,
        baseClass: store.settings.baseClass,
        seo: store.settings.seo,
        sampleArticles: store.settings.sampleArticles,
      });

      return true;
    } catch (error) {
      const store = useSettingsStore.getState();
      store.setError('設定の保存に失敗しました');
      console.error('Failed to save settings:', error);
      return false;
    } finally {
      useSettingsStore.getState().setSaving(false);
    }
  },
};
