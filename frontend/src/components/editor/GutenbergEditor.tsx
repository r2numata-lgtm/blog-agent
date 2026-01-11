/**
 * GutenbergEditor - 本格的なブロックエディタコンポーネント
 * Phase 4: P4-01 Gutenbergライブラリ統合
 */

import { useState, useCallback, useEffect } from 'react';
import {
  BlockEditorProvider,
  BlockList,
  BlockTools,
  WritingFlow,
  ObserveTyping,
  BlockInspector,
} from '@wordpress/block-editor';
import { Popover, SlotFillProvider } from '@wordpress/components';
import { createBlock, serialize, parse } from '@wordpress/blocks';
import { registerCoreBlocks } from '@wordpress/block-library';
import { registerCustomBlocks } from '../../utils/customBlocks';

// WordPress スタイルのインポート
import '@wordpress/components/build-style/style.css';
import '@wordpress/block-editor/build-style/style.css';
import '@wordpress/block-library/build-style/style.css';
import '@wordpress/block-library/build-style/editor.css';

// Gutenbergブロックインスタンスの型
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BlockInstance = any;

// ブロックの登録状態
let blocksInitialized = false;

/**
 * ブロックライブラリを初期化
 */
function initializeBlockLibrary(): void {
  if (blocksInitialized) {
    return;
  }

  registerCoreBlocks();
  registerCustomBlocks();
  blocksInitialized = true;
}

// エディタのProps
interface GutenbergEditorProps {
  /** 初期コンテンツ（Gutenberg HTML形式） */
  initialContent?: string;
  /** コンテンツ変更時のコールバック */
  onChange?: (content: string, blocks: BlockInstance[]) => void;
  /** 自動保存間隔（ミリ秒、0で無効） */
  autoSaveInterval?: number;
  /** プレースホルダーテキスト */
  placeholder?: string;
  /** エディタの高さ */
  height?: string;
  /** インスペクターパネルを表示するか */
  showInspector?: boolean;
}

/**
 * GutenbergEditor コンポーネント
 */
const GutenbergEditor: React.FC<GutenbergEditorProps> = ({
  initialContent = '',
  onChange,
  autoSaveInterval = 0,
  placeholder = 'ここに入力を開始...',
  height = '500px',
  showInspector = true,
}) => {
  // ブロックライブラリを初期化
  useEffect(() => {
    initializeBlockLibrary();
  }, []);

  // ブロック状態
  const [blocks, setBlocks] = useState<BlockInstance[]>(() => {
    if (initialContent) {
      try {
        return parse(initialContent);
      } catch (e) {
        console.error('Failed to parse initial content:', e);
        return [createBlock('core/paragraph', { content: '' })];
      }
    }
    return [createBlock('core/paragraph', { content: '', placeholder })];
  });

  // 自動保存タイマー
  useEffect(() => {
    if (autoSaveInterval <= 0 || !onChange) return;

    const timer = setInterval(() => {
      const html = serialize(blocks);
      onChange(html, blocks);
    }, autoSaveInterval);

    return () => clearInterval(timer);
  }, [blocks, autoSaveInterval, onChange]);

  // ブロック更新ハンドラ
  const handleBlocksChange = useCallback(
    (newBlocks: BlockInstance[]) => {
      setBlocks(newBlocks);
      if (onChange) {
        const html = serialize(newBlocks);
        onChange(html, newBlocks);
      }
    },
    [onChange]
  );

  // 設定オブジェクト
  const settings = {
    hasFixedToolbar: true,
    focusMode: false,
    hasUploadPermissions: false,
    codeEditingEnabled: true,
    canLockBlocks: false,
    enableOpenverseMediaCategory: false,
    generateAnchors: true,
    __experimentalCanUserUseUnfilteredHTML: true,
    isDistractionFree: false,
  };

  return (
    <div className="gutenberg-editor-wrapper" style={{ height }}>
      <SlotFillProvider>
        <BlockEditorProvider
          value={blocks}
          onInput={handleBlocksChange}
          onChange={handleBlocksChange}
          settings={settings}
        >
          <div className="gutenberg-editor-layout">
            {/* メインエディタエリア */}
            <div className="gutenberg-editor-main">
              <BlockTools>
                <WritingFlow>
                  <ObserveTyping>
                    <BlockList />
                  </ObserveTyping>
                </WritingFlow>
              </BlockTools>
            </div>

            {/* インスペクターパネル（サイドバー） */}
            {showInspector && (
              <div className="gutenberg-editor-sidebar">
                <div className="gutenberg-editor-sidebar-header">
                  <h3>ブロック設定</h3>
                </div>
                <div className="gutenberg-editor-sidebar-content">
                  <BlockInspector />
                </div>
              </div>
            )}
          </div>

          {/* ポップオーバー用スロット */}
          <Popover.Slot />
        </BlockEditorProvider>
      </SlotFillProvider>

      <style>{`
        .gutenberg-editor-wrapper {
          display: flex;
          flex-direction: column;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
          background: #fff;
        }

        .gutenberg-editor-layout {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .gutenberg-editor-main {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          background: #fff;
        }

        .gutenberg-editor-sidebar {
          width: 280px;
          border-left: 1px solid #e0e0e0;
          background: #f9f9f9;
          overflow-y: auto;
        }

        .gutenberg-editor-sidebar-header {
          padding: 12px 16px;
          border-bottom: 1px solid #e0e0e0;
          background: #fff;
        }

        .gutenberg-editor-sidebar-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #1e1e1e;
        }

        .gutenberg-editor-sidebar-content {
          padding: 16px;
        }

        /* WordPress ブロックエディタのスタイル調整 */
        .block-editor-writing-flow {
          min-height: 300px;
        }

        .block-editor-block-list__layout {
          padding: 0;
        }

        .wp-block {
          max-width: none;
        }

        /* ブロックのホバー・選択スタイル */
        .wp-block:not(.is-selected):hover {
          outline: 1px dashed #007cba;
        }

        .wp-block.is-selected {
          outline: 2px solid #007cba;
        }

        /* ブロック追加ボタン */
        .block-editor-default-block-appender {
          margin-top: 20px;
        }

        /* インスペクターパネルのスタイル */
        .block-editor-block-inspector {
          padding: 0;
        }

        .block-editor-block-inspector .components-panel__body {
          border: none;
          border-bottom: 1px solid #e0e0e0;
        }

        /* コンポーネントパネルのスタイル */
        .components-panel__body-title button {
          font-size: 13px;
        }
      `}</style>
    </div>
  );
};

export default GutenbergEditor;
