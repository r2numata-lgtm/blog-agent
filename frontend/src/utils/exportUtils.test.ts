/**
 * exportUtils ユニットテスト
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  countWords,
  exportAsGutenberg,
  exportAsHtml,
  exportAsJson,
  generateMeta,
  downloadFile,
} from './exportUtils';

// @wordpress/blocks のモック
vi.mock('@wordpress/blocks', () => ({
  serialize: vi.fn((blocks) => {
    return blocks.map((block: { name: string; attributes: { content?: string } }) => {
      if (block.name === 'core/paragraph') {
        return `<!-- wp:paragraph -->\n<p>${block.attributes.content}</p>\n<!-- /wp:paragraph -->`;
      }
      if (block.name === 'core/heading') {
        return `<!-- wp:heading -->\n<h2>${block.attributes.content}</h2>\n<!-- /wp:heading -->`;
      }
      return '';
    }).join('\n\n');
  }),
}));

describe('exportUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('countWords', () => {
    it('日本語テキストの文字数をカウントする', () => {
      const blocks = [
        {
          name: 'core/paragraph',
          attributes: { content: 'これはテストです。' },
          innerBlocks: [],
        },
      ];
      const count = countWords(blocks);
      expect(count).toBe(9);
    });

    it('空のブロック配列は0を返す', () => {
      const count = countWords([]);
      expect(count).toBe(0);
    });

    it('入れ子ブロックのテキストもカウントする', () => {
      const blocks = [
        {
          name: 'core/group',
          attributes: {},
          innerBlocks: [
            {
              name: 'core/paragraph',
              attributes: { content: 'テスト' },
              innerBlocks: [],
            },
          ],
        },
      ];
      const count = countWords(blocks);
      expect(count).toBe(3);
    });
  });

  describe('exportAsGutenberg', () => {
    it('ブロックをGutenberg形式でエクスポートする', () => {
      const blocks = [
        {
          name: 'core/paragraph',
          attributes: { content: 'テスト段落' },
          innerBlocks: [],
        },
      ];
      const result = exportAsGutenberg(blocks);
      expect(result).toContain('<!-- wp:paragraph -->');
      expect(result).toContain('<p>テスト段落</p>');
    });
  });

  describe('exportAsHtml', () => {
    it('純粋なHTMLとしてエクスポートする（WordPressコメントなし）', () => {
      const blocks = [
        {
          name: 'core/paragraph',
          attributes: { content: 'テスト段落' },
          innerBlocks: [],
        },
      ];
      const result = exportAsHtml(blocks);
      expect(result).not.toContain('<!-- wp:');
      expect(result).toContain('<p>テスト段落</p>');
      expect(result).toContain('<!DOCTYPE html>');
    });

    it('メタ情報を含むHTMLを生成する', () => {
      const blocks = [
        {
          name: 'core/paragraph',
          attributes: { content: 'テスト' },
          innerBlocks: [],
        },
      ];
      const meta = {
        title: 'テストタイトル',
        description: 'テスト説明',
        keywords: ['キーワード1', 'キーワード2'],
      };
      const result = exportAsHtml(blocks, meta);
      expect(result).toContain('<title>テストタイトル</title>');
      expect(result).toContain('content="テスト説明"');
      expect(result).toContain('キーワード1, キーワード2');
    });
  });

  describe('exportAsJson', () => {
    it('JSON形式でエクスポートする', () => {
      const blocks = [
        {
          name: 'core/paragraph',
          attributes: { content: 'テスト' },
          innerBlocks: [],
        },
      ];
      const result = exportAsJson(blocks);
      expect(result.version).toBe('1.0');
      expect(result.meta.blockCount).toBe(1);
      expect(result.content.blocks).toHaveLength(1);
      expect(result.content.blocks[0].name).toBe('core/paragraph');
    });

    it('メタ情報を含む', () => {
      const blocks = [
        {
          name: 'core/paragraph',
          attributes: { content: 'テスト' },
          innerBlocks: [],
        },
      ];
      const meta = {
        title: 'テストタイトル',
        author: 'テスト著者',
      };
      const result = exportAsJson(blocks, meta);
      expect(result.meta.title).toBe('テストタイトル');
      expect(result.meta.author).toBe('テスト著者');
    });
  });

  describe('generateMeta', () => {
    it('ブロックからメタ情報を生成する', () => {
      const blocks = [
        {
          name: 'core/heading',
          attributes: { content: 'テストタイトル' },
          innerBlocks: [],
        },
        {
          name: 'core/paragraph',
          attributes: { content: 'これはテスト用の段落です。説明文として使用されます。' },
          innerBlocks: [],
        },
      ];
      const meta = generateMeta(blocks);
      expect(meta.title).toBe('テストタイトル');
      expect(meta.description).toContain('これはテスト用の段落です');
      expect(meta.blockCount).toBe(2);
    });

    it('既存のメタ情報を保持する', () => {
      const blocks = [
        {
          name: 'core/paragraph',
          attributes: { content: 'テスト' },
          innerBlocks: [],
        },
      ];
      const existingMeta = {
        title: '既存タイトル',
        author: '既存著者',
      };
      const meta = generateMeta(blocks, existingMeta);
      expect(meta.title).toBe('既存タイトル');
      expect(meta.author).toBe('既存著者');
    });
  });

  describe('downloadFile', () => {
    it('Blobを作成してダウンロードリンクをクリックする', () => {
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');
      const clickSpy = vi.fn();

      // createElement をモック
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'a') {
          element.click = clickSpy;
        }
        return element;
      });

      downloadFile('テストコンテンツ', 'test.txt', 'text/plain');

      expect(appendChildSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
    });
  });
});
