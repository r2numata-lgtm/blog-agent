/**
 * MarkdownからGutenbergブロックへの変換ユーティリティ
 * Phase 2: P2-06 Gutenbergブロック生成ロジック
 */

import { createBlock, serialize } from '@wordpress/blocks';
import { registerCoreBlocks } from '@wordpress/block-library';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { registerCustomBlocks } from './customBlocks';
import type { BoxType, BalloonPosition } from './customBlocks';

// Gutenbergブロックインスタンスの型（@wordpress/blocksの型定義が不完全なため）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BlockInstance = any;

// ブロックの登録状態
let blocksInitialized = false;

/**
 * ブロックライブラリを初期化
 */
export function initializeBlocks(): void {
  if (blocksInitialized) {
    return;
  }

  registerCoreBlocks();
  registerCustomBlocks();
  blocksInitialized = true;
}

/**
 * カスタム装飾タグのパターン
 *
 * 旧形式:
 * :::box type="info"
 * 内容
 * :::
 *
 * 新形式 (decoration ID直接指定):
 * :::box id="ba-point"
 * 内容
 * :::
 *
 * 吹き出し:
 * :::balloon position="left" icon="😊"
 * 内容
 * :::
 */
interface CustomTag {
  type: 'box' | 'balloon';
  attributes: Record<string, string>;
  content: string;
  raw: string;
}

// 旧type → 新decorationIdのマッピング
const LEGACY_TYPE_TO_DECORATION_ID: Record<string, string> = {
  info: 'ba-point',
  warning: 'ba-warning',
  success: 'ba-success',
  error: 'ba-warning',
};

// 新decorationId → 旧typeのマッピング（後方互換性用）
const DECORATION_ID_TO_LEGACY_TYPE: Record<string, string> = {
  'ba-point': 'info',
  'ba-warning': 'warning',
  'ba-success': 'success',
  'ba-highlight': 'info',
  'ba-quote': 'info',
  'ba-summary': 'info',
  'ba-checklist': 'info',
  'ba-number-list': 'info',
};

/**
 * decorationIdから旧typeを推定（後方互換性用）
 */
function decorationIdToLegacyType(decorationId: string): string {
  return DECORATION_ID_TO_LEGACY_TYPE[decorationId] || 'info';
}

/**
 * カスタム装飾タグを抽出
 */
function extractCustomTags(markdown: string): { cleanMarkdown: string; tags: Map<string, CustomTag> } {
  const tags = new Map<string, CustomTag>();
  let cleanMarkdown = markdown;
  let placeholderIndex = 0;

  // 新形式: :::box id="ba-xxx" を抽出
  const boxIdPattern = /:::box\s+id="([^"]+)"[\s\S]*?\n([\s\S]*?):::/g;
  cleanMarkdown = cleanMarkdown.replace(boxIdPattern, (match, decorationId, content) => {
    const placeholder = `__CUSTOM_TAG_${placeholderIndex++}__`;
    tags.set(placeholder, {
      type: 'box',
      attributes: { decorationId },
      content: content.trim(),
      raw: match,
    });
    return placeholder;
  });

  // 旧形式: :::box type="info" を抽出（後方互換性）
  const boxTypePattern = /:::box\s+type="(info|warning|success|error)"[\s\S]*?\n([\s\S]*?):::/g;
  cleanMarkdown = cleanMarkdown.replace(boxTypePattern, (match, type, content) => {
    const placeholder = `__CUSTOM_TAG_${placeholderIndex++}__`;
    // 旧typeを新decorationIdに変換
    const decorationId = LEGACY_TYPE_TO_DECORATION_ID[type] || 'ba-point';
    tags.set(placeholder, {
      type: 'box',
      attributes: { decorationId, legacyType: type },
      content: content.trim(),
      raw: match,
    });
    return placeholder;
  });

  // 吹き出し装飾を抽出
  const balloonPattern = /:::balloon\s+position="(left|right)"\s+icon="([^"]+)"[\s\S]*?\n([\s\S]*?):::/g;
  cleanMarkdown = cleanMarkdown.replace(balloonPattern, (match, position, icon, content) => {
    const placeholder = `__CUSTOM_TAG_${placeholderIndex++}__`;
    tags.set(placeholder, {
      type: 'balloon',
      attributes: { position, icon },
      content: content.trim(),
      raw: match,
    });
    return placeholder;
  });

  return { cleanMarkdown, tags };
}

/**
 * HTMLパーサー用のヘルパー関数
 */
function parseHTMLToElements(html: string): Element[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return Array.from(doc.body.children);
}

/**
 * HTMLの見出し要素からレベルを取得
 */
function getHeadingLevel(tagName: string): number {
  const match = tagName.match(/^H(\d)$/i);
  return match ? parseInt(match[1], 10) : 2;
}

/**
 * リスト要素をGutenbergブロックの形式に変換
 */
function convertListToBlockFormat(listElement: Element): string {
  const items = listElement.querySelectorAll(':scope > li');
  return Array.from(items)
    .map((li) => `<li>${li.innerHTML}</li>`)
    .join('');
}

/**
 * 単一のHTML要素をGutenbergブロックに変換
 */
function convertElementToBlock(element: Element, customTags: Map<string, CustomTag>): BlockInstance | null {
  const tagName = element.tagName.toUpperCase();
  const textContent = element.textContent || '';

  // カスタムタグのプレースホルダーをチェック
  if (textContent.startsWith('__CUSTOM_TAG_') && textContent.endsWith('__')) {
    const tag = customTags.get(textContent.trim());
    if (tag) {
      if (tag.type === 'box') {
        // 新形式: decorationIdを直接使用
        const decorationId = tag.attributes.decorationId;
        // 旧形式との互換性のためtypeも設定（decorationIdから推定）
        const legacyType = tag.attributes.legacyType || decorationIdToLegacyType(decorationId);
        return createBlock('blog-agent/box', {
          type: legacyType as BoxType,
          decorationId: decorationId,
          content: tag.content,
        });
      }
      if (tag.type === 'balloon') {
        return createBlock('blog-agent/balloon', {
          position: tag.attributes.position as BalloonPosition,
          icon: tag.attributes.icon,
          content: tag.content,
        });
      }
    }
  }

  // 見出し
  if (/^H[1-6]$/.test(tagName)) {
    return createBlock('core/heading', {
      content: element.innerHTML,
      level: getHeadingLevel(tagName),
    });
  }

  // 段落
  if (tagName === 'P') {
    // 段落内にカスタムタグがある場合をチェック
    const customTagMatch = textContent.match(/__CUSTOM_TAG_\d+__/);
    if (customTagMatch) {
      const tag = customTags.get(customTagMatch[0]);
      if (tag) {
        if (tag.type === 'box') {
          // 新形式: decorationIdを直接使用
          const decorationId = tag.attributes.decorationId;
          const legacyType = tag.attributes.legacyType || decorationIdToLegacyType(decorationId);
          return createBlock('blog-agent/box', {
            type: legacyType as BoxType,
            decorationId: decorationId,
            content: tag.content,
          });
        }
        if (tag.type === 'balloon') {
          return createBlock('blog-agent/balloon', {
            position: tag.attributes.position as BalloonPosition,
            icon: tag.attributes.icon,
            content: tag.content,
          });
        }
      }
    }

    return createBlock('core/paragraph', {
      content: element.innerHTML,
    });
  }

  // 順序なしリスト
  if (tagName === 'UL') {
    return createBlock('core/list', {
      ordered: false,
      values: convertListToBlockFormat(element),
    });
  }

  // 順序付きリスト
  if (tagName === 'OL') {
    return createBlock('core/list', {
      ordered: true,
      values: convertListToBlockFormat(element),
    });
  }

  // 引用
  if (tagName === 'BLOCKQUOTE') {
    const cite = element.querySelector('cite');
    const citation = cite ? cite.textContent || '' : '';
    const value = element.innerHTML.replace(/<cite[^>]*>.*?<\/cite>/gi, '');

    return createBlock('core/quote', {
      value: value,
      citation: citation,
    });
  }

  // コードブロック
  if (tagName === 'PRE') {
    const codeElement = element.querySelector('code');
    const code = codeElement ? codeElement.textContent || '' : element.textContent || '';
    const language = codeElement?.className.replace('language-', '') || '';

    return createBlock('core/code', {
      content: code,
      language: language,
    });
  }

  // 画像
  if (tagName === 'IMG') {
    const img = element as HTMLImageElement;
    return createBlock('core/image', {
      url: img.src,
      alt: img.alt,
      caption: img.title || '',
    });
  }

  // 画像を含むfigure
  if (tagName === 'FIGURE') {
    const img = element.querySelector('img');
    const figcaption = element.querySelector('figcaption');

    if (img) {
      return createBlock('core/image', {
        url: img.src,
        alt: img.alt,
        caption: figcaption?.textContent || '',
      });
    }
  }

  // 水平線
  if (tagName === 'HR') {
    return createBlock('core/separator', {});
  }

  // テーブル
  if (tagName === 'TABLE') {
    return createBlock('core/table', {
      body: parseTableBody(element),
      head: parseTableHead(element),
    });
  }

  // その他の要素は段落として扱う
  if (element.innerHTML.trim()) {
    return createBlock('core/paragraph', {
      content: element.innerHTML,
    });
  }

  return null;
}

/**
 * テーブルのヘッダーを解析
 */
function parseTableHead(table: Element): Array<{ cells: Array<{ content: string }> }> {
  const thead = table.querySelector('thead');
  if (!thead) return [];

  const rows = thead.querySelectorAll('tr');
  return Array.from(rows).map((row) => ({
    cells: Array.from(row.querySelectorAll('th, td')).map((cell) => ({
      content: cell.textContent || '',
    })),
  }));
}

/**
 * テーブルの本文を解析
 */
function parseTableBody(table: Element): Array<{ cells: Array<{ content: string }> }> {
  const tbody = table.querySelector('tbody') || table;
  const rows = tbody.querySelectorAll('tr');

  return Array.from(rows).map((row) => ({
    cells: Array.from(row.querySelectorAll('td')).map((cell) => ({
      content: cell.textContent || '',
    })),
  }));
}

/**
 * MarkdownをGutenbergブロックの配列に変換
 */
export function markdownToBlocks(markdown: string): BlockInstance[] {
  initializeBlocks();

  // カスタムタグを抽出
  const { cleanMarkdown, tags } = extractCustomTags(markdown);

  // MarkdownをHTMLに変換
  const rawHtml = marked.parse(cleanMarkdown) as string;

  // HTMLをサニタイズ
  const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'ul', 'ol', 'li',
      'blockquote', 'cite',
      'pre', 'code',
      'a', 'strong', 'em', 'del', 'mark',
      'img', 'figure', 'figcaption',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'],
  });

  // HTMLをDOM要素に変換
  const elements = parseHTMLToElements(sanitizedHtml);

  // 各要素をブロックに変換
  const blocks: BlockInstance[] = [];
  for (const element of elements) {
    const block = convertElementToBlock(element, tags);
    if (block) {
      blocks.push(block);
    }
  }

  return blocks;
}

/**
 * MarkdownをGutenberg HTML（WordPress形式）に変換
 */
export function markdownToGutenbergHtml(markdown: string): string {
  const blocks = markdownToBlocks(markdown);
  return serialize(blocks);
}

/**
 * GutenbergブロックをMarkdownに変換（逆変換）
 */
export function blocksToMarkdown(blocks: BlockInstance[]): string {
  const markdownParts: string[] = [];

  for (const block of blocks) {
    const markdown = blockToMarkdown(block);
    if (markdown) {
      markdownParts.push(markdown);
    }
  }

  return markdownParts.join('\n\n');
}

/**
 * 単一のブロックをMarkdownに変換
 */
function blockToMarkdown(block: BlockInstance): string {
  const { name, attributes } = block;

  switch (name) {
    case 'core/paragraph':
      return stripHtml(attributes.content as string);

    case 'core/heading': {
      const level = attributes.level as number || 2;
      const prefix = '#'.repeat(level);
      return `${prefix} ${stripHtml(attributes.content as string)}`;
    }

    case 'core/list': {
      const ordered = attributes.ordered as boolean;
      const values = attributes.values as string;
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<ul>${values}</ul>`, 'text/html');
      const items = doc.querySelectorAll('li');
      return Array.from(items)
        .map((item, index) => {
          const prefix = ordered ? `${index + 1}.` : '-';
          return `${prefix} ${item.textContent}`;
        })
        .join('\n');
    }

    case 'core/quote': {
      const value = stripHtml(attributes.value as string);
      const citation = attributes.citation as string;
      const lines = value.split('\n').map((line) => `> ${line}`);
      if (citation) {
        lines.push(`> — ${citation}`);
      }
      return lines.join('\n');
    }

    case 'core/code':
      return `\`\`\`${attributes.language || ''}\n${attributes.content}\n\`\`\``;

    case 'core/image': {
      const alt = attributes.alt as string || '';
      const url = attributes.url as string || '';
      return `![${alt}](${url})`;
    }

    case 'core/separator':
      return '---';

    case 'core/table': {
      const head = attributes.head as Array<{ cells: Array<{ content: string }> }> || [];
      const body = attributes.body as Array<{ cells: Array<{ content: string }> }> || [];
      const lines: string[] = [];

      // ヘッダー行
      if (head.length > 0) {
        const headerRow = head[0];
        const headerCells = headerRow.cells.map((cell) => cell.content || '');
        lines.push('| ' + headerCells.join(' | ') + ' |');
        // 区切り行
        lines.push('| ' + headerCells.map(() => '---').join(' | ') + ' |');
      }

      // ボディ行
      for (const row of body) {
        const cells = row.cells.map((cell) => cell.content || '');
        lines.push('| ' + cells.join(' | ') + ' |');
      }

      return lines.join('\n');
    }

    case 'blog-agent/box':
      // 新形式: decorationIdがある場合はそれを使用
      if (attributes.decorationId) {
        return `:::box id="${attributes.decorationId}"\n${attributes.content}\n:::`;
      }
      // 旧形式: typeを使用（後方互換性）
      return `:::box type="${attributes.type}"\n${attributes.content}\n:::`;

    case 'blog-agent/balloon':
      return `:::balloon position="${attributes.position}" icon="${attributes.icon}"\n${attributes.content}\n:::`;

    default:
      return '';
  }
}

/**
 * HTMLタグを除去
 */
function stripHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

/**
 * ブロックが空かどうかをチェック
 */
export function isBlockEmpty(block: BlockInstance): boolean {
  const { name, attributes } = block;

  switch (name) {
    case 'core/paragraph':
    case 'core/heading':
      return !attributes.content || stripHtml(attributes.content as string).trim() === '';

    case 'core/list':
      return !attributes.values || stripHtml(attributes.values as string).trim() === '';

    case 'core/quote':
      return !attributes.value || stripHtml(attributes.value as string).trim() === '';

    case 'core/code':
      return !attributes.content || (attributes.content as string).trim() === '';

    case 'core/image':
      return !attributes.url;

    case 'blog-agent/box':
    case 'blog-agent/balloon':
      return !attributes.content || (attributes.content as string).trim() === '';

    default:
      return false;
  }
}

/**
 * ブロック配列から空のブロックを除去
 */
export function removeEmptyBlocks(blocks: BlockInstance[]): BlockInstance[] {
  return blocks.filter((block) => !isBlockEmpty(block));
}
