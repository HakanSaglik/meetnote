import { toast } from 'react-hot-toast';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

export class NetworkError extends Error {
  status?: number;
  code?: string;
  details?: any;

  constructor(message: string, status?: number, code?: string, details?: any) {
    super(message);
    this.name = 'NetworkError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const getErrorMessage = (error: any): string => {
  if (error instanceof NetworkError) {
    return error.message;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'Beklenmeyen bir hata oluştu';
};

export const getErrorDetails = (error: any): ApiError => {
  if (error instanceof NetworkError) {
    return {
      message: error.message,
      status: error.status,
      code: error.code,
      details: error.details
    };
  }
  
  return {
    message: getErrorMessage(error),
    status: error?.status,
    code: error?.code,
    details: error?.details
  };
};

export const handleApiError = (error: any, context?: string): void => {
  const errorDetails = getErrorDetails(error);
  const contextMessage = context ? `${context}: ` : '';
  
  // Network errors
  if (!navigator.onLine) {
    toast.error('İnternet bağlantınızı kontrol edin');
    return;
  }
  
  // Server errors
  if (errorDetails.status && errorDetails.status >= 500) {
    toast.error(`${contextMessage}Sunucu hatası. Lütfen daha sonra tekrar deneyin.`);
    return;
  }
  
  // Client errors
  if (errorDetails.status && errorDetails.status >= 400 && errorDetails.status < 500) {
    switch (errorDetails.status) {
      case 401:
        toast.error('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
        break;
      case 403:
        toast.error('Bu işlem için yetkiniz bulunmuyor.');
        break;
      case 404:
        toast.error(`${contextMessage}İstenen kaynak bulunamadı.`);
        break;
      case 429:
        toast.error('Çok fazla istek gönderdiniz. Lütfen bekleyin.');
        break;
      default:
        toast.error(`${contextMessage}${errorDetails.message}`);
    }
    return;
  }
  
  // Generic error
  toast.error(`${contextMessage}${errorDetails.message}`);
};

export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx)
      if (error instanceof NetworkError && error.status && error.status >= 400 && error.status < 500) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      const waitTime = delay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
};

export const isRetryableError = (error: any): boolean => {
  if (error instanceof NetworkError) {
    // Retry on server errors and network issues
    return !error.status || error.status >= 500;
  }
  
  // Retry on network failures
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return true;
  }
  
  return false;
};

export const createErrorContext = (operation: string, resource?: string): string => {
  if (resource) {
    return `${operation} (${resource})`;
  }
  return operation;
};