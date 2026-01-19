/**
 * Card - カードコンポーネント
 * P6-01: UIブラッシュアップ
 */
import { type ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const shadowStyles = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow',
  lg: 'shadow-lg',
};

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  shadow = 'md',
  hover = false,
  onClick,
}) => {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={`
        bg-white rounded-lg border border-gray-200
        ${paddingStyles[padding]}
        ${shadowStyles[shadow]}
        ${hover ? 'transition-shadow duration-200 hover:shadow-lg' : ''}
        ${onClick ? 'cursor-pointer w-full text-left' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </Component>
  );
};

/**
 * カードヘッダー
 */
export interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  className = '',
}) => (
  <div className={`flex items-start justify-between ${className}`}>
    <div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
    {action && <div className="flex-shrink-0 ml-4">{action}</div>}
  </div>
);

/**
 * カードコンテンツ
 */
export const CardContent: React.FC<{
  children: ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`mt-4 ${className}`}>{children}</div>
);

/**
 * カードフッター
 */
export const CardFooter: React.FC<{
  children: ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div
    className={`mt-4 pt-4 border-t border-gray-200 flex items-center justify-end gap-3 ${className}`}
  >
    {children}
  </div>
);

/**
 * 統計カード
 */
export interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray';
}

const colorStyles = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  red: 'bg-red-50 text-red-600',
  gray: 'bg-gray-50 text-gray-600',
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  color = 'blue',
}) => (
  <Card>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        {change && (
          <p
            className={`mt-1 text-sm ${
              change.type === 'increase' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {change.type === 'increase' ? '↑' : '↓'} {Math.abs(change.value)}%
          </p>
        )}
      </div>
      {icon && (
        <div className={`p-3 rounded-full ${colorStyles[color]}`}>{icon}</div>
      )}
    </div>
  </Card>
);

export default Card;
