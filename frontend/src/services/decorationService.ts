/**
 * 装飾サービス
 * Phase 5: 記事エディタの装飾CSS管理
 */

/**
 * 装飾データの型
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
 * 装飾設定の保存データ
 */
export interface DecorationSettings {
  decorations: Decoration[];
  updatedAt: string;
}

const STORAGE_KEY = 'blog-agent-decorations';

/**
 * 標準装飾の定義
 */
export const DEFAULT_DECORATIONS: Omit<Decoration, 'enabled' | 'isCustomized' | 'customCSS'>[] = [
  {
    id: 'ba-highlight',
    displayName: 'ハイライト',
    defaultCSS: `.ba-highlight {
  background: linear-gradient(transparent 60%, #fff59d 60%);
  padding: 0 4px;
  font-weight: 600;
}`,
  },
  {
    id: 'ba-point',
    displayName: 'ポイント',
    defaultCSS: `.ba-point {
  background-color: #e3f2fd;
  border-left: 4px solid #2196f3;
  padding: 16px 20px;
  margin: 24px 0;
  border-radius: 0 8px 8px 0;
}
.ba-point::before {
  content: "💡 ポイント";
  display: block;
  font-weight: 700;
  color: #1976d2;
  margin-bottom: 8px;
  font-size: 14px;
}`,
  },
  {
    id: 'ba-warning',
    displayName: '警告',
    defaultCSS: `.ba-warning {
  background-color: #fff3e0;
  border-left: 4px solid #ff9800;
  padding: 16px 20px;
  margin: 24px 0;
  border-radius: 0 8px 8px 0;
}
.ba-warning::before {
  content: "⚠️ 注意";
  display: block;
  font-weight: 700;
  color: #e65100;
  margin-bottom: 8px;
  font-size: 14px;
}`,
  },
  {
    id: 'ba-success',
    displayName: '成功',
    defaultCSS: `.ba-success {
  background-color: #e8f5e9;
  border-left: 4px solid #4caf50;
  padding: 16px 20px;
  margin: 24px 0;
  border-radius: 0 8px 8px 0;
}
.ba-success::before {
  content: "✅ 成功";
  display: block;
  font-weight: 700;
  color: #2e7d32;
  margin-bottom: 8px;
  font-size: 14px;
}`,
  },
  {
    id: 'ba-quote',
    displayName: '引用',
    defaultCSS: `.ba-quote {
  background-color: #f5f5f5;
  border-left: 4px solid #9e9e9e;
  padding: 16px 20px;
  margin: 24px 0;
  font-style: italic;
  color: #616161;
  border-radius: 0 8px 8px 0;
}
.ba-quote::before {
  content: "📝";
  margin-right: 8px;
}`,
  },
  {
    id: 'ba-summary',
    displayName: 'まとめ',
    defaultCSS: `.ba-summary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px 24px;
  margin: 24px 0;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);
}
.ba-summary::before {
  content: "📋 まとめ";
  display: block;
  font-weight: 700;
  margin-bottom: 12px;
  font-size: 16px;
}`,
  },
  {
    id: 'ba-checklist',
    displayName: 'チェックリスト',
    defaultCSS: `.ba-checklist {
  background-color: #fafafa;
  padding: 16px 20px;
  margin: 24px 0;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}
.ba-checklist ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.ba-checklist li {
  padding: 8px 0;
  padding-left: 28px;
  position: relative;
}
.ba-checklist li::before {
  content: "☑️";
  position: absolute;
  left: 0;
}`,
  },
  {
    id: 'ba-number-list',
    displayName: '番号付きリスト',
    defaultCSS: `.ba-number-list {
  background-color: #fff;
  padding: 16px 20px;
  margin: 24px 0;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  counter-reset: number-list;
}
.ba-number-list ol {
  list-style: none;
  padding: 0;
  margin: 0;
}
.ba-number-list li {
  padding: 12px 0;
  padding-left: 40px;
  position: relative;
  border-bottom: 1px dashed #e0e0e0;
  counter-increment: number-list;
}
.ba-number-list li:last-child {
  border-bottom: none;
}
.ba-number-list li::before {
  content: counter(number-list);
  position: absolute;
  left: 0;
  width: 28px;
  height: 28px;
  background: #2196f3;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
}`,
  },
];

/**
 * 初期装飾設定を取得
 */
function getInitialDecorations(): Decoration[] {
  return DEFAULT_DECORATIONS.map((dec) => ({
    ...dec,
    enabled: true,
    isCustomized: false,
    customCSS: null,
  }));
}

/**
 * 装飾設定を取得
 */
export function getDecorationSettings(): DecorationSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return {
        decorations: getInitialDecorations(),
        updatedAt: new Date().toISOString(),
      };
    }
    const settings: DecorationSettings = JSON.parse(data);

    // 新しい装飾が追加された場合に対応
    const existingIds = new Set(settings.decorations.map((d) => d.id));
    const newDecorations = DEFAULT_DECORATIONS.filter((d) => !existingIds.has(d.id)).map((dec) => ({
      ...dec,
      enabled: true,
      isCustomized: false,
      customCSS: null,
    }));

    if (newDecorations.length > 0) {
      settings.decorations = [...settings.decorations, ...newDecorations];
    }

    return settings;
  } catch (e) {
    console.error('Failed to load decoration settings:', e);
    return {
      decorations: getInitialDecorations(),
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * 装飾設定を保存
 */
export function saveDecorationSettings(settings: DecorationSettings): void {
  try {
    settings.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save decoration settings:', e);
    throw new Error('装飾設定の保存に失敗しました');
  }
}

/**
 * 単一の装飾を取得
 */
export function getDecoration(id: string): Decoration | null {
  const settings = getDecorationSettings();
  return settings.decorations.find((d) => d.id === id) || null;
}

/**
 * 装飾を更新
 */
export function updateDecoration(id: string, updates: Partial<Decoration>): Decoration | null {
  const settings = getDecorationSettings();
  const index = settings.decorations.findIndex((d) => d.id === id);

  if (index === -1) return null;

  settings.decorations[index] = {
    ...settings.decorations[index],
    ...updates,
  };

  saveDecorationSettings(settings);
  return settings.decorations[index];
}

/**
 * 装飾の有効/無効を切り替え
 */
export function toggleDecorationEnabled(id: string): Decoration | null {
  const decoration = getDecoration(id);
  if (!decoration) return null;

  return updateDecoration(id, { enabled: !decoration.enabled });
}

/**
 * 装飾のカスタムCSSを保存
 */
export function saveCustomCSS(id: string, css: string): Decoration | null {
  return updateDecoration(id, {
    customCSS: css,
    isCustomized: true,
  });
}

/**
 * 装飾を標準に戻す
 */
export function resetToDefault(id: string): Decoration | null {
  return updateDecoration(id, {
    customCSS: null,
    isCustomized: false,
  });
}

/**
 * 有効な装飾のCSSを取得（エクスポート用）
 */
export function getEnabledDecorationCSS(): string {
  const settings = getDecorationSettings();

  return settings.decorations
    .filter((d) => d.enabled)
    .map((d) => d.customCSS || d.defaultCSS)
    .join('\n\n');
}

/**
 * 有効な装飾のIDリストを取得
 */
export function getEnabledDecorationIds(): string[] {
  const settings = getDecorationSettings();
  return settings.decorations.filter((d) => d.enabled).map((d) => d.id);
}

/**
 * 全装飾のCSSを取得（プレビュー用）
 */
export function getAllDecorationCSS(): string {
  const settings = getDecorationSettings();

  const decorationCSS = settings.decorations
    .map((d) => d.customCSS || d.defaultCSS)
    .join('\n\n');

  // ブロックエディタ内でも装飾が適用されるようにスコープを追加
  const editorScopedCSS = settings.decorations
    .map((d) => {
      const css = d.customCSS || d.defaultCSS;
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
}

.ba-article h2 {
  font-size: 1.5em;
  font-weight: 700;
  margin: 2em 0 1em;
  padding-bottom: 0.5em;
  border-bottom: 2px solid #2196f3;
}

.ba-article h3 {
  font-size: 1.25em;
  font-weight: 700;
  margin: 1.5em 0 0.75em;
}

.ba-article p {
  margin: 1em 0;
}
`;
}

/**
 * WordPress用の完全なCSSを生成
 */
export function generateWordPressCSS(): string {
  const css = getEnabledDecorationCSS();

  return `/* MyBlog AI 装飾CSS */
/* WordPress管理画面 → 外観 → カスタマイズ → 追加CSS に貼り付けてください */

${css}

/* 基本スタイル */
.ba-article {
  font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif;
  line-height: 1.8;
  color: #333;
}

.ba-article h2 {
  font-size: 1.5em;
  font-weight: 700;
  margin: 2em 0 1em;
  padding-bottom: 0.5em;
  border-bottom: 2px solid #2196f3;
}

.ba-article h3 {
  font-size: 1.25em;
  font-weight: 700;
  margin: 1.5em 0 0.75em;
}

.ba-article p {
  margin: 1em 0;
}
`;
}

/**
 * オリジナル装飾を追加
 */
export function addCustomDecoration(
  id: string,
  displayName: string,
  css: string
): Decoration | null {
  // IDの検証（ba-で始まり、英数字とハイフンのみ）
  if (!id.match(/^ba-[a-z0-9-]+$/)) {
    throw new Error('IDは ba- で始まり、英小文字・数字・ハイフンのみ使用できます');
  }

  // 既存IDとの重複チェック
  const settings = getDecorationSettings();
  if (settings.decorations.some((d) => d.id === id)) {
    throw new Error('このIDは既に使用されています');
  }

  const newDecoration: Decoration = {
    id,
    displayName,
    enabled: true,
    isCustomized: true,
    defaultCSS: css,
    customCSS: css,
  };

  settings.decorations.push(newDecoration);
  saveDecorationSettings(settings);

  return newDecoration;
}

/**
 * オリジナル装飾を削除（標準装飾は削除不可）
 */
export function deleteCustomDecoration(id: string): boolean {
  // 標準装飾は削除不可
  if (DEFAULT_DECORATIONS.some((d) => d.id === id)) {
    throw new Error('標準装飾は削除できません');
  }

  const settings = getDecorationSettings();
  const index = settings.decorations.findIndex((d) => d.id === id);

  if (index === -1) return false;

  settings.decorations.splice(index, 1);
  saveDecorationSettings(settings);

  return true;
}

/**
 * 標準装飾かどうかを判定
 */
export function isStandardDecoration(id: string): boolean {
  return DEFAULT_DECORATIONS.some((d) => d.id === id);
}
