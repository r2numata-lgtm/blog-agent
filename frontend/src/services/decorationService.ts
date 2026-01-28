/**
 * 装飾サービス
 * Phase 5: 記事エディタの装飾CSS管理
 *
 * 注意: このモジュールは後方互換性のために残されていますが、
 * 新しい実装ではsettingsStoreを直接使用することを推奨します。
 */

import {
  useSettingsStore,
  DEFAULT_DECORATIONS,
  isNewDecorationSchema,
  migrateDecorations,
  type DecorationWithRoles,
} from '../stores/settingsStore';

/**
 * 装飾設定が新スキーマであることを保証する
 * 旧スキーマの場合はマイグレーションを実行
 */
function ensureNewSchema(): DecorationWithRoles[] {
  const store = useSettingsStore.getState();
  const storeDecorations = store.settings.decorations;

  if (isNewDecorationSchema(storeDecorations)) {
    return storeDecorations;
  }

  // 旧スキーマの場合はマイグレーション
  const migratedDecorations = migrateDecorations(storeDecorations);
  store.updateDecorations(migratedDecorations);
  return migratedDecorations;
}

/**
 * 装飾データの型（旧形式 - 後方互換性用）
 */
export interface Decoration {
  id: string;
  displayName: string;
  enabled: boolean;
  isCustomized: boolean;
  defaultCSS: string;
  customCSS: string | null;
}

/**
 * 装飾設定の保存データ（旧形式 - 後方互換性用）
 */
export interface DecorationSettings {
  decorations: Decoration[];
  updatedAt: string;
}

// 新形式の装飾を旧形式に変換
function convertToLegacyDecoration(dec: DecorationWithRoles): Decoration {
  return {
    id: dec.id,
    displayName: dec.label,
    enabled: dec.enabled,
    isCustomized: false,
    defaultCSS: dec.css,
    customCSS: null,
  };
}

// 旧STORAGE_KEY（移行用に残す - 未使用だが後方互換性のため保持）
const _STORAGE_KEY = 'blog-agent-decorations';
void _STORAGE_KEY; // 未使用警告を抑制

/**
 * 初期装飾設定を取得
 * DEFAULT_DECORATIONSはsettingsStoreからインポート
 */
function getInitialDecorations(): Decoration[] {
  return DEFAULT_DECORATIONS.map(convertToLegacyDecoration);
}

/**
 * 装飾設定を取得
 * settingsStoreから取得し、旧形式に変換して返す
 */
export function getDecorationSettings(): DecorationSettings {
  try {
    const storeDecorations = ensureNewSchema();
    return {
      decorations: storeDecorations.map(convertToLegacyDecoration),
      updatedAt: new Date().toISOString(),
    };
  } catch (e) {
    console.error('Failed to load decoration settings:', e);
    return {
      decorations: getInitialDecorations(),
      updatedAt: new Date().toISOString(),
    };
  }
}


/**
 * 単一の装飾を取得
 */
export function getDecoration(id: string): Decoration | null {
  const storeDecorations = ensureNewSchema();

  const dec = storeDecorations.find((d) => d.id === id);
  return dec ? convertToLegacyDecoration(dec) : null;
}


/**
 * 装飾の有効/無効を切り替え
 */
export function toggleDecorationEnabled(id: string): Decoration | null {
  const store = useSettingsStore.getState();
  const storeDecorations = ensureNewSchema();

  const dec = storeDecorations.find((d) => d.id === id);
  if (!dec) return null;

  store.updateDecoration(id, { enabled: !dec.enabled });
  return getDecoration(id);
}


/**
 * 有効な装飾のCSSを取得（エクスポート用）
 */
export function getEnabledDecorationCSS(): string {
  const storeDecorations = ensureNewSchema();
  return storeDecorations
    .filter((d) => d.enabled)
    .map((d) => d.css)
    .join('\n\n');
}

/**
 * 有効な装飾のIDリストを取得
 */
export function getEnabledDecorationIds(): string[] {
  const storeDecorations = ensureNewSchema();
  return storeDecorations.filter((d) => d.enabled).map((d) => d.id);
}

/**
 * 全装飾のCSSを取得（プレビュー用）
 */
export function getAllDecorationCSS(): string {
  const storeDecorations = ensureNewSchema();

  const decorationCSS = storeDecorations.map((d) => d.css).join('\n\n');

  // ブロックエディタ内でも装飾が適用されるようにスコープを追加
  const editorScopedCSS = storeDecorations
    .map((d) => {
      const css = d.css;
      // .ba-xxx を .ba-editor-area .ba-xxx に変換（エディタ内でも適用）
      return css.replace(/\.ba-/g, '.ba-editor-area .ba-');
    })
    .join('\n\n');

  return `/* 装飾CSS */
${decorationCSS}

/* ブロックエディタ内用 */
${editorScopedCSS}

/* 記事プレビュー基本スタイル */
.ba-article {
  font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif;
  line-height: 1.8;
  color: #333;
  font-size: 16px;
}

.ba-article h1 {
  font-size: 2em;
  font-weight: 700;
  margin: 0 0 1em;
  line-height: 1.3;
}

.ba-article h2 {
  font-size: 1.5em;
  font-weight: 700;
  margin: 2em 0 1em;
  padding-bottom: 0.5em;
  border-bottom: 2px solid #2196f3;
  line-height: 1.3;
}

.ba-article h3 {
  font-size: 1.25em;
  font-weight: 700;
  margin: 1.5em 0 0.75em;
  line-height: 1.4;
}

.ba-article h4 {
  font-size: 1.1em;
  font-weight: 700;
  margin: 1.25em 0 0.5em;
}

.ba-article h5,
.ba-article h6 {
  font-size: 1em;
  font-weight: 700;
  margin: 1em 0 0.5em;
}

.ba-article p {
  margin: 1em 0;
}

.ba-article ul,
.ba-article ol {
  margin: 1em 0;
  padding-left: 1.5em;
}

.ba-article ul {
  list-style-type: disc;
}

.ba-article ol {
  list-style-type: decimal;
}

.ba-article li {
  margin: 0.5em 0;
}

.ba-article li > ul,
.ba-article li > ol {
  margin: 0.5em 0;
}

.ba-article a {
  color: #2196f3;
  text-decoration: underline;
}

.ba-article a:hover {
  color: #1976d2;
}

.ba-article blockquote {
  margin: 1.5em 0;
  padding: 1em 1.5em;
  border-left: 4px solid #9e9e9e;
  background-color: #f5f5f5;
  font-style: italic;
  color: #616161;
}

.ba-article code {
  background-color: #f5f5f5;
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.9em;
}

.ba-article pre {
  background-color: #1e1e1e;
  color: #d4d4d4;
  padding: 1em;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1.5em 0;
}

.ba-article pre code {
  background-color: transparent;
  padding: 0;
  color: inherit;
}

.ba-article hr {
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: 2em 0;
}

.ba-article table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5em 0;
}

.ba-article th,
.ba-article td {
  border: 1px solid #e0e0e0;
  padding: 0.75em;
  text-align: left;
}

.ba-article th {
  background-color: #f5f5f5;
  font-weight: 700;
}

.ba-article img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 1em 0;
}

.ba-article strong {
  font-weight: 700;
}

.ba-article em {
  font-style: italic;
}
`;
}

/**
 * WordPress用の完全なCSSを生成
 */
export function generateWordPressCSS(): string {
  const storeDecorations = ensureNewSchema();

  const css = storeDecorations
    .filter((d) => d.enabled)
    .map((d) => d.css)
    .join('\n\n');

  return `/* MyBlog AI 装飾CSS */
/* WordPress管理画面 → 外観 → カスタマイズ → 追加CSS に貼り付けてください */

${css}

/* 基本スタイル */
.ba-article {
  font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif;
  line-height: 1.8;
  color: #333;
  font-size: 16px;
}

.ba-article h1 {
  font-size: 2em;
  font-weight: 700;
  margin: 0 0 1em;
  line-height: 1.3;
}

.ba-article h2 {
  font-size: 1.5em;
  font-weight: 700;
  margin: 2em 0 1em;
  padding-bottom: 0.5em;
  border-bottom: 2px solid #2196f3;
  line-height: 1.3;
}

.ba-article h3 {
  font-size: 1.25em;
  font-weight: 700;
  margin: 1.5em 0 0.75em;
  line-height: 1.4;
}

.ba-article h4 {
  font-size: 1.1em;
  font-weight: 700;
  margin: 1.25em 0 0.5em;
}

.ba-article h5,
.ba-article h6 {
  font-size: 1em;
  font-weight: 700;
  margin: 1em 0 0.5em;
}

.ba-article p {
  margin: 1em 0;
}

.ba-article ul,
.ba-article ol {
  margin: 1em 0;
  padding-left: 1.5em;
}

.ba-article ul {
  list-style-type: disc;
}

.ba-article ol {
  list-style-type: decimal;
}

.ba-article li {
  margin: 0.5em 0;
}

.ba-article a {
  color: #2196f3;
  text-decoration: underline;
}

.ba-article a:hover {
  color: #1976d2;
}

.ba-article blockquote {
  margin: 1.5em 0;
  padding: 1em 1.5em;
  border-left: 4px solid #9e9e9e;
  background-color: #f5f5f5;
  font-style: italic;
  color: #616161;
}

.ba-article code {
  background-color: #f5f5f5;
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.9em;
}

.ba-article pre {
  background-color: #1e1e1e;
  color: #d4d4d4;
  padding: 1em;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1.5em 0;
}

.ba-article pre code {
  background-color: transparent;
  padding: 0;
  color: inherit;
}

.ba-article hr {
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: 2em 0;
}

.ba-article table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5em 0;
}

.ba-article th,
.ba-article td {
  border: 1px solid #e0e0e0;
  padding: 0.75em;
  text-align: left;
}

.ba-article th {
  background-color: #f5f5f5;
  font-weight: 700;
}

.ba-article img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 1em 0;
}
`;
}



/**
 * 新形式の装飾設定を直接取得（推奨）
 */
export function getDecorationWithRoles(): DecorationWithRoles[] {
  return ensureNewSchema();
}
