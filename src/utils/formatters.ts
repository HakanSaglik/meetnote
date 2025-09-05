import { format, parseISO, isValid, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { DATE_FORMATS } from './constants';

/**
 * Date formatting utilities
 */
export const formatDate = (date: string | Date, formatStr: string = DATE_FORMATS.DISPLAY): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(dateObj)) {
      return 'Geçersiz tarih';
    }
    
    return format(dateObj, formatStr, { locale: tr });
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Geçersiz tarih';
  }
};

export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, DATE_FORMATS.DISPLAY_WITH_TIME);
};

export const formatTimeOnly = (date: string | Date): string => {
  return formatDate(date, DATE_FORMATS.TIME_ONLY);
};

export const formatRelativeTime = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(dateObj)) {
      return 'Geçersiz tarih';
    }
    
    return formatDistanceToNow(dateObj, { addSuffix: true, locale: tr });
  } catch (error) {
    console.error('Relative time formatting error:', error);
    return 'Geçersiz tarih';
  }
};

/**
 * Text formatting utilities
 */
export const truncateText = (text: string, maxLength: number = 100): string => {
  if (!text || text.length <= maxLength) {
    return text || '';
  }
  
  return text.substring(0, maxLength).trim() + '...';
};

export const capitalizeFirst = (text: string): string => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const capitalizeWords = (text: string): string => {
  if (!text) return '';
  return text.split(' ').map(word => capitalizeFirst(word)).join(' ');
};

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Number formatting utilities
 */
export const formatNumber = (num: number, locale: string = 'tr-TR'): string => {
  try {
    return new Intl.NumberFormat(locale).format(num);
  } catch (error) {
    console.error('Number formatting error:', error);
    return num.toString();
  }
};

export const formatPercentage = (value: number, decimals: number = 1): string => {
  try {
    return `${(value * 100).toFixed(decimals)}%`;
  } catch (error) {
    console.error('Percentage formatting error:', error);
    return '0%';
  }
};

/**
 * File size formatting
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Priority formatting
 */
export const formatPriority = (priority: string): string => {
  const priorityMap: Record<string, string> = {
    high: 'Yüksek',
    medium: 'Orta',
    low: 'Düşük'
  };
  
  return priorityMap[priority] || priority;
};

/**
 * Status formatting
 */
export const formatStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    draft: 'Taslak',
    published: 'Yayınlandı',
    archived: 'Arşivlendi',
    pending: 'Bekliyor',
    completed: 'Tamamlandı',
    cancelled: 'İptal Edildi'
  };
  
  return statusMap[status] || status;
};

/**
 * Tag formatting
 */
export const formatTags = (tags: string[]): string => {
  if (!tags || tags.length === 0) return '';
  return tags.join(', ');
};

export const parseTags = (tagsString: string): string[] => {
  if (!tagsString) return [];
  return tagsString
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
};

/**
 * URL formatting
 */
export const formatUrl = (url: string): string => {
  if (!url) return '';
  
  // Add protocol if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  
  return url;
};

/**
 * Phone number formatting (Turkish format)
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Turkish phone number format: +90 (5XX) XXX XX XX
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    const formatted = cleaned.substring(1);
    return `+90 (${formatted.substring(0, 3)}) ${formatted.substring(3, 6)} ${formatted.substring(6, 8)} ${formatted.substring(8)}`;
  }
  
  if (cleaned.length === 10) {
    return `+90 (${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)} ${cleaned.substring(6, 8)} ${cleaned.substring(8)}`;
  }
  
  return phone; // Return original if format doesn't match
};

/**
 * Email formatting
 */
export const formatEmail = (email: string): string => {
  if (!email) return '';
  return email.toLowerCase().trim();
};

/**
 * Currency formatting (Turkish Lira)
 */
export const formatCurrency = (amount: number, currency: string = 'TRY'): string => {
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  } catch (error) {
    console.error('Currency formatting error:', error);
    return `${amount} ${currency}`;
  }
};