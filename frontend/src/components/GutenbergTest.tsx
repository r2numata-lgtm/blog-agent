import React, { useState } from 'react';
import { createBlock, serialize } from '@wordpress/blocks';
import { registerCoreBlocks } from '@wordpress/block-library';
import '@wordpress/components/build-style/style.css';
import '@wordpress/block-editor/build-style/style.css';

// Gutenbergのコアブロックを登録（初回のみ実行）
let blocksRegistered = false;
if (!blocksRegistered) {
  registerCoreBlocks();
  blocksRegistered = true;
}

/**
 * Gutenberg Library 技術検証コンポーネント（修正版）
 * 
 * 検証項目:
 * 1. ブロックデータの作成
 * 2. ブロックのHTML変換
 * 3. 基本的なブロックタイプの動作確認
 */
const GutenbergTest: React.FC = () => {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [htmlOutput, setHtmlOutput] = useState<string>('');

  // テスト1: 段落ブロックを作成
  const createParagraphBlock = () => {
    const newBlock = createBlock('core/paragraph', {
      content: 'これは段落ブロックのテストです。Gutenbergライブラリで生成しました。',
    });
    
    setBlocks([...blocks, newBlock]);
    console.log('段落ブロック作成:', newBlock);
  };

  // テスト2: 見出しブロックを作成
  const createHeadingBlock = () => {
    const newBlock = createBlock('core/heading', {
      content: '見出しブロックのテスト',
      level: 2,
    });
    
    setBlocks([...blocks, newBlock]);
    console.log('見出しブロック作成:', newBlock);
  };

  // テスト3: リストブロックを作成
  const createListBlock = () => {
    const newBlock = createBlock('core/list', {
      ordered: false,
      values: '<li>リスト項目1</li><li>リスト項目2</li><li>リスト項目3</li>',
    });
    
    setBlocks([...blocks, newBlock]);
    console.log('リストブロック作成:', newBlock);
  };

  // テスト4: 画像ブロックを作成
  const createImageBlock = () => {
    const newBlock = createBlock('core/image', {
      url: 'https://via.placeholder.com/600x400',
      alt: 'テスト画像',
      caption: '画像のキャプション',
    });
    
    setBlocks([...blocks, newBlock]);
    console.log('画像ブロック作成:', newBlock);
  };

  // テスト5: 引用ブロックを作成
  const createQuoteBlock = () => {
    const newBlock = createBlock('core/quote', {
      value: '<p>これは引用ブロックのテストです。</p>',
      citation: '出典: Blog Agent',
    });
    
    setBlocks([...blocks, newBlock]);
    console.log('引用ブロック作成:', newBlock);
  };

  // テスト6: コードブロックを作成
  const createCodeBlock = () => {
    const newBlock = createBlock('core/code', {
      content: 'const message = "Hello, Gutenberg!";\nconsole.log(message);',
    });
    
    setBlocks([...blocks, newBlock]);
    console.log('コードブロック作成:', newBlock);
  };

  // ブロックをHTMLに変換
  const convertToHTML = () => {
    try {
      if (blocks.length === 0) {
        setHtmlOutput('エラー: ブロックがありません');
        return;
      }

      const html = serialize(blocks);
      setHtmlOutput(html);
      console.log('生成されたHTML:', html);
      console.log('ブロック数:', blocks.length);
    } catch (error) {
      console.error('HTML変換エラー:', error);
      setHtmlOutput(`エラー: ${error}`);
    }
  };

  // ブロックをクリア
  const clearBlocks = () => {
    setBlocks([]);
    setHtmlOutput('');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        Gutenberg Library 技術検証
      </h1>

      {/* 検証ボタン群 */}
      <div className="mb-8 space-y-4">
        <h2 className="text-xl font-semibold mb-3">
          テスト1-6: ブロック作成
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={createParagraphBlock}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            段落ブロック作成
          </button>
          <button
            onClick={createHeadingBlock}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            見出しブロック作成
          </button>
          <button
            onClick={createListBlock}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            リストブロック作成
          </button>
          <button
            onClick={createImageBlock}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            画像ブロック作成
          </button>
          <button
            onClick={createQuoteBlock}
            className="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600"
          >
            引用ブロック作成
          </button>
          <button
            onClick={createCodeBlock}
            className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
          >
            コードブロック作成
          </button>
        </div>

        <h2 className="text-xl font-semibold mb-3 mt-6">
          テスト7: HTML変換
        </h2>
        <div className="flex gap-3">
          <button
            onClick={convertToHTML}
            className="px-4 py-2 bg-indigo-700 text-white rounded hover:bg-indigo-800"
            disabled={blocks.length === 0}
          >
            HTMLに変換 ({blocks.length}個のブロック)
          </button>
          <button
            onClick={clearBlocks}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            クリア
          </button>
        </div>
      </div>

      {/* 作成されたブロックの一覧 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-3">
          作成されたブロック ({blocks.length}個)
        </h2>
        <div className="border rounded-lg p-4 bg-gray-50 max-h-60 overflow-auto">
          {blocks.length === 0 ? (
            <p className="text-gray-500">ブロックを作成してください</p>
          ) : (
            <pre className="text-sm">
              {JSON.stringify(
                blocks.map(block => ({
                  name: block.name,
                  clientId: block.clientId,
                  attributes: block.attributes,
                })),
                null,
                2
              )}
            </pre>
          )}
        </div>
      </div>

      {/* HTML出力結果 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-3">
          生成されたHTML
        </h2>
        <div className="border rounded-lg p-4 bg-gray-50">
          {htmlOutput ? (
            <>
              <div className="mb-4">
                <h3 className="font-semibold mb-2">コード:</h3>
                <pre className="text-sm bg-white p-3 rounded border overflow-auto max-h-60">
                  {htmlOutput}
                </pre>
              </div>
              {!htmlOutput.startsWith('エラー') && (
                <div>
                  <h3 className="font-semibold mb-2">プレビュー:</h3>
                  <div 
                    className="bg-white p-3 rounded border prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: htmlOutput }}
                  />
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-500">
              ブロックを作成後、「HTMLに変換」ボタンを押してください
            </p>
          )}
        </div>
      </div>

      {/* 検証結果の判定 */}
      <div className="border-2 border-blue-500 rounded-lg p-4 bg-blue-50">
        <h2 className="text-xl font-semibold mb-3">✅ 検証チェックリスト</h2>
        <ul className="space-y-2">
          <li className={blocks.length > 0 ? 'text-green-600 font-semibold' : 'text-gray-500'}>
            {blocks.length > 0 ? '✓' : '○'} ブロックデータが作成できる
          </li>
          <li className={blocks.some(b => b.name === 'core/paragraph') ? 'text-green-600 font-semibold' : 'text-gray-500'}>
            {blocks.some(b => b.name === 'core/paragraph') ? '✓' : '○'} 段落ブロックが動作する
          </li>
          <li className={blocks.some(b => b.name === 'core/heading') ? 'text-green-600 font-semibold' : 'text-gray-500'}>
            {blocks.some(b => b.name === 'core/heading') ? '✓' : '○'} 見出しブロックが動作する
          </li>
          <li className={blocks.some(b => b.name === 'core/list') ? 'text-green-600 font-semibold' : 'text-gray-500'}>
            {blocks.some(b => b.name === 'core/list') ? '✓' : '○'} リストブロックが動作する
          </li>
          <li className={blocks.some(b => b.name === 'core/image') ? 'text-green-600 font-semibold' : 'text-gray-500'}>
            {blocks.some(b => b.name === 'core/image') ? '✓' : '○'} 画像ブロックが動作する
          </li>
          <li className={blocks.some(b => b.name === 'core/quote') ? 'text-green-600 font-semibold' : 'text-gray-500'}>
            {blocks.some(b => b.name === 'core/quote') ? '✓' : '○'} 引用ブロックが動作する
          </li>
          <li className={blocks.some(b => b.name === 'core/code') ? 'text-green-600 font-semibold' : 'text-gray-500'}>
            {blocks.some(b => b.name === 'core/code') ? '✓' : '○'} コードブロックが動作する
          </li>
          <li className={htmlOutput.length > 0 && !htmlOutput.startsWith('エラー') ? 'text-green-600 font-semibold' : 'text-gray-500'}>
            {htmlOutput.length > 0 && !htmlOutput.startsWith('エラー') ? '✓' : '○'} HTMLへの変換ができる
          </li>
          <li className={htmlOutput.includes('<!-- wp:') ? 'text-green-600 font-semibold' : 'text-gray-500'}>
            {htmlOutput.includes('<!-- wp:') ? '✓' : '○'} WordPress形式のコメントが含まれる
          </li>
        </ul>
      </div>

      {/* 注意事項 */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold mb-2">⚠️ 注意事項</h3>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>このテストは基本的なブロック作成とHTML変換のみを検証します</li>
          <li>実際のエディタUIは別途実装が必要です</li>
          <li>コンソールに詳細なログが出力されます（F12で確認）</li>
          <li>生成されたHTMLは、WordPressのGutenbergエディタに直接貼り付けて使用できます</li>
        </ul>
      </div>

      {/* 検証成功後の次のステップ */}
      {htmlOutput.includes('<!-- wp:') && (
        <div className="mt-6 p-4 bg-green-50 border-2 border-green-500 rounded-lg">
          <h3 className="font-semibold mb-2 text-green-800">🎉 検証成功!</h3>
          <p className="text-sm text-green-700 mb-3">
            Gutenbergライブラリは正常に動作しています。次のステップに進めます:
          </p>
          <ul className="text-sm space-y-1 list-disc list-inside text-green-700">
            <li>エディタUIの実装（BlockEditorコンポーネント）</li>
            <li>カスタムブロックの作成（装飾ボックス、吹き出し）</li>
            <li>データの永続化</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default GutenbergTest;