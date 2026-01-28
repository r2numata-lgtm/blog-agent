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
  attention: { label: '注目', description: '重要な主張・結論' },
  warning: { label: '警告', description: '注意・失敗・リスク' },
  summarize: { label: '要約', description: '要点整理・まとめ' },
  explain: { label: '説明', description: '解説・定義・補足' },
  action: { label: '行動', description: '行動促進・CTA' },
};

// ============================================================
// Schema（構造）型定義
// ============================================================
export type DecorationSchema = 'paragraph' | 'box' | 'list' | 'steps' | 'table' | 'callout';

// Schema Optionsの型定義
export interface BoxOptions {
  title: {
    required: boolean;
    source: 'claude';
  };
}

export interface ListOptions {
  ordered: boolean;
}

export interface StepsOptions {
  stepTitle: {
    enabled: boolean;
    source: 'claude';
  };
}

export interface TableOptions {
  headers: {
    required: boolean;
    source: 'claude';
  };
}

export interface CalloutOptions {
  buttonText: {
    source: 'claude';
  };
}

// SchemaOptionsのユニオン型
export type SchemaOptions =
  | Record<string, never> // paragraph
  | BoxOptions // box
  | ListOptions // list
  | StepsOptions // steps
  | TableOptions // table
  | CalloutOptions; // callout

// Schemaのラベル定義
export const SCHEMA_LABELS: Record<DecorationSchema, { label: string; description: string }> = {
  paragraph: { label: '段落', description: 'シンプルな段落テキスト' },
  box: { label: 'ボックス', description: 'タイトル付きの囲みボックス' },
  list: { label: 'リスト', description: '箇条書きまたは番号付きリスト' },
  steps: { label: 'ステップ', description: '手順を示すステップリスト' },
  table: { label: 'テーブル', description: '比較や一覧の表' },
  callout: { label: 'コールアウト', description: '行動を促すCTAブロック' },
};

// Role × Schema 制限マップ
export const ROLE_SCHEMA_CONSTRAINTS: Record<SemanticRole, DecorationSchema[]> = {
  attention: ['paragraph', 'box'],
  warning: ['paragraph', 'box'],
  summarize: ['paragraph', 'box', 'list'],
  explain: ['paragraph', 'box', 'table'],
  action: ['callout'],
};

// ============================================================
// 装飾設定の型定義
// ============================================================

// 新スキーマ: roles + schema対応の装飾設定
export interface DecorationWithRoles {
  id: string;
  label: string;
  roles: SemanticRole[];
  schema: DecorationSchema;
  options: SchemaOptions;
  class: string;
  css: string;
  enabled: boolean;
}

// バリデーション関数
export function validateRoleSchemaConstraint(roles: SemanticRole[], schema: DecorationSchema): boolean {
  return roles.every((role) => ROLE_SCHEMA_CONSTRAINTS[role]?.includes(schema));
}

export function getAvailableSchemasForRoles(roles: SemanticRole[]): DecorationSchema[] {
  if (roles.length === 0) return [];
  const allSchemas: DecorationSchema[] = ['paragraph', 'box', 'list', 'steps', 'table', 'callout'];
  return allSchemas.filter((schema) => roles.every((role) => ROLE_SCHEMA_CONSTRAINTS[role]?.includes(schema)));
}

// Schema用のデフォルトオプションを取得
export function getDefaultOptionsForSchema(schema: DecorationSchema): SchemaOptions {
  switch (schema) {
    case 'box':
      return { title: { required: true, source: 'claude' } };
    case 'list':
      return { ordered: false };
    case 'steps':
      return { stepTitle: { enabled: true, source: 'claude' } };
    case 'table':
      return { headers: { required: true, source: 'claude' } };
    case 'callout':
      return { buttonText: { source: 'claude' } };
    case 'paragraph':
    default:
      return {};
  }
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

// デフォルト装飾設定（新スキーマ: roles + schema対応）
// 注意: タイトルはClaudeが動的に生成し、HTMLで出力される
export const DEFAULT_DECORATIONS: DecorationWithRoles[] = [
  // attention + paragraph: インラインハイライト
  {
    id: 'ba-highlight',
    label: 'ハイライト',
    roles: ['attention'],
    schema: 'paragraph',
    options: {},
    class: 'ba-highlight',
    css: '.ba-highlight { background: linear-gradient(transparent 60%, #fff59d 60%); padding: 0 4px; font-weight: 600; display: inline; box-decoration-break: clone; -webkit-box-decoration-break: clone; }',
    enabled: true,
  },
  // attention + box: ポイントボックス
  {
    id: 'ba-point',
    label: 'ポイント',
    roles: ['attention'],
    schema: 'box',
    options: { title: { required: true, source: 'claude' } },
    class: 'ba-point',
    css: '.ba-point { background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0; } .ba-point .box-title { font-weight: 700; color: #1976d2; margin-bottom: 8px; font-size: 14px; }',
    enabled: true,
  },
  // warning + box: 警告ボックス
  {
    id: 'ba-warning',
    label: '警告',
    roles: ['warning'],
    schema: 'box',
    options: { title: { required: true, source: 'claude' } },
    class: 'ba-warning',
    css: '.ba-warning { background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0; } .ba-warning .box-title { font-weight: 700; color: #e65100; margin-bottom: 8px; font-size: 14px; }',
    enabled: true,
  },
  // explain + box: 補足説明ボックス
  {
    id: 'ba-explain',
    label: '補足説明',
    roles: ['explain'],
    schema: 'box',
    options: { title: { required: false, source: 'claude' } },
    class: 'ba-explain',
    css: '.ba-explain { background-color: #f5f5f5; border-left: 4px solid #9e9e9e; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0; } .ba-explain .box-title { font-weight: 700; color: #616161; margin-bottom: 8px; font-size: 14px; }',
    enabled: true,
  },
  // summarize + box: まとめボックス
  {
    id: 'ba-summary-box',
    label: 'まとめボックス',
    roles: ['summarize'],
    schema: 'box',
    options: { title: { required: true, source: 'claude' } },
    class: 'ba-summary-box',
    css: '.ba-summary-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px 24px; margin: 24px 0; border-radius: 12px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25); } .ba-summary-box .box-title { font-weight: 700; margin-bottom: 12px; font-size: 16px; }',
    enabled: true,
  },
  // summarize + list: まとめリスト
  {
    id: 'ba-summary-list',
    label: 'まとめリスト',
    roles: ['summarize'],
    schema: 'list',
    options: { ordered: false },
    class: 'ba-summary-list',
    css: '.ba-summary-list { background-color: #fafafa; padding: 16px 20px; margin: 24px 0; border-radius: 8px; border: 1px solid #e0e0e0; } .ba-summary-list .box-title { font-weight: 700; color: #333; margin-bottom: 8px; font-size: 14px; } .ba-summary-list ul { margin: 0; padding-left: 20px; } .ba-summary-list li { margin-bottom: 4px; }',
    enabled: true,
  },
  // explain + table: 比較テーブル
  {
    id: 'ba-table',
    label: '比較テーブル',
    roles: ['explain'],
    schema: 'table',
    options: { headers: { required: true, source: 'claude' } },
    class: 'ba-table',
    css: '.ba-table { margin: 24px 0; overflow-x: auto; } .ba-table table { width: 100%; border-collapse: collapse; } .ba-table th, .ba-table td { border: 1px solid #e0e0e0; padding: 12px; text-align: left; } .ba-table th { background-color: #f5f5f5; font-weight: 700; }',
    enabled: true,
  },
  // action + callout: CTAボタン
  {
    id: 'ba-callout',
    label: 'アクションボタン',
    roles: ['action'],
    schema: 'callout',
    options: { buttonText: { source: 'claude' } },
    class: 'ba-callout',
    css: '.ba-callout { background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 20px 24px; margin: 24px 0; border-radius: 0 8px 8px 0; text-align: center; } .ba-callout p { margin-bottom: 16px; font-size: 16px; } .ba-callout .callout-button { background-color: #4caf50; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background-color 0.2s; } .ba-callout .callout-button:hover { background-color: #43a047; }',
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

// 装飾設定が新スキーマ（schema付き）かどうかを判定
export function isNewDecorationSchema(decorations: DecorationSettings): decorations is DecorationWithRoles[] {
  if (!Array.isArray(decorations) || decorations.length === 0) return false;
  // schemaフィールドの存在で新スキーマを判定
  return 'schema' in decorations[0] && 'options' in decorations[0];
}

// 旧スキーマ（schema無し）をマイグレーション
export function migrateDecorations(decorations: DecorationSettings): DecorationWithRoles[] {
  // 旧オブジェクト形式の場合はデフォルトを返す
  if (!Array.isArray(decorations)) {
    return DEFAULT_DECORATIONS;
  }

  // 配列だが新スキーマでない場合（schema/options無し）
  if (decorations.length > 0 && !('schema' in decorations[0])) {
    // 旧配列形式からマイグレーション（デフォルトに戻す）
    return DEFAULT_DECORATIONS;
  }

  // 新スキーマの場合はそのまま返す
  return decorations as DecorationWithRoles[];
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
        // 装飾設定の変換（旧スキーマの場合はマイグレーション）
        const decorations = response.decorations
          ? migrateDecorations(response.decorations)
          : DEFAULT_DECORATIONS;

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

// ============================================================
// 手動保存機能（保存ボタンでサーバーへ同期）
// ============================================================
// 注意: 自動保存は廃止。ユーザーが明示的に保存ボタンを押すまでDBには保存されない
// localStorageには即座に保存される（persistミドルウェア）
