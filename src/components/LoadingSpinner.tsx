import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '', 
  text,
  fullScreen = false 
}) => {
  const spinnerContent = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600 dark:text-blue-400`} />
      {text && (
        <p className="text-sm text-gray-600 dark:text-gray-300 animate-pulse">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};

export default LoadingSpinner;

// Skeleton loader for cards and lists
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse ${className}`}>
    <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-4 space-y-3">
      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
      </div>
      <div className="flex space-x-2">
        <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-16"></div>
        <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-20"></div>
      </div>
    </div>
  </div>
);

// Skeleton for text lines
export const SkeletonText: React.FC<{ 
  lines?: number; 
  className?: string;
}> = ({ lines = 3, className = '' }) => (
  <div className={`animate-pulse space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div 
        key={i}
        className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${
          i === lines - 1 ? 'w-3/4' : 'w-full'
        }`}
      />
    ))}
  </div>
);

// Loading state for buttons
export const LoadingButton: React.FC<{
  loading: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}> = ({ loading, children, className = '', disabled, onClick, type = 'button' }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={loading || disabled}
    className={`relative flex items-center justify-center gap-2 ${className} ${
      loading || disabled ? 'opacity-50 cursor-not-allowed' : ''
    }`}
  >
    {loading && (
      <Loader2 className="h-4 w-4 animate-spin" />
    )}
    <span className={loading ? 'opacity-70' : ''}>
      {children}
    </span>
  </button>
);