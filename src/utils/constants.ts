// Application constants
export const APP_CONFIG = {
  NAME: 'MeetNote',
  VERSION: '1.0.0',
  DESCRIPTION: 'AI destekli toplantı notları ve görev yönetimi',
  AUTHOR: 'Hakan Sağlık',
  CONTACT: 'h.saglik83@gmail.com',
  GITHUB: 'https://github.com/meetnote/meetnote',
  DOCUMENTATION: 'https://docs.meetnote.app'
};

// API Configuration
export const API_CONFIG = {
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000 // 1 second
};

// Pagination defaults
export const PAGINATION = {
  defaultLimit: 10,
  maxLimit: 100,
  defaultPage: 1
};

// Meeting constants
export const MEETING_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived'
} as const;

export const MEETING_TYPES = {
  REGULAR: 'regular',
  EMERGENCY: 'emergency',
  BOARD: 'board',
  COMMITTEE: 'committee'
} as const;

// Task priorities
export const TASK_PRIORITIES = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
} as const;

// Task categories
export const TASK_CATEGORIES = {
  ACTION: 'action',
  REMINDER: 'reminder',
  DEADLINE: 'deadline'
} as const;

// AI Provider constants
export const AI_PROVIDERS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GOOGLE: 'google',
  OLLAMA: 'ollama'
} as const;

// Theme constants
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  THEME: 'meetnote_theme',
  QUESTION_HISTORY: 'meetnote_question_history',
  USER_PREFERENCES: 'meetnote_user_preferences',
  SIDEBAR_STATE: 'meetnote_sidebar_state'
} as const;

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'dd/MM/yyyy',
  DISPLAY_WITH_TIME: 'dd/MM/yyyy HH:mm',
  ISO: 'yyyy-MM-dd',
  TIME_ONLY: 'HH:mm'
} as const;

// File size limits
export const FILE_LIMITS = {
  MAX_UPLOAD_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
} as const;

// Validation rules
export const VALIDATION = {
  MEETING_TITLE_MIN_LENGTH: 3,
  MEETING_TITLE_MAX_LENGTH: 200,
  MEETING_CONTENT_MIN_LENGTH: 10,
  QUESTION_MIN_LENGTH: 5,
  QUESTION_MAX_LENGTH: 1000,
  TAG_MAX_LENGTH: 50
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.',
  SERVER_ERROR: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.',
  UNAUTHORIZED: 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
  FORBIDDEN: 'Bu işlem için yetkiniz bulunmuyor.',
  NOT_FOUND: 'İstenen kaynak bulunamadı.',
  VALIDATION_ERROR: 'Girilen bilgiler geçersiz.',
  UNKNOWN_ERROR: 'Beklenmeyen bir hata oluştu.'
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  MEETING_CREATED: 'Toplantı başarıyla oluşturuldu.',
  MEETING_UPDATED: 'Toplantı başarıyla güncellendi.',
  MEETING_DELETED: 'Toplantı başarıyla silindi.',
  TASK_COMPLETED: 'Görev başarıyla tamamlandı.',
  SETTINGS_SAVED: 'Ayarlar başarıyla kaydedildi.',
  API_KEY_SAVED: 'API anahtarı başarıyla kaydedildi.',
  API_KEY_DELETED: 'API anahtarı başarıyla silindi.'
} as const;

// Animation durations (in milliseconds)
export const ANIMATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 1000
} as const;

// Breakpoints for responsive design
export const BREAKPOINTS = {
  SM: '640px',
  MD: '768px',
  LG: '1024px',
  XL: '1280px',
  '2XL': '1536px'
} as const;