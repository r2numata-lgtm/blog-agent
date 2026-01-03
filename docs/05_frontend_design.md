# フロントエンド設計

**ドキュメントバージョン**: 1.1  
**最終更新日**: 2025-01-03  
**関連ドキュメント**: 02_architecture.md, 01_requirements.md

---

## 🎨 デザインシステム

### カラーパレット

```css
/* プライマリカラー */
--primary: #2563eb;
--primary-hover: #1d4ed8;
--primary-light: #3b82f6;

/* セカンダリカラー */
--secondary: #64748b;
--secondary-hover: #475569;

/* 状態カラー */
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;

/* ニュートラル */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-800: #1f2937;
--gray-900: #111827;

/* 背景 */
--bg-primary: #ffffff;
--bg-secondary: #f9fafb;
--bg-tertiary: #f3f4f6;
```

### タイポグラフィ

```css
/* フォントファミリー */
--font-sans: 'Inter', 'Noto Sans JP', sans-serif;
--font-mono: 'JetBrains Mono', monospace;

/* フォントサイズ */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
```

### スペーシング

```css
--spacing-1: 0.25rem;  /* 4px */
--spacing-2: 0.5rem;   /* 8px */
--spacing-3: 0.75rem;  /* 12px */
--spacing-4: 1rem;     /* 16px */
--spacing-6: 1.5rem;   /* 24px */
--spacing-8: 2rem;     /* 32px */
--spacing-12: 3rem;    /* 48px */
```

---

## 📱 画面設計

### 1. トップページ（/）

```
┌────────────────────────────────────┐
│  Header (Logo, Login, Signup)      │
├────────────────────────────────────┤
│                                    │
│  Hero Section                      │
│  - キャッチコピー                   │
│  - CTA（無料で始める）              │
│                                    │
├────────────────────────────────────┤
│  Features Section                  │
│  - 機能1 | 機能2 | 機能3            │
├────────────────────────────────────┤
│  How It Works                      │
│  1 → 2 → 3                         │
├────────────────────────────────────┤
│  Footer                            │
└────────────────────────────────────┘
```

---

### 2. 記事生成画面（/editor）

```
┌──────────────────────────────────────────────────────────┐
│  Header                                                  │
│  [Logo] [保存] [Markdown出力] [HTML出力] [ユーザー]      │
├──────────────────┬───────────────────────────────────────┤
│                  │                                       │
│  入力フォーム     │                                       │
│  ┌─────────────┐ │                                       │
│  │タイトル      │ │                                       │
│  │対象読者      │ │                                       │
│  │キーワード    │ │   プレビューエリア                     │
│  │本文要点      │ │                                       │
│  │文字数        │ │                                       │
│  └─────────────┘ │                                       │
│  [生成ボタン]     │                                       │
│                  │                                       │
├──────────────────┤                                       │
│                  │                                       │
│  エディタ         │                                       │
│  ┌─────────────┐ │                                       │
│  │Markdown      │ │                                       │
│  │エディタ      │ │                                       │
│  │             │ │                                       │
│  │             │ │                                       │
│  └─────────────┘ │                                       │
│  [装飾ツールバー] │                                       │
│                  │                                       │
└──────────────────┴───────────────────────────────────────┘
```

**レイアウト詳細**
- 左カラム: 400px固定
- 右カラム: 残り（flex-1）
- 最小幅: 1280px
- モバイル: 縦積み

---

### 3. 記事一覧画面（/articles）

```
┌────────────────────────────────────┐
│  Header                            │
├────────────────────────────────────┤
│  [新規作成] [検索] [フィルター]     │
├────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐        │
│  │記事カード│ │記事カード│        │
│  │- タイトル│ │- タイトル│        │
│  │- 日時    │ │- 日時    │        │
│  │- 文字数  │ │- 文字数  │        │
│  └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐        │
│  │記事カード│ │記事カード│        │
│  └──────────┘ └──────────┘        │
├────────────────────────────────────┤
│  [< 前へ] [1] [2] [3] [次へ >]     │
└────────────────────────────────────┘
```

---

## 🧩 コンポーネント設計

### コンポーネントツリー

```
src/
├── components/
│   ├── common/              # 共通コンポーネント
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.module.css
│   │   │   └── Button.test.tsx
│   │   ├── Input/
│   │   │   ├── Input.tsx
│   │   │   └── Input.test.tsx
│   │   ├── Modal/
│   │   ├── Loading/
│   │   ├── Toast/
│   │   └── Header/
│   │
│   ├── editor/              # エディタ関連
│   │   ├── MarkdownEditor/
│   │   │   ├── MarkdownEditor.tsx
│   │   │   ├── useEditor.ts
│   │   │   └── MarkdownEditor.test.tsx
│   │   ├── DecorationToolbar/
│   │   │   ├── DecorationToolbar.tsx
│   │   │   └── DecorationButton.tsx
│   │   ├── PreviewPane/
│   │   │   ├── PreviewPane.tsx
│   │   │   └── MarkdownRenderer.tsx
│   │   └── ArticleForm/
│   │       ├── ArticleForm.tsx
│   │       └── FormField.tsx
│   │
│   ├── export/              # 出力関連
│   │   ├── ExportPanel/
│   │   │   ├── ExportPanel.tsx
│   │   │   ├── FormatSelector.tsx
│   │   │   └── ExportButton.tsx
│   │   └── converters/
│   │       ├── markdownConverter.ts
│   │       ├── htmlConverter.ts
│   │       └── gutenbergConverter.ts (Phase 2)
│   │
│   ├── article/             # 記事関連
│   │   ├── ArticleCard/
│   │   │   ├── ArticleCard.tsx
│   │   │   └── ArticleCard.module.css
│   │   ├── ArticleList/
│   │   │   ├── ArticleList.tsx
│   │   │   └── Pagination.tsx
│   │   └── ArticleDetail/
│   │
│   └── layout/              # レイアウト
│       ├── MainLayout/
│       ├── EditorLayout/
│       └── AuthLayout/
│
├── utils/
│   ├── fileDownload.ts      # ファイルダウンロード処理
│   └── formatDate.ts        # 日付フォーマット
```

---

## 🔧 主要コンポーネント詳細

### Button コンポーネント

**Props定義**
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}
```

**使用例**
```tsx
<Button variant="primary" size="lg" onClick={handleGenerate}>
  記事を生成
</Button>
```

---

### MarkdownEditor コンポーネント

**Props定義**
```typescript
interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
}
```

**実装**
```tsx
import Editor from '@monaco-editor/react';

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  minHeight = '400px'
}) => {
  return (
    <Editor
      height={minHeight}
      defaultLanguage="markdown"
      value={value}
      onChange={(value) => onChange(value || '')}
      theme="vs-light"
      options={{
        minimap: { enabled: false },
        lineNumbers: 'on',
        wordWrap: 'on',
        fontSize: 14
      }}
    />
  );
};
```

---

### PreviewPane コンポーネント

**Props定義**
```typescript
interface PreviewPaneProps {
  markdown: string;
  decorations?: Decoration[];
}
```

**実装**
```tsx
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export const PreviewPane: React.FC<PreviewPaneProps> = ({ 
  markdown 
}) => {
  const html = useMemo(() => {
    const rawHtml = marked(markdown);
    const processedHtml = processDecorations(rawHtml);
    return DOMPurify.sanitize(processedHtml);
  }, [markdown]);

  return (
    <div 
      className="preview-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
```

---

### DecorationToolbar コンポーネント

**Props定義**
```typescript
interface DecorationToolbarProps {
  onInsert: (decoration: DecorationTag) => void;
}

type DecorationTag = {
  type: 'box' | 'balloon';
  template: string;
};
```

**実装**
```tsx
export const DecorationToolbar: React.FC<DecorationToolbarProps> = ({
  onInsert
}) => {
  const decorations: DecorationTag[] = [
    {
      type: 'box',
      template: ':::box type="info"\n\n:::'
    },
    {
      type: 'balloon',
      template: ':::balloon position="left"\n\n:::'
    }
  ];

  return (
    <div className="toolbar">
      {decorations.map((dec) => (
        <button
          key={dec.type}
          onClick={() => onInsert(dec)}
          className="toolbar-button"
        >
          {dec.type === 'box' ? '📦' : '💬'}
        </button>
      ))}
    </div>
  );
};
```

---

### ExportPanel コンポーネント

**Props定義**
```typescript
interface ExportPanelProps {
  markdown: string;
  title: string;
  onExport: (format: ExportFormat) => void;
}

type ExportFormat = 'markdown' | 'html' | 'gutenberg';
```

**使用例**
```tsx
<ExportPanel 
  markdown={currentMarkdown}
  title={articleTitle}
  onExport={handleExport}
/>
```

**実装**
```tsx
import { convertToHTML } from '../converters/htmlConverter';
import { convertToMarkdown } from '../converters/markdownConverter';
import { downloadFile, formatDate } from '@/utils/fileDownload';
import { toast } from 'react-hot-toast';

export const ExportPanel: React.FC<ExportPanelProps> = ({
  markdown,
  title,
  onExport
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('markdown');

  const handleDownload = () => {
    let content: string;
    let filename: string;
    let mimeType: string;

    switch(selectedFormat) {
      case 'markdown':
        content = convertToMarkdown(markdown);
        filename = `${title}_${formatDate()}.md`;
        mimeType = 'text/markdown';
        break;
      
      case 'html':
        content = convertToHTML(markdown);
        filename = `${title}_${formatDate()}.html`;
        mimeType = 'text/html';
        break;
      
      case 'gutenberg':
        content = convertToGutenberg(markdown);
        filename = `${title}_${formatDate()}.html`;
        mimeType = 'text/html';
        break;
    }

    downloadFile(content, filename, mimeType);
    onExport(selectedFormat);
  };

  const handleCopy = async () => {
    let content: string;
    
    switch(selectedFormat) {
      case 'markdown':
        content = convertToMarkdown(markdown);
        break;
      case 'html':
        content = convertToHTML(markdown);
        break;
      case 'gutenberg':
        content = convertToGutenberg(markdown);
        break;
    }

    await navigator.clipboard.writeText(content);
    toast.success('クリップボードにコピーしました');
  };

  return (
    <div className="export-panel bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">出力形式を選択</h3>
      
      <div className="format-selector flex gap-2 mb-4">
        <button
          className={`px-4 py-2 rounded ${
            selectedFormat === 'markdown' 
              ? 'bg-primary text-white' 
              : 'bg-gray-100 text-gray-700'
          }`}
          onClick={() => setSelectedFormat('markdown')}
        >
          📄 Markdown（推奨）
        </button>
        
        <button
          className={`px-4 py-2 rounded ${
            selectedFormat === 'html' 
              ? 'bg-primary text-white' 
              : 'bg-gray-100 text-gray-700'
          }`}
          onClick={() => setSelectedFormat('html')}
        >
          🌐 汎用HTML
        </button>
        
        {/* Phase 2で追加
        <button
          className={`px-4 py-2 rounded ${
            selectedFormat === 'gutenberg' 
              ? 'bg-primary text-white' 
              : 'bg-gray-100 text-gray-700'
          }`}
          onClick={() => setSelectedFormat('gutenberg')}
        >
          📦 Gutenberg
        </button>
        */}
      </div>

      <div className="format-description mb-4 p-3 bg-gray-50 rounded text-sm">
        {selectedFormat === 'markdown' && (
          <p>
            <strong className="text-success">推奨:</strong> WordPressに
            <a 
              href="https://jetpack.com/support/markdown/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary underline ml-1"
            >
              Jetpack Markdown
            </a>
            プラグインを導入してご使用ください。
          </p>
        )}
        {selectedFormat === 'html' && (
          <p className="text-gray-600">
            どのWordPressテーマでも動作しますが、テーマのデザインと合わない場合があります。
          </p>
        )}
      </div>

      <div className="export-actions flex gap-3">
        <Button variant="primary" onClick={handleDownload}>
          ⬇️ ダウンロード
        </Button>
        
        <Button variant="secondary" onClick={handleCopy}>
          📋 コピー
        </Button>
      </div>
    </div>
  );
};
```

---

## 🔌 変換ロジックの実装

### htmlConverter.ts

```typescript
import { marked } from 'marked';
import DOMPurify from 'dompurify';

/**
 * Markdownを汎用HTML（インラインCSS付き）に変換
 */
export const convertToHTML = (markdown: string): string => {
  // カスタムボックスの変換
  const processedMarkdown = markdown
    .replace(
      /:::box type="info"\n([\s\S]*?)\n:::/g,
      (_, content) => `<div class="custom-box custom-box-info" style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 16px; margin: 16px 0; border-radius: 4px;">${content.trim()}</div>`
    )
    .replace(
      /:::box type="warning"\n([\s\S]*?)\n:::/g,
      (_, content) => `<div class="custom-box custom-box-warning" style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 16px; margin: 16px 0; border-radius: 4px;">${content.trim()}</div>`
    )
    .replace(
      /:::box type="success"\n([\s\S]*?)\n:::/g,
      (_, content) => `<div class="custom-box custom-box-success" style="background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 16px; margin: 16px 0; border-radius: 4px;">${content.trim()}</div>`
    )
    .replace(
      /:::box type="error"\n([\s\S]*?)\n:::/g,
      (_, content) => `<div class="custom-box custom-box-error" style="background-color: #ffebee; border-left: 4px solid #f44336; padding: 16px; margin: 16px 0; border-radius: 4px;">${content.trim()}</div>`
    );

  // カスタム吹き出しの変換
  const processedWithBalloons = processedMarkdown
    .replace(
      /:::balloon position="left" icon="(.+?)"\n([\s\S]*?)\n:::/g,
      (_, icon, content) => `
        <div class="custom-balloon custom-balloon-left" style="position: relative; background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0 16px 60px;">
          <span style="position: absolute; left: -50px; top: 0; font-size: 40px;">${icon}</span>
          ${content.trim()}
        </div>
      `
    )
    .replace(
      /:::balloon position="right" icon="(.+?)"\n([\s\S]*?)\n:::/g,
      (_, icon, content) => `
        <div class="custom-balloon custom-balloon-right" style="position: relative; background: #e3f2fd; border-radius: 8px; padding: 16px; margin: 16px 60px 16px 0;">
          <span style="position: absolute; right: -50px; top: 0; font-size: 40px;">${icon}</span>
          ${content.trim()}
        </div>
      `
    );

  // 標準Markdownの変換
  const html = marked(processedWithBalloons);
  
  // XSS対策
  const sanitized = DOMPurify.sanitize(html);

  // 完全なHTMLドキュメントとして返す
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>記事HTML</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
    }
    p {
      margin-bottom: 16px;
    }
    code {
      background-color: #f6f8fa;
      padding: 2px 4px;
      border-radius: 3px;
      font-size: 85%;
    }
    pre {
      background-color: #f6f8fa;
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  ${sanitized}
</body>
</html>`;
};
```

### markdownConverter.ts

```typescript
/**
 * Markdown出力（そのまま返すだけだが、将来的な拡張のため関数化）
 */
export const convertToMarkdown = (markdown: string): string => {
  return markdown;
};
```

### fileDownload.ts

```typescript
/**
 * ファイルダウンロード処理
 */
export const downloadFile = (
  content: string,
  filename: string,
  mimeType: string
): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * 日付フォーマット（YYYYMMDDHHmmss）
 */
export const formatDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
};
```

---

## 🗂️ 状態管理

### Zustand ストア設計

**記事ストア**
```typescript
// src/stores/articleStore.ts
interface ArticleState {
  currentArticle: Article | null;
  articles: Article[];
  isGenerating: boolean;
  error: string | null;
  
  setCurrentArticle: (article: Article) => void;
  generateArticle: (input: ArticleInput) => Promise<void>;
  saveArticle: (article: Article) => Promise<void>;
  deleteArticle: (id: string) => Promise<void>;
}

export const useArticleStore = create<ArticleState>((set, get) => ({
  currentArticle: null,
  articles: [],
  isGenerating: false,
  error: null,
  
  setCurrentArticle: (article) => set({ currentArticle: article }),
  
  generateArticle: async (input) => {
    set({ isGenerating: true, error: null });
    try {
      const response = await api.generateArticle(input);
      set({ 
        currentArticle: response.data,
        isGenerating: false 
      });
    } catch (error) {
      set({ 
        error: error.message,
        isGenerating: false 
      });
    }
  }
}));
```

**エディタストア**
```typescript
// src/stores/editorStore.ts
interface EditorState {
  markdown: string;
  isDirty: boolean;
  lastSaved: number | null;
  
  setMarkdown: (markdown: string) => void;
  autoSave: () => Promise<void>;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  markdown: '',
  isDirty: false,
  lastSaved: null,
  
  setMarkdown: (markdown) => set({ 
    markdown, 
    isDirty: true 
  }),
  
  autoSave: async () => {
    const { markdown, isDirty } = get();
    if (!isDirty) return;
    
    await api.saveArticle({ markdown });
    set({ 
      isDirty: false,
      lastSaved: Date.now()
    });
  }
}));
```

---

## 🎨 スタイリング戦略

### Tailwind CSS設定

**tailwind.config.js**
```javascript
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb',
          hover: '#1d4ed8',
          light: '#3b82f6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans JP', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    }
  },
  plugins: []
};
```

---

## 🔌 API連携

### APIクライアント実装

**src/api/client.ts**
```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 60000
});

// リクエストインターセプター
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// レスポンスインターセプター
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // トークンリフレッシュ処理
      await refreshToken();
      return apiClient.request(error.config);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

**src/api/articles.ts**
```typescript
import apiClient from './client';

export const articlesApi = {
  generate: async (input: ArticleInput) => {
    const response = await apiClient.post('/articles/generate', input);
    return response.data;
  },
  
  list: async (params: ListParams) => {
    const response = await apiClient.get('/articles', { params });
    return response.data;
  },
  
  get: async (id: string) => {
    const response = await apiClient.get(`/articles/${id}`);
    return response.data;
  },
  
  update: async (id: string, data: Partial<Article>) => {
    const response = await apiClient.put(`/articles/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string) => {
    await apiClient.delete(`/articles/${id}`);
  }
};
```

---

## 🚀 パフォーマンス最適化

### 1. コード分割

```tsx
// ページ単位での遅延ロード
const EditorPage = lazy(() => import('./pages/EditorPage'));
const ArticlesPage = lazy(() => import('./pages/ArticlesPage'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/articles" element={<ArticlesPage />} />
      </Routes>
    </Suspense>
  );
}
```

### 2. メモ化

```tsx
// 高コストな計算のメモ化
const processedHtml = useMemo(() => {
  return processMarkdown(markdown);
}, [markdown]);

// コンポーネントのメモ化
export const ArticleCard = memo<ArticleCardProps>(({ article }) => {
  return <div>{article.title}</div>;
});
```

### 3. デバウンス

```tsx
// エディタの変更をデバウンス
const debouncedOnChange = useMemo(
  () => debounce((value: string) => {
    setMarkdown(value);
  }, 300),
  []
);
```

---

## 📱 レスポンシブ対応

### ブレークポイント

```css
/* Mobile: 375px - 767px */
@media (max-width: 767px) {
  .editor-layout {
    flex-direction: column;
  }
}

/* Tablet: 768px - 1279px */
@media (min-width: 768px) and (max-width: 1279px) {
  .editor-layout {
    grid-template-columns: 1fr 1fr;
  }
}

/* Desktop: 1280px+ */
@media (min-width: 1280px) {
  .editor-layout {
    grid-template-columns: 400px 1fr;
  }
}
```

---

## 🔗 関連ドキュメント

- **02_architecture.md** - 技術スタック詳細
- **04_api_specification.md** - API連携仕様
- **09_testing_strategy.md** - フロントエンドテスト

---

**最終更新**: 2025-01-03  
**レビュー者**: れんじろう  
**次回レビュー**: Phase 2完了時