/**
 * EditorToolbar - エディタ上部のツールバーコンポーネント
 * Phase 4: P4-01 Gutenbergライブラリ統合
 */

import { useState, useCallback } from 'react';
import { createBlock } from '@wordpress/blocks';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BlockInstance = any;

// ツールバーのProps
interface EditorToolbarProps {
  /** ブロック追加時のコールバック */
  onAddBlock?: (block: BlockInstance) => void;
  /** 元に戻す */
  onUndo?: () => void;
  /** やり直す */
  onRedo?: () => void;
  /** 元に戻せるか */
  canUndo?: boolean;
  /** やり直せるか */
  canRedo?: boolean;
  /** プレビューモード切り替え */
  onTogglePreview?: () => void;
  /** プレビューモードかどうか */
  isPreviewMode?: boolean;
}

// ブロックタイプの定義
interface BlockType {
  name: string;
  label: string;
  icon: string;
  attributes?: Record<string, unknown>;
}

// 利用可能なブロックタイプ
const blockTypes: BlockType[] = [
  // 基本ブロック
  { name: 'core/paragraph', label: '段落', icon: 'P' },
  { name: 'core/heading', label: '見出し', icon: 'H', attributes: { level: 2 } },
  { name: 'core/list', label: 'リスト', icon: '-' },
  { name: 'core/quote', label: '引用', icon: '"' },
  { name: 'core/code', label: 'コード', icon: '</>' },
  { name: 'core/image', label: '画像', icon: 'IMG' },
  // 装飾ブロック
  { name: 'core/separator', label: '区切り線', icon: '―' },
  { name: 'core/table', label: '表', icon: 'TBL' },
  // カスタムブロック
  { name: 'blog-agent/box', label: '装飾ボックス', icon: 'BOX', attributes: { type: 'info' } },
  { name: 'blog-agent/balloon', label: '吹き出し', icon: 'BAL', attributes: { position: 'left' } },
];

/**
 * EditorToolbar コンポーネント
 */
const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onAddBlock,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onTogglePreview,
  isPreviewMode = false,
}) => {
  const [showBlockMenu, setShowBlockMenu] = useState(false);

  // ブロック追加ハンドラ
  const handleAddBlock = useCallback(
    (blockType: BlockType) => {
      if (onAddBlock) {
        const newBlock = createBlock(blockType.name, blockType.attributes || {});
        onAddBlock(newBlock);
      }
      setShowBlockMenu(false);
    },
    [onAddBlock]
  );

  return (
    <div className="editor-toolbar">
      {/* ブロック追加ボタン */}
      <div className="toolbar-group">
        <div className="block-add-wrapper">
          <button
            className="toolbar-button toolbar-button-primary"
            onClick={() => setShowBlockMenu(!showBlockMenu)}
            title="ブロックを追加"
          >
            <span className="toolbar-icon">+</span>
            <span className="toolbar-label">ブロック追加</span>
          </button>

          {/* ブロック選択メニュー */}
          {showBlockMenu && (
            <div className="block-menu">
              <div className="block-menu-header">
                <span>ブロックを選択</span>
                <button
                  className="block-menu-close"
                  onClick={() => setShowBlockMenu(false)}
                >
                  x
                </button>
              </div>
              <div className="block-menu-section">
                <div className="block-menu-section-title">基本ブロック</div>
                <div className="block-menu-items">
                  {blockTypes.slice(0, 6).map((type) => (
                    <button
                      key={type.name}
                      className="block-menu-item"
                      onClick={() => handleAddBlock(type)}
                    >
                      <span className="block-menu-item-icon">{type.icon}</span>
                      <span className="block-menu-item-label">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="block-menu-section">
                <div className="block-menu-section-title">装飾ブロック</div>
                <div className="block-menu-items">
                  {blockTypes.slice(6, 8).map((type) => (
                    <button
                      key={type.name}
                      className="block-menu-item"
                      onClick={() => handleAddBlock(type)}
                    >
                      <span className="block-menu-item-icon">{type.icon}</span>
                      <span className="block-menu-item-label">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="block-menu-section">
                <div className="block-menu-section-title">カスタムブロック</div>
                <div className="block-menu-items">
                  {blockTypes.slice(8).map((type) => (
                    <button
                      key={type.name}
                      className="block-menu-item"
                      onClick={() => handleAddBlock(type)}
                    >
                      <span className="block-menu-item-icon">{type.icon}</span>
                      <span className="block-menu-item-label">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 編集操作ボタン */}
      <div className="toolbar-group">
        <button
          className="toolbar-button"
          onClick={onUndo}
          disabled={!canUndo}
          title="元に戻す (Ctrl+Z)"
        >
          <span className="toolbar-icon">↩</span>
        </button>
        <button
          className="toolbar-button"
          onClick={onRedo}
          disabled={!canRedo}
          title="やり直す (Ctrl+Shift+Z)"
        >
          <span className="toolbar-icon">↪</span>
        </button>
      </div>

      {/* プレビューボタン */}
      {onTogglePreview && (
        <div className="toolbar-group toolbar-group-right">
          <button
            className={`toolbar-button ${isPreviewMode ? 'toolbar-button-active' : ''}`}
            onClick={onTogglePreview}
            title={isPreviewMode ? '編集モード' : 'プレビュー'}
          >
            <span className="toolbar-icon">{isPreviewMode ? 'E' : 'P'}</span>
            <span className="toolbar-label">{isPreviewMode ? '編集' : 'プレビュー'}</span>
          </button>
        </div>
      )}

      <style>{`
        .editor-toolbar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f9f9f9;
          border-bottom: 1px solid #e0e0e0;
        }

        .toolbar-group {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .toolbar-group-right {
          margin-left: auto;
        }

        .toolbar-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: #fff;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .toolbar-button:hover:not(:disabled) {
          background: #f0f0f0;
          border-color: #bbb;
        }

        .toolbar-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .toolbar-button-primary {
          background: #007cba;
          color: #fff;
          border-color: #007cba;
        }

        .toolbar-button-primary:hover:not(:disabled) {
          background: #006ba1;
          border-color: #006ba1;
        }

        .toolbar-button-active {
          background: #1e1e1e;
          color: #fff;
          border-color: #1e1e1e;
        }

        .toolbar-icon {
          font-weight: bold;
        }

        .toolbar-label {
          font-weight: 500;
        }

        /* ブロック追加メニュー */
        .block-add-wrapper {
          position: relative;
        }

        .block-menu {
          position: absolute;
          top: 100%;
          left: 0;
          z-index: 100;
          width: 280px;
          margin-top: 4px;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .block-menu-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #eee;
          font-weight: 600;
          font-size: 14px;
        }

        .block-menu-close {
          padding: 4px 8px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 16px;
          color: #666;
        }

        .block-menu-close:hover {
          color: #333;
        }

        .block-menu-section {
          padding: 8px;
        }

        .block-menu-section-title {
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
        }

        .block-menu-items {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
        }

        .block-menu-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px 8px;
          border: 1px solid transparent;
          border-radius: 4px;
          background: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .block-menu-item:hover {
          background: #f0f0f0;
          border-color: #ddd;
        }

        .block-menu-item-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: #e0e0e0;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
        }

        .block-menu-item-label {
          font-size: 11px;
          color: #333;
        }
      `}</style>
    </div>
  );
};

export default EditorToolbar;
