/**
 * Tutorial - チュートリアル・オンボーディングコンポーネント
 * P6-04: チュートリアル作成
 */
import { useState, useEffect, type ReactNode } from 'react';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: ReactNode;
}

export interface TutorialProps {
  steps: TutorialStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  storageKey?: string;
}

export const Tutorial: React.FC<TutorialProps> = ({
  steps,
  isOpen,
  onClose,
  onComplete,
  storageKey = 'tutorial-completed',
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = steps[currentStep];

  useEffect(() => {
    if (!isOpen || !step?.target) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(step.target);
    if (element) {
      setTargetRect(element.getBoundingClientRect());
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isOpen, step?.target, currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(storageKey, 'true');
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem(storageKey, 'true');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* オーバーレイ */}
      <div className="absolute inset-0 bg-black/60" />

      {/* ハイライト領域 */}
      {targetRect && (
        <div
          className="absolute bg-transparent border-4 border-blue-500 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] transition-all duration-300"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}

      {/* ツールチップ */}
      <div
        className={`
          absolute bg-white rounded-xl shadow-2xl p-6 max-w-md
          transform transition-all duration-300
          ${getTooltipPosition(targetRect, step?.position)}
        `}
        style={getTooltipStyle(targetRect, step?.position)}
      >
        {/* 進捗インジケーター */}
        <div className="flex items-center gap-1.5 mb-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all ${
                index === currentStep
                  ? 'w-6 bg-blue-600'
                  : index < currentStep
                  ? 'w-3 bg-blue-400'
                  : 'w-3 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* コンテンツ */}
        <h3 className="text-lg font-semibold text-gray-900">{step?.title}</h3>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          {step?.description}
        </p>

        {step?.action && <div className="mt-4">{step.action}</div>}

        {/* ナビゲーション */}
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            スキップ
          </button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                戻る
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              {currentStep === steps.length - 1 ? '完了' : '次へ'}
            </button>
          </div>
        </div>

        {/* ステップ番号 */}
        <div className="absolute -top-3 -right-3 w-8 h-8 bg-blue-600 text-white text-sm font-medium rounded-full flex items-center justify-center">
          {currentStep + 1}
        </div>
      </div>
    </div>
  );
};

function getTooltipPosition(rect: DOMRect | null, _position?: string): string {
  if (!rect) return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
  return '';
}

function getTooltipStyle(
  rect: DOMRect | null,
  position: string = 'bottom'
): React.CSSProperties {
  if (!rect) {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  const padding = 20;

  switch (position) {
    case 'top':
      return {
        bottom: window.innerHeight - rect.top + padding,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)',
      };
    case 'bottom':
      return {
        top: rect.bottom + padding,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)',
      };
    case 'left':
      return {
        top: rect.top + rect.height / 2,
        right: window.innerWidth - rect.left + padding,
        transform: 'translateY(-50%)',
      };
    case 'right':
      return {
        top: rect.top + rect.height / 2,
        left: rect.right + padding,
        transform: 'translateY(-50%)',
      };
    default:
      return {
        top: rect.bottom + padding,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)',
      };
  }
}

/**
 * チュートリアルフック
 */
export const useTutorial = (storageKey: string = 'tutorial-completed') => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(storageKey) === 'true';
    setHasCompleted(completed);
    if (!completed) {
      // 初回訪問時は少し遅延してチュートリアルを表示
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const startTutorial = () => setIsOpen(true);
  const closeTutorial = () => setIsOpen(false);
  const completeTutorial = () => {
    setIsOpen(false);
    setHasCompleted(true);
  };
  const resetTutorial = () => {
    localStorage.removeItem(storageKey);
    setHasCompleted(false);
  };

  return {
    isOpen,
    hasCompleted,
    startTutorial,
    closeTutorial,
    completeTutorial,
    resetTutorial,
  };
};

/**
 * ウェルカムモーダル
 */
export interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTutorial: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  onStartTutorial,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center">
        {/* アイコン */}
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900">Blog Agentへようこそ!</h2>
        <p className="mt-3 text-gray-600">
          AIを活用してブログ記事を簡単に作成できるツールです。
          チュートリアルで基本的な使い方を学びましょう。
        </p>

        {/* 機能紹介 */}
        <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl mb-1">✍️</div>
            <div className="font-medium">記事生成</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl mb-1">🎨</div>
            <div className="font-medium">エディタ</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl mb-1">📤</div>
            <div className="font-medium">エクスポート</div>
          </div>
        </div>

        {/* ボタン */}
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            スキップ
          </button>
          <button
            type="button"
            onClick={onStartTutorial}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            チュートリアルを始める
          </button>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;
