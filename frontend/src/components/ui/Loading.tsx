/**
 * Loading - ローディングコンポーネント
 * P6-03: ローディング表示改善
 */
import { type ReactNode } from 'react';

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
  overlay?: boolean;
}

const sizeMap = {
  sm: { spinner: 24, text: 'text-sm' },
  md: { spinner: 40, text: 'text-base' },
  lg: { spinner: 56, text: 'text-lg' },
};

export const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  text,
  fullScreen = false,
  overlay = false,
}) => {
  const { spinner, text: textSize } = sizeMap[size];

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Spinner size={spinner} />
      {text && (
        <p className={`text-gray-600 ${textSize} animate-pulse`}>{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        {content}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-40">
        {content}
      </div>
    );
  }

  return content;
};

const Spinner: React.FC<{ size: number }> = ({ size }) => (
  <svg
    className="animate-spin text-blue-600"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

/**
 * スケルトンローダー
 */
export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  className = '',
  variant = 'rectangular',
  animation = 'pulse',
}) => {
  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  return (
    <div
      className={`bg-gray-200 ${variantStyles[variant]} ${animationStyles[animation]} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  );
};

/**
 * カードスケルトン
 */
export const CardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6 space-y-4">
    <Skeleton height={24} width="60%" />
    <Skeleton height={16} />
    <Skeleton height={16} />
    <Skeleton height={16} width="80%" />
  </div>
);

/**
 * テーブルスケルトン
 */
export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="bg-white rounded-lg shadow overflow-hidden">
    <div className="border-b bg-gray-50 p-4">
      <div className="flex gap-4">
        <Skeleton width={40} height={20} />
        <Skeleton width="30%" height={20} />
        <Skeleton width="20%" height={20} />
        <Skeleton width="15%" height={20} />
        <Skeleton width="15%" height={20} />
      </div>
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="border-b last:border-b-0 p-4">
        <div className="flex gap-4 items-center">
          <Skeleton width={20} height={20} variant="rectangular" />
          <Skeleton width="30%" height={20} />
          <Skeleton width={60} height={24} />
          <Skeleton width={80} height={20} />
          <Skeleton width={120} height={20} />
        </div>
      </div>
    ))}
  </div>
);

/**
 * プログレスバー
 */
export interface ProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  showLabel = false,
  color = 'blue',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizeStyles = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const colorStyles = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-500',
    red: 'bg-red-600',
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-sm text-gray-600">進捗</span>
          <span className="text-sm font-medium text-gray-900">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${sizeStyles[size]}`}>
        <div
          className={`${colorStyles[color]} rounded-full transition-all duration-500 ease-out ${sizeStyles[size]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

/**
 * ローディングオーバーレイ付きコンテナ
 */
export interface LoadingContainerProps {
  isLoading: boolean;
  children: ReactNode;
  loadingText?: string;
}

export const LoadingContainer: React.FC<LoadingContainerProps> = ({
  isLoading,
  children,
  loadingText,
}) => (
  <div className="relative">
    {children}
    {isLoading && <Loading overlay text={loadingText} />}
  </div>
);

export default Loading;
