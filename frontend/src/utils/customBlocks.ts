/**
 * カスタムブロック定義
 * Phase 2: P2-06 Gutenbergブロック生成ロジック
 *
 * 装飾ボックス、吹き出しなどのカスタムブロックを定義
 */

import { registerBlockType } from '@wordpress/blocks';
import { createElement } from '@wordpress/element';

// Gutenbergブロックの属性とsetAttributes関数の型
interface BlockEditProps<T> {
  attributes: T;
  setAttributes: (attrs: Partial<T>) => void;
}

interface BlockSaveProps<T> {
  attributes: T;
}

// ボックスブロックの属性
interface BoxAttributes {
  type: BoxType;
  decorationId?: string; // 新形式: 装飾ID (例: 'ba-point', 'ba-warning')
  content: string;
}

// 吹き出しブロックの属性
interface BalloonAttributes {
  position: BalloonPosition;
  icon: string;
  content: string;
}

// カスタムブロックの登録状態
let customBlocksRegistered = false;

/**
 * 情報ボックスの種類
 */
export type BoxType = 'info' | 'warning' | 'success' | 'error';

/**
 * 吹き出しの位置
 */
export type BalloonPosition = 'left' | 'right';

/**
 * ボックスタイプごとのスタイル設定
 */
export const boxStyles: Record<
  BoxType,
  { bgColor: string; borderColor: string; icon: string; label: string }
> = {
  info: {
    bgColor: '#e7f3ff',
    borderColor: '#2196f3',
    icon: 'ℹ️',
    label: '情報',
  },
  warning: {
    bgColor: '#fff3e0',
    borderColor: '#ff9800',
    icon: '⚠️',
    label: '警告',
  },
  success: {
    bgColor: '#e8f5e9',
    borderColor: '#4caf50',
    icon: '✅',
    label: '成功',
  },
  error: {
    bgColor: '#ffebee',
    borderColor: '#f44336',
    icon: '❌',
    label: 'エラー',
  },
};

/**
 * カスタムブロックを登録
 */
export function registerCustomBlocks(): void {
  if (customBlocksRegistered) {
    return;
  }

  // 装飾ボックスブロック
  registerBlockType('blog-agent/box', {
    title: '装飾ボックス',
    icon: 'info-outline',
    category: 'formatting',
    attributes: {
      type: {
        type: 'string',
        default: 'info',
      },
      decorationId: {
        type: 'string',
        default: '',
      },
      content: {
        type: 'string',
        default: '',
      },
    },
    edit: ({ attributes, setAttributes }: BlockEditProps<BoxAttributes>) => {
      const { type, content } = attributes;
      const style = boxStyles[type] || boxStyles.info;

      return createElement(
        'div',
        {
          style: {
            backgroundColor: style.bgColor,
            borderLeft: `4px solid ${style.borderColor}`,
            padding: '16px',
            margin: '16px 0',
            borderRadius: '4px',
          },
        },
        createElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
              fontWeight: 'bold',
            },
          },
          style.icon,
          style.label
        ),
        createElement('textarea', {
          value: content,
          onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setAttributes({ content: e.target.value }),
          style: {
            width: '100%',
            minHeight: '60px',
            border: 'none',
            background: 'transparent',
            resize: 'vertical',
          },
          placeholder: '内容を入力...',
        })
      );
    },
    save: ({ attributes }: BlockSaveProps<BoxAttributes>) => {
      const { type, decorationId, content } = attributes;
      const style = boxStyles[type] || boxStyles.info;

      // 新形式: decorationIdがある場合はそれをクラス名として使用
      // 旧形式: blog-agent-box-${type} を使用（後方互換性）
      // 注: ba-article は記事全体のラッパーに使用するため、装飾ブロックには含めない
      const className = decorationId || `blog-agent-box blog-agent-box-${type}`;

      // 新形式の場合はインラインスタイルを使わない（CSSで定義）
      const inlineStyle = decorationId
        ? undefined
        : {
            backgroundColor: style.bgColor,
            borderLeft: `4px solid ${style.borderColor}`,
            padding: '16px',
            margin: '16px 0',
            borderRadius: '4px',
          };

      return createElement(
        'div',
        {
          className: className,
          style: inlineStyle,
        },
        // 新形式の場合はヘッダーを表示しない（CSSの::beforeで表示）
        decorationId
          ? null
          : createElement(
              'div',
              {
                className: 'blog-agent-box-header',
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px',
                  fontWeight: 'bold',
                },
              },
              style.icon,
              style.label
            ),
        createElement('div', {
          className: decorationId ? undefined : 'blog-agent-box-content',
          dangerouslySetInnerHTML: { __html: content },
        })
      );
    },
  });

  // 吹き出しブロック
  registerBlockType('blog-agent/balloon', {
    title: '吹き出し',
    icon: 'format-chat',
    category: 'formatting',
    attributes: {
      position: {
        type: 'string',
        default: 'left',
      },
      icon: {
        type: 'string',
        default: '😊',
      },
      content: {
        type: 'string',
        default: '',
      },
    },
    edit: ({ attributes, setAttributes }: BlockEditProps<BalloonAttributes>) => {
      const { position, icon, content } = attributes;
      const isLeft = position === 'left';

      return createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: isLeft ? 'row' : 'row-reverse',
            alignItems: 'flex-start',
            gap: '12px',
            margin: '16px 0',
          },
        },
        createElement(
          'div',
          {
            style: {
              fontSize: '2em',
              flexShrink: 0,
            },
          },
          createElement('input', {
            type: 'text',
            value: icon,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              setAttributes({ icon: e.target.value }),
            style: {
              width: '40px',
              textAlign: 'center',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1em',
            },
          })
        ),
        createElement(
          'div',
          {
            style: {
              backgroundColor: isLeft ? '#f0f0f0' : '#e3f2fd',
              padding: '12px 16px',
              borderRadius: '12px',
              maxWidth: '80%',
              position: 'relative',
            },
          },
          createElement('textarea', {
            value: content,
            onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setAttributes({ content: e.target.value }),
            style: {
              width: '100%',
              minHeight: '40px',
              border: 'none',
              background: 'transparent',
              resize: 'vertical',
            },
            placeholder: '吹き出しの内容...',
          })
        )
      );
    },
    save: ({ attributes }: BlockSaveProps<BalloonAttributes>) => {
      const { position, icon, content } = attributes;
      const isLeft = position === 'left';

      return createElement(
        'div',
        {
          className: `blog-agent-balloon blog-agent-balloon-${position}`,
          style: {
            display: 'flex',
            flexDirection: isLeft ? 'row' : 'row-reverse',
            alignItems: 'flex-start',
            gap: '12px',
            margin: '16px 0',
          },
        },
        createElement(
          'div',
          {
            className: 'blog-agent-balloon-icon',
            style: { fontSize: '2em', flexShrink: 0 },
          },
          icon
        ),
        createElement(
          'div',
          {
            className: 'blog-agent-balloon-content',
            style: {
              backgroundColor: isLeft ? '#f0f0f0' : '#e3f2fd',
              padding: '12px 16px',
              borderRadius: '12px',
              maxWidth: '80%',
            },
          },
          createElement('div', {
            dangerouslySetInnerHTML: { __html: content },
          })
        )
      );
    },
  });

  customBlocksRegistered = true;
}

/**
 * カスタムブロックがすでに登録されているか確認
 */
export function areCustomBlocksRegistered(): boolean {
  return customBlocksRegistered;
}
