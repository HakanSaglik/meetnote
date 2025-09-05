/**
 * Common utility types for the application
 */

/**
 * Make all properties optional
 */
export type Partial<T> = {
  [P in keyof T]?: T[P];
};

/**
 * Make all properties required
 */
export type Required<T> = {
  [P in keyof T]-?: T[P];
};

/**
 * Pick specific properties from a type
 */
export type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

/**
 * Omit specific properties from a type
 */
export type Omit<T, K extends keyof T> = {
  [P in Exclude<keyof T, K>]: T[P];
};

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

/**
 * Pagination interface
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: Pagination;
}

/**
 * Sort configuration
 */
export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Filter configuration
 */
export interface FilterConfig {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
}

/**
 * Search configuration
 */
export interface SearchConfig {
  query: string;
  fields?: string[];
  caseSensitive?: boolean;
}

/**
 * Meeting related types
 */
export interface Meeting {
  id: string;
  title: string;
  content: string;
  summary?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  participants: string[];
  tags: string[];
  status: 'draft' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high';
  duration?: number; // in minutes
  location?: string;
  meetingType?: 'online' | 'offline' | 'hybrid';
  recordingUrl?: string;
  attachments?: Attachment[];
}

/**
 * Meeting creation/update data
 */
export interface MeetingInput {
  title: string;
  content: string;
  date?: string;
  participants?: string[];
  tags?: string[];
  status?: Meeting['status'];
  priority?: Meeting['priority'];
  duration?: number;
  location?: string;
  meetingType?: Meeting['meetingType'];
}

/**
 * Meeting statistics
 */
export interface MeetingStats {
  total: number;
  thisMonth: number;
  withRevisions: number;
  byStatus: Record<Meeting['status'], number>;
  byPriority: Record<Meeting['priority'], number>;
  averageDuration: number;
  totalDuration: number;
}

/**
 * Task related types
 */
export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  meetingId?: string;
  assignee?: string;
  tags: string[];
  estimatedTime?: number; // in minutes
  actualTime?: number; // in minutes
}

/**
 * Task input for creation/update
 */
export interface TaskInput {
  title: string;
  description?: string;
  priority?: Task['priority'];
  dueDate?: string;
  meetingId?: string;
  assignee?: string;
  tags?: string[];
  estimatedTime?: number;
}

/**
 * Question related types
 */
export interface Question {
  id: string;
  question: string;
  answer: string;
  provider: string;
  createdAt: string;
  meetingId?: string;
  tags: string[];
  rating?: number; // 1-5 stars
  feedback?: string;
}

/**
 * Question input
 */
export interface QuestionInput {
  question: string;
  meetingId?: string;
  provider?: string;
  tags?: string[];
}

/**
 * AI Provider types
 */
export interface AIProvider {
  id: string;
  name: string;
  displayName: string;
  apiKey?: string;
  isConfigured: boolean;
  isActive: boolean;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  supportedFeatures: string[];
}

/**
 * AI Provider test result
 */
export interface AIProviderTestResult {
  provider: string;
  success: boolean;
  responseTime?: number;
  error?: string;
  model?: string;
}

/**
 * Settings types
 */
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'tr' | 'en';
  autoSave: boolean;
  autoSaveInterval: number; // in seconds
  defaultProvider: string;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  export: ExportSettings;
}

/**
 * Notification settings
 */
export interface NotificationSettings {
  enabled: boolean;
  taskReminders: boolean;
  meetingReminders: boolean;
  dailySummary: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

/**
 * Privacy settings
 */
export interface PrivacySettings {
  dataRetention: number; // in days
  anonymizeData: boolean;
  shareAnalytics: boolean;
  encryptData: boolean;
}

/**
 * Export settings
 */
export interface ExportSettings {
  defaultFormat: 'json' | 'csv' | 'pdf' | 'docx';
  includeMetadata: boolean;
  compressFiles: boolean;
  maxFileSize: number; // in MB
}

/**
 * Attachment types
 */
export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: string;
  meetingId?: string;
  taskId?: string;
}

/**
 * File upload progress
 */
export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

/**
 * User types
 */
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'user' | 'viewer';
  preferences: UserPreferences;
  createdAt: string;
  lastLoginAt: string;
}

/**
 * User preferences
 */
export interface UserPreferences {
  theme: AppSettings['theme'];
  language: AppSettings['language'];
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  defaultView: 'list' | 'grid' | 'calendar';
}

/**
 * Navigation types
 */
export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  badge?: string | number;
  children?: NavigationItem[];
  isActive?: boolean;
  isDisabled?: boolean;
}

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  label: string;
  path?: string;
  isActive?: boolean;
}

/**
 * Modal types
 */
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
}

/**
 * Toast notification types
 */
export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  isClosable?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Loading state types
 */
export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

/**
 * Error state types
 */
export interface ErrorState {
  hasError: boolean;
  error?: Error | string;
  errorCode?: string;
  retryCount?: number;
  canRetry?: boolean;
}

/**
 * Form field types
 */
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: { label: string; value: any }[];
  validation?: {
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    custom?: (value: any) => boolean | string;
  };
}

/**
 * Table column types
 */
export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T) => React.ReactNode;
}

/**
 * Chart data types
 */
export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}

/**
 * Analytics data types
 */
export interface AnalyticsData {
  meetings: {
    total: number;
    thisMonth: number;
    growth: number;
    byStatus: Record<string, number>;
    byMonth: { month: string; count: number }[];
  };
  tasks: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    completionRate: number;
  };
  questions: {
    total: number;
    thisMonth: number;
    averageRating: number;
    byProvider: Record<string, number>;
  };
  usage: {
    activeUsers: number;
    totalSessions: number;
    averageSessionDuration: number;
    topFeatures: { feature: string; usage: number }[];
  };
}

/**
 * Event types for analytics
 */
export interface AnalyticsEvent {
  event: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  userId?: string;
  sessionId?: string;
  timestamp: string;
  properties?: Record<string, any>;
}

/**
 * Utility types for React components
 */
export type ComponentProps<T> = T extends React.ComponentType<infer P> ? P : never;
export type ElementProps<T extends keyof JSX.IntrinsicElements> = JSX.IntrinsicElements[T];

/**
 * Generic event handler types
 */
export type EventHandler<T = Event> = (event: T) => void;
export type ChangeHandler<T = HTMLInputElement> = (event: React.ChangeEvent<T>) => void;
export type ClickHandler<T = HTMLElement> = (event: React.MouseEvent<T>) => void;
export type SubmitHandler<T = HTMLFormElement> = (event: React.FormEvent<T>) => void;

/**
 * Async operation types
 */
export type AsyncOperation<T = any> = {
  execute: () => Promise<T>;
  cancel?: () => void;
  retry?: () => Promise<T>;
};

/**
 * Cache types
 */
export interface CacheItem<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl?: number; // time to live in milliseconds
}

/**
 * Storage types
 */
export interface StorageAdapter {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): boolean;
  remove(key: string): boolean;
  clear(): boolean;
  keys(): string[];
}

/**
 * Theme types
 */
export interface ThemeColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  background: string;
  surface: string;
  text: {
    primary: string;
    secondary: string;
    disabled: string;
  };
  border: string;
  shadow: string;
}

/**
 * Responsive breakpoints
 */
export interface Breakpoints {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
}

/**
 * Animation types
 */
export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
  iterations?: number | 'infinite';
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
}