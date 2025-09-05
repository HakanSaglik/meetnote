import { VALIDATION } from './constants';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  message?: string;
  field?: string;
}

/**
 * Form validation interface
 */
export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Meeting form data interface
 */
export interface MeetingFormData {
  title: string;
  content: string;
  date?: string;
  participants?: string[];
  tags?: string[];
}

/**
 * Settings form data interface
 */
export interface SettingsFormData {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  geminiApiKey?: string;
  defaultProvider?: string;
  autoSave?: boolean;
  theme?: string;
}

/**
 * Basic validation functions
 */
export const validators = {
  /**
   * Check if value is required (not empty)
   */
  required: (value: any, fieldName: string = 'Bu alan'): ValidationResult => {
    const isEmpty = value === null || value === undefined || 
                   (typeof value === 'string' && value.trim().length === 0) ||
                   (Array.isArray(value) && value.length === 0);
    
    return {
      isValid: !isEmpty,
      message: isEmpty ? `${fieldName} gereklidir.` : undefined,
      field: fieldName
    };
  },

  /**
   * Check minimum length
   */
  minLength: (value: string, min: number, fieldName: string = 'Bu alan'): ValidationResult => {
    const isValid = value && value.length >= min;
    
    return {
      isValid,
      message: !isValid ? `${fieldName} en az ${min} karakter olmalıdır.` : undefined,
      field: fieldName
    };
  },

  /**
   * Check maximum length
   */
  maxLength: (value: string, max: number, fieldName: string = 'Bu alan'): ValidationResult => {
    const isValid = !value || value.length <= max;
    
    return {
      isValid,
      message: !isValid ? `${fieldName} en fazla ${max} karakter olabilir.` : undefined,
      field: fieldName
    };
  },

  /**
   * Check email format
   */
  email: (value: string, fieldName: string = 'E-posta'): ValidationResult => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = !value || emailRegex.test(value);
    
    return {
      isValid,
      message: !isValid ? `${fieldName} geçerli bir e-posta adresi olmalıdır.` : undefined,
      field: fieldName
    };
  },

  /**
   * Check URL format
   */
  url: (value: string, fieldName: string = 'URL'): ValidationResult => {
    if (!value) return { isValid: true };
    
    try {
      new URL(value);
      return { isValid: true };
    } catch {
      return {
        isValid: false,
        message: `${fieldName} geçerli bir URL olmalıdır.`,
        field: fieldName
      };
    }
  },

  /**
   * Check phone number format (Turkish)
   */
  phone: (value: string, fieldName: string = 'Telefon numarası'): ValidationResult => {
    if (!value) return { isValid: true };
    
    const phoneRegex = /^(\+90|0)?[5][0-9]{9}$/;
    const cleanPhone = value.replace(/\s/g, '');
    const isValid = phoneRegex.test(cleanPhone);
    
    return {
      isValid,
      message: !isValid ? `${fieldName} geçerli bir Türkiye telefon numarası olmalıdır.` : undefined,
      field: fieldName
    };
  },

  /**
   * Check API key format
   */
  apiKey: (value: string, provider: string): ValidationResult => {
    if (!value) return { isValid: true };
    
    let isValid = false;
    let message = '';
    
    switch (provider.toLowerCase()) {
      case 'openai':
        isValid = value.startsWith('sk-') && value.length >= 20;
        message = 'OpenAI API anahtarı "sk-" ile başlamalı ve en az 20 karakter olmalıdır.';
        break;
      case 'anthropic':
        isValid = value.startsWith('sk-ant-') && value.length >= 20;
        message = 'Anthropic API anahtarı "sk-ant-" ile başlamalı ve en az 20 karakter olmalıdır.';
        break;
      case 'gemini':
        isValid = value.length >= 20;
        message = 'Gemini API anahtarı en az 20 karakter olmalıdır.';
        break;
      default:
        isValid = value.length >= 10;
        message = 'API anahtarı en az 10 karakter olmalıdır.';
    }
    
    return {
      isValid,
      message: !isValid ? message : undefined,
      field: `${provider} API Anahtarı`
    };
  },

  /**
   * Check date format and validity
   */
  date: (value: string, fieldName: string = 'Tarih'): ValidationResult => {
    if (!value) return { isValid: true };
    
    const date = new Date(value);
    const isValid = !isNaN(date.getTime());
    
    return {
      isValid,
      message: !isValid ? `${fieldName} geçerli bir tarih olmalıdır.` : undefined,
      field: fieldName
    };
  },

  /**
   * Check if date is in the future
   */
  futureDate: (value: string, fieldName: string = 'Tarih'): ValidationResult => {
    if (!value) return { isValid: true };
    
    const date = new Date(value);
    const now = new Date();
    const isValid = date > now;
    
    return {
      isValid,
      message: !isValid ? `${fieldName} gelecekte bir tarih olmalıdır.` : undefined,
      field: fieldName
    };
  },

  /**
   * Check if date is in the past
   */
  pastDate: (value: string, fieldName: string = 'Tarih'): ValidationResult => {
    if (!value) return { isValid: true };
    
    const date = new Date(value);
    const now = new Date();
    const isValid = date < now;
    
    return {
      isValid,
      message: !isValid ? `${fieldName} geçmişte bir tarih olmalıdır.` : undefined,
      field: fieldName
    };
  }
};

/**
 * Meeting validation
 */
export const validateMeeting = (data: MeetingFormData): FormValidationResult => {
  const errors: Record<string, string> = {};
  
  // Title validation
  const titleRequired = validators.required(data.title, 'Toplantı başlığı');
  if (!titleRequired.isValid) {
    errors.title = titleRequired.message!;
  } else {
    const titleMinLength = validators.minLength(data.title, VALIDATION.MEETING_TITLE_MIN_LENGTH, 'Toplantı başlığı');
    const titleMaxLength = validators.maxLength(data.title, VALIDATION.MEETING_TITLE_MAX_LENGTH, 'Toplantı başlığı');
    
    if (!titleMinLength.isValid) errors.title = titleMinLength.message!;
    if (!titleMaxLength.isValid) errors.title = titleMaxLength.message!;
  }
  
  // Content validation
  const contentRequired = validators.required(data.content, 'Toplantı içeriği');
  if (!contentRequired.isValid) {
    errors.content = contentRequired.message!;
  } else {
    const contentMinLength = validators.minLength(data.content, VALIDATION.MEETING_CONTENT_MIN_LENGTH, 'Toplantı içeriği');
    
    if (!contentMinLength.isValid) errors.content = contentMinLength.message!;
  }
  
  // Date validation (optional)
  if (data.date) {
    const dateValid = validators.date(data.date, 'Toplantı tarihi');
    if (!dateValid.isValid) {
      errors.date = dateValid.message!;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Question validation
 */
export const validateQuestion = (question: string): ValidationResult => {
  // Required check
  const requiredResult = validators.required(question, 'Soru');
  if (!requiredResult.isValid) {
    return requiredResult;
  }
  
  // Length checks
  const minLengthResult = validators.minLength(question, VALIDATION.QUESTION_MIN_LENGTH, 'Soru');
  if (!minLengthResult.isValid) {
    return minLengthResult;
  }
  
  const maxLengthResult = validators.maxLength(question, VALIDATION.QUESTION_MAX_LENGTH, 'Soru');
  if (!maxLengthResult.isValid) {
    return maxLengthResult;
  }
  
  return { isValid: true };
};

/**
 * Settings validation
 */
export const validateSettings = (data: SettingsFormData): FormValidationResult => {
  const errors: Record<string, string> = {};
  
  // API Keys validation
  if (data.openaiApiKey) {
    const openaiResult = validators.apiKey(data.openaiApiKey, 'openai');
    if (!openaiResult.isValid) {
      errors.openaiApiKey = openaiResult.message!;
    }
  }
  
  if (data.anthropicApiKey) {
    const anthropicResult = validators.apiKey(data.anthropicApiKey, 'anthropic');
    if (!anthropicResult.isValid) {
      errors.anthropicApiKey = anthropicResult.message!;
    }
  }
  
  if (data.geminiApiKey) {
    const geminiResult = validators.apiKey(data.geminiApiKey, 'gemini');
    if (!geminiResult.isValid) {
      errors.geminiApiKey = geminiResult.message!;
    }
  }
  
  // Default provider validation
  if (data.defaultProvider) {
    const validProviders = ['openai', 'anthropic', 'gemini'];
    if (!validProviders.includes(data.defaultProvider)) {
      errors.defaultProvider = 'Geçersiz AI sağlayıcısı seçildi.';
    }
  }
  
  // Theme validation
  if (data.theme) {
    const validThemes = ['light', 'dark', 'system'];
    if (!validThemes.includes(data.theme)) {
      errors.theme = 'Geçersiz tema seçildi.';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * File validation
 */
export const validateFile = (file: File, options: {
  maxSize?: number;
  allowedTypes?: string[];
  maxNameLength?: number;
}): ValidationResult => {
  const { maxSize = 10 * 1024 * 1024, allowedTypes = [], maxNameLength = 255 } = options;
  
  // File size check
  if (file.size > maxSize) {
    return {
      isValid: false,
      message: `Dosya boyutu ${Math.round(maxSize / 1024 / 1024)}MB'dan küçük olmalıdır.`,
      field: 'Dosya boyutu'
    };
  }
  
  // File type check
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      message: `Desteklenen dosya türleri: ${allowedTypes.join(', ')}`,
      field: 'Dosya türü'
    };
  }
  
  // File name length check
  if (file.name.length > maxNameLength) {
    return {
      isValid: false,
      message: `Dosya adı ${maxNameLength} karakterden kısa olmalıdır.`,
      field: 'Dosya adı'
    };
  }
  
  return { isValid: true };
};

/**
 * Batch validation utility
 */
export const validateBatch = (validations: ValidationResult[]): FormValidationResult => {
  const errors: Record<string, string> = {};
  
  validations.forEach(validation => {
    if (!validation.isValid && validation.field && validation.message) {
      errors[validation.field] = validation.message;
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Custom validation rule creator
 */
export const createValidator = (
  validationFn: (value: any) => boolean,
  errorMessage: string,
  fieldName?: string
) => {
  return (value: any): ValidationResult => {
    const isValid = validationFn(value);
    return {
      isValid,
      message: !isValid ? errorMessage : undefined,
      field: fieldName
    };
  };
};

/**
 * Async validation support
 */
export const validateAsync = async (
  value: any,
  asyncValidator: (value: any) => Promise<boolean>,
  errorMessage: string,
  fieldName?: string
): Promise<ValidationResult> => {
  try {
    const isValid = await asyncValidator(value);
    return {
      isValid,
      message: !isValid ? errorMessage : undefined,
      field: fieldName
    };
  } catch (error) {
    return {
      isValid: false,
      message: 'Doğrulama sırasında bir hata oluştu.',
      field: fieldName
    };
  }
};