import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import GutenbergTest from './components/GutenbergTest';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        {/* ナビゲーション */}
        <nav className="bg-white shadow-sm p-4 mb-6">
          <div className="max-w-4xl mx-auto flex gap-4">
            <Link 
              to="/" 
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              ホーム
            </Link>
            <Link 
              to="/gutenberg-test" 
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              Gutenberg検証
            </Link>
          </div>
        </nav>

        {/* ルート */}
        <Routes>
          <Route 
            path="/" 
            element={
              <div className="text-center p-8">
                <h1 className="text-3xl font-bold mb-4">Blog Agent - Phase 0</h1>
                <p className="text-gray-600 mb-6">
                  Gutenberg Library 技術検証
                </p>
                <Link 
                  to="/gutenberg-test"
                  className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  検証ページへ移動 →
                </Link>
              </div>
            } 
          />
          <Route 
            path="/gutenberg-test" 
            element={<GutenbergTest />} 
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
