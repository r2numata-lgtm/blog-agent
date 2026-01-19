/**
 * エクスポートユーティリティ
 * Phase 5: P5-01〜P5-04 出力機能
 */

import { serialize } from '@wordpress/blocks';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BlockInstance = any;

/**
 * 記事のメタ情報
 */
export interface ArticleMeta {
  title: string;
  description: string;
  keywords: string[];
  author: string;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  blockCount: number;
}

/**
 * エクスポートデータ
 */
export interface ExportData {
  version: string;
  exportedAt: string;
  meta: ArticleMeta;
  content: {
    gutenberg: string;
    html: string;
    blocks: BlockInstance[];
  };
}

/**
 * ブロックからテキストコンテンツを抽出
 */
function extractTextFromBlocks(blocks: BlockInstance[]): string {
  let text = '';

  for (const block of blocks) {
    const { name, attributes, innerBlocks } = block;

    switch (name) {
      case 'core/paragraph':
      case 'core/heading':
        text += stripHtml(attributes.content || '') + ' ';
        break;
      case 'core/list':
        text += stripHtml(attributes.values || '') + ' ';
        break;
      case 'core/quote':
        text += stripHtml(attributes.value || '') + ' ';
        break;
      case 'core/code':
        text += (attributes.content || '') + ' ';
        break;
      case 'blog-agent/box':
      case 'blog-agent/balloon':
        text += (attributes.content || '') + ' ';
        break;
    }

    // 入れ子ブロックを処理
    if (innerBlocks && innerBlocks.length > 0) {
      text += extractTextFromBlocks(innerBlocks);
    }
  }

  return text;
}

/**
 * HTMLタグを除去
 */
function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

/**
 * 文字数をカウント
 */
export function countWords(blocks: BlockInstance[]): number {
  const text = extractTextFromBlocks(blocks);
  // 日本語の場合は文字数、英語の場合は単語数
  const japaneseChars = text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g);
  if (japaneseChars && japaneseChars.length > text.split(/\s+/).length) {
    return text.replace(/\s/g, '').length;
  }
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Gutenbergブロック形式（WordPress形式）でエクスポート
 * P5-01: Gutenbergブロック形式出力
 */
export function exportAsGutenberg(blocks: BlockInstance[]): string {
  return serialize(blocks);
}

/**
 * 純粋なHTMLとしてエクスポート（WordPressコメントなし）
 * P5-03: HTMLエクスポート機能
 */
export function exportAsHtml(blocks: BlockInstance[], meta?: Partial<ArticleMeta>): string {
  const gutenbergHtml = serialize(blocks);

  // WordPressコメントを除去
  const pureHtml = gutenbergHtml
    .replace(/<!-- wp:[^>]+ -->/g, '')
    .replace(/<!-- \/wp:[^>]+ -->/g, '')
    .trim();

  // 完全なHTMLドキュメントとして出力
  const title = meta?.title || 'Untitled Article';
  const description = meta?.description || '';
  const keywords = meta?.keywords?.join(', ') || '';

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="keywords" content="${escapeHtml(keywords)}">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.8;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; }
    h2 { border-bottom: 2px solid #0073aa; padding-bottom: 0.3em; }
    p { margin: 0 0 1.5em; }
    ul, ol { margin: 0 0 1.5em 1.5em; }
    blockquote {
      margin: 1.5em 0;
      padding: 1em 1.5em;
      border-left: 4px solid #0073aa;
      background: #f7f7f7;
    }
    pre {
      background: #1e1e1e;
      color: #f8f8f2;
      padding: 1em;
      border-radius: 4px;
      overflow-x: auto;
    }
    code { font-family: Consolas, Monaco, monospace; }
    img { max-width: 100%; height: auto; }
    table { width: 100%; border-collapse: collapse; margin: 1.5em 0; }
    th, td { border: 1px solid #ddd; padding: 0.75em; }
    th { background: #f7f7f7; }
  </style>
</head>
<body>
  <article>
    ${pureHtml}
  </article>
</body>
</html>`;
}

/**
 * JSONとしてエクスポート
 * P5-04: JSONエクスポート機能
 */
export function exportAsJson(blocks: BlockInstance[], meta?: Partial<ArticleMeta>): ExportData {
  const now = new Date().toISOString();
  const gutenbergHtml = serialize(blocks);

  return {
    version: '1.0',
    exportedAt: now,
    meta: {
      title: meta?.title || '',
      description: meta?.description || '',
      keywords: meta?.keywords || [],
      author: meta?.author || '',
      createdAt: meta?.createdAt || now,
      updatedAt: meta?.updatedAt || now,
      wordCount: countWords(blocks),
      blockCount: blocks.length,
    },
    content: {
      gutenberg: gutenbergHtml,
      html: gutenbergHtml
        .replace(/<!-- wp:[^>]+ -->/g, '')
        .replace(/<!-- \/wp:[^>]+ -->/g, '')
        .trim(),
      blocks: blocks.map(block => ({
        name: block.name,
        attributes: block.attributes,
        innerBlocks: block.innerBlocks,
      })),
    },
  };
}

/**
 * メタ情報を生成
 * P5-02: メタ情報出力
 */
export function generateMeta(blocks: BlockInstance[], existingMeta?: Partial<ArticleMeta>): ArticleMeta {
  const now = new Date().toISOString();

  // タイトルを最初の見出しから取得
  let title = existingMeta?.title || '';
  if (!title) {
    const headingBlock = blocks.find(b => b.name === 'core/heading');
    if (headingBlock) {
      title = stripHtml(headingBlock.attributes.content || '');
    }
  }

  // 説明を最初の段落から生成
  let description = existingMeta?.description || '';
  if (!description) {
    const paragraphBlock = blocks.find(b => b.name === 'core/paragraph');
    if (paragraphBlock) {
      const content = stripHtml(paragraphBlock.attributes.content || '');
      description = content.substring(0, 160);
      if (content.length > 160) description += '...';
    }
  }

  // キーワードを抽出（簡易的な実装）
  let keywords = existingMeta?.keywords || [];
  if (keywords.length === 0) {
    // 見出しからキーワードを抽出
    keywords = blocks
      .filter(b => b.name === 'core/heading')
      .map(b => stripHtml(b.attributes.content || ''))
      .filter(k => k.length > 0)
      .slice(0, 5);
  }

  return {
    title,
    description,
    keywords,
    author: existingMeta?.author || '',
    createdAt: existingMeta?.createdAt || now,
    updatedAt: now,
    wordCount: countWords(blocks),
    blockCount: blocks.length,
  };
}

/**
 * HTML特殊文字をエスケープ
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}

/**
 * ファイルとしてダウンロード
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 各形式でダウンロード
 */
export function downloadAsGutenberg(blocks: BlockInstance[], filename = 'article.html'): void {
  const content = exportAsGutenberg(blocks);
  downloadFile(content, filename, 'text/html');
}

export function downloadAsHtml(blocks: BlockInstance[], meta?: Partial<ArticleMeta>, filename = 'article.html'): void {
  const content = exportAsHtml(blocks, meta);
  downloadFile(content, filename, 'text/html');
}

export function downloadAsJson(blocks: BlockInstance[], meta?: Partial<ArticleMeta>, filename = 'article.json'): void {
  const data = exportAsJson(blocks, meta);
  const content = JSON.stringify(data, null, 2);
  downloadFile(content, filename, 'application/json');
}

export function downloadMeta(blocks: BlockInstance[], existingMeta?: Partial<ArticleMeta>, filename = 'meta.json'): void {
  const meta = generateMeta(blocks, existingMeta);
  const content = JSON.stringify(meta, null, 2);
  downloadFile(content, filename, 'application/json');
}
