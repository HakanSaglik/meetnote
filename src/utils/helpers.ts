import { STORAGE_KEYS, VALIDATION } from './constants';

/**
 * Local Storage utilities
 */
export const storage = {
  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue || null;
      return JSON.parse(item);
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue || null;
    }
  },

  set: (key: string, value: any): boolean => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error writing to localStorage:', error);
      return false;
    }
  },

  remove: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      return false;
    }
  },

  clear: (): boolean => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }
};

/**
 * Question history management
 */
export const questionHistory = {
  get: (): string[] => {
    return storage.get<string[]>(STORAGE_KEYS.QUESTION_HISTORY, []);
  },

  add: (question: string): void => {
    const history = questionHistory.get();
    const trimmedQuestion = question.trim();
    
    if (!trimmedQuestion || history.includes(trimmedQuestion)) {
      return;
    }
    
    // Add to beginning and limit to 20 items
    const newHistory = [trimmedQuestion, ...history].slice(0, 20);
    storage.set(STORAGE_KEYS.QUESTION_HISTORY, newHistory);
  },

  remove: (question: string): void => {
    const history = questionHistory.get();
    const newHistory = history.filter(q => q !== question);
    storage.set(STORAGE_KEYS.QUESTION_HISTORY, newHistory);
  },

  clear: (): void => {
    storage.remove(STORAGE_KEYS.QUESTION_HISTORY);
  }
};

/**
 * Validation utilities
 */
export const validate = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  phone: (phone: string): boolean => {
    const phoneRegex = /^(\+90|0)?[5][0-9]{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  },

  url: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  meetingTitle: (title: string): { isValid: boolean; message?: string } => {
    if (!title || title.trim().length === 0) {
      return { isValid: false, message: 'Toplantı başlığı gereklidir.' };
    }
    
    if (title.length < VALIDATION.MEETING_TITLE_MIN_LENGTH) {
      return { isValid: false, message: `Toplantı başlığı en az ${VALIDATION.MEETING_TITLE_MIN_LENGTH} karakter olmalıdır.` };
    }
    
    if (title.length > VALIDATION.MEETING_TITLE_MAX_LENGTH) {
      return { isValid: false, message: `Toplantı başlığı en fazla ${VALIDATION.MEETING_TITLE_MAX_LENGTH} karakter olabilir.` };
    }
    
    return { isValid: true };
  },

  meetingContent: (content: string): { isValid: boolean; message?: string } => {
    if (!content || content.trim().length === 0) {
      return { isValid: false, message: 'Toplantı içeriği gereklidir.' };
    }
    
    if (content.length < VALIDATION.MEETING_CONTENT_MIN_LENGTH) {
      return { isValid: false, message: `Toplantı içeriği en az ${VALIDATION.MEETING_CONTENT_MIN_LENGTH} karakter olmalıdır.` };
    }
    
    return { isValid: true };
  },

  question: (question: string): { isValid: boolean; message?: string } => {
    if (!question || question.trim().length === 0) {
      return { isValid: false, message: 'Soru gereklidir.' };
    }
    
    if (question.length < VALIDATION.QUESTION_MIN_LENGTH) {
      return { isValid: false, message: `Soru en az ${VALIDATION.QUESTION_MIN_LENGTH} karakter olmalıdır.` };
    }
    
    if (question.length > VALIDATION.QUESTION_MAX_LENGTH) {
      return { isValid: false, message: `Soru en fazla ${VALIDATION.QUESTION_MAX_LENGTH} karakter olabilir.` };
    }
    
    return { isValid: true };
  }
};

/**
 * Array utilities
 */
export const arrayUtils = {
  unique: <T>(array: T[]): T[] => {
    return [...new Set(array)];
  },

  groupBy: <T, K extends keyof T>(array: T[], key: K): Record<string, T[]> => {
    return array.reduce((groups, item) => {
      const group = String(item[key]);
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  },

  sortBy: <T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] => {
    return [...array].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  },

  chunk: <T>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
};

/**
 * Object utilities
 */
export const objectUtils = {
  isEmpty: (obj: any): boolean => {
    return obj === null || obj === undefined || 
           (typeof obj === 'object' && Object.keys(obj).length === 0) ||
           (typeof obj === 'string' && obj.trim().length === 0);
  },

  pick: <T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
    const result = {} as Pick<T, K>;
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  },

  omit: <T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
    const result = { ...obj };
    keys.forEach(key => {
      delete result[key];
    });
    return result;
  },

  deepClone: <T>(obj: T): T => {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (error) {
      console.error('Deep clone error:', error);
      return obj;
    }
  }
};

/**
 * String utilities
 */
export const stringUtils = {
  generateId: (prefix: string = ''): string => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
  },

  extractHashtags: (text: string): string[] => {
    const hashtagRegex = /#[\w\u00c0-\u024f\u1e00-\u1eff]+/gi;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1).toLowerCase()) : [];
  },

  highlightText: (text: string, searchTerm: string): string => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  },

  removeHtml: (html: string): string => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }
};

/**
 * URL utilities
 */
export const urlUtils = {
  getQueryParams: (): Record<string, string> => {
    const params = new URLSearchParams(window.location.search);
    const result: Record<string, string> = {};
    
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }
    
    return result;
  },

  setQueryParam: (key: string, value: string): void => {
    const url = new URL(window.location.href);
    url.searchParams.set(key, value);
    window.history.replaceState({}, '', url.toString());
  },

  removeQueryParam: (key: string): void => {
    const url = new URL(window.location.href);
    url.searchParams.delete(key);
    window.history.replaceState({}, '', url.toString());
  }
};

/**
 * Debounce utility
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Throttle utility
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

/**
 * Sleep utility
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Copy to clipboard utility
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const result = document.execCommand('copy');
      document.body.removeChild(textArea);
      return result;
    }
  } catch (error) {
    console.error('Copy to clipboard failed:', error);
    return false;
  }
};

/**
 * Download file utility
 */
export const downloadFile = (data: string, filename: string, type: string = 'text/plain'): void => {
  const blob = new Blob([data], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  window.URL.revokeObjectURL(url);
};