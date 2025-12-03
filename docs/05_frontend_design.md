# フロントエンド設計

**ドキュメントバージョン**: 1.0  
**最終更新日**: 2024-12-03  
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
┌──────────────────────────────────────────┐
│  Header                                  │
│  [Logo] [保存] [HTML出力] [ユーザー]     │
├──────────────────┬───────────────────────┤
│                  │                       │
│  入力フォーム     │                       │
│  ┌─────────────┐ │                       │
│  │タイトル      │ │                       │
│  │対象読者      │ │                       │
│  │キーワード    │ │   プレビューエリア     │
│  │本文要点      │ │                       │
│  │文字数        │ │                       │
│  └─────────────┘ │                       │
│  [生成ボタン]     │                       │
│                  │                       │
├──────────────────┤                       │
│                  │                       │
│  エディタ         │                       │
│  ┌─────────────┐ │                       │
│  │Markdown      │ │                       │
│  │エディタ      │ │                       │
│  │             │ │                       │
│  │             │ │                       │
│  └─────────────┘ │                       │
│  [装飾ツールバー] │                       │
│                  │                       │
└──────────────────┴───────────────────────┘
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

**最終更新**: 2024-12-03  
**レビュー者**: れんじろう  
**次回レビュー**: Phase 2完了時
