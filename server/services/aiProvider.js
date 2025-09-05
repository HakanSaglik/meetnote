import { BaseAIProvider } from './baseAIProvider.js';
import { GeminiProvider } from './providers/gemini.js';
import { OpenAIProvider } from './providers/openai.js';
import { ClaudeProvider } from './providers/claude.js';

/**
 * AI Provider Manager
 * Manages different AI providers and provides a unified interface
 */
export class AIProviderManager {
  static providers = {};

  static _createProvider(name) {
    if (!this.providers[name]) {
      switch (name) {
        case 'gemini':
          this.providers[name] = new GeminiProvider();
          break;
        case 'openai':
          this.providers[name] = new OpenAIProvider();
          break;
        case 'claude':
          this.providers[name] = new ClaudeProvider();
          break;
        default:
          throw new Error(`Unknown AI provider: ${name}. Only Gemini, OpenAI and Claude are supported.`);
      }
    }
    return this.providers[name];
  }

  static getProvider(providerName = process.env.DEFAULT_AI_PROVIDER || 'gemini') {
    return this._createProvider(providerName);
  }

  /**
   * Get a working provider with fallback mechanism
   * Tries providers in order until one works or all fail
   */
  static async getWorkingProvider(preferredProvider = null) {
    // Define fallback order - only supported providers
    const fallbackOrder = [
      preferredProvider,
      'gemini',    // Free and reliable
      'openai',    // Paid but reliable
      'claude'     // Paid but reliable
    ].filter(Boolean); // Remove null/undefined

    // Remove duplicates while preserving order
    const uniqueProviders = [...new Set(fallbackOrder)];

    for (const providerName of uniqueProviders) {
      try {
        const provider = this._createProvider(providerName);
        
        // Check if provider is configured (check for multiple API keys)
        if (!this.hasValidApiKeys(providerName)) {
          console.log(`⚠️ Provider ${providerName} not configured, skipping...`);
          continue;
        }

        // Test the provider
        const isWorking = await provider.test();
        if (isWorking) {
          console.log(`✅ Using provider: ${providerName}`);
          return provider;
        } else {
          console.log(`❌ Provider ${providerName} test failed, trying next...`);
        }
      } catch (error) {
        console.log(`❌ Provider ${providerName} error:`, error.message);
        continue;
      }
    }

    throw new Error('No working AI provider available. Please configure API keys in settings.');
  }

  /**
   * Check if provider has valid API keys (supports multiple keys)
   */
  static hasValidApiKeys(providerName) {
    const envKeyMap = {
      'gemini': 'GEMINI_API_KEY',
      'openai': 'OPENAI_API_KEY',
      'claude': 'CLAUDE_API_KEY'
    };

    const baseKey = envKeyMap[providerName];
    if (!baseKey) return false;

    // Check base key and additional keys (_2, _3, _4, _5)
    if (process.env[baseKey]) return true;
    
    for (let i = 2; i <= 5; i++) {
      if (process.env[`${baseKey}_${i}`]) return true;
    }
    
    return false;
  }

  /**
   * Get all API keys for a provider
   */
  static getApiKeys(providerName) {
    const envKeyMap = {
      'gemini': 'GEMINI_API_KEY',
      'openai': 'OPENAI_API_KEY',
      'claude': 'CLAUDE_API_KEY'
    };

    const baseKey = envKeyMap[providerName];
    if (!baseKey) return [];

    const keys = [];
    
    // Check base key
    if (process.env[baseKey]) {
      keys.push(process.env[baseKey]);
    }
    
    // Check additional keys (_2, _3, _4, _5)
    for (let i = 2; i <= 5; i++) {
      const key = process.env[`${baseKey}_${i}`];
      if (key) {
        keys.push(key);
      }
    }
    
    return keys;
  }

  /**
   * Get available API keys for a provider (for rate limiting)
   */
  static getApiKeys(providerName) {
    const envKeyMap = {
      'gemini': 'GEMINI_API_KEY',
      'openai': 'OPENAI_API_KEY',
      'claude': 'CLAUDE_API_KEY'
    };

    const baseKey = envKeyMap[providerName];
    if (!baseKey) return [];

    const keys = [];
    
    // Add base key
    if (process.env[baseKey]) {
      keys.push(process.env[baseKey]);
    }
    
    // Add additional keys
    for (let i = 2; i <= 5; i++) {
      const key = process.env[`${baseKey}_${i}`];
      if (key) {
        keys.push(key);
      }
    }
    
    return keys;
  }

  /**
   * Execute AI operation with automatic fallback
   */
  static async executeWithFallback(operation, preferredProvider = null) {
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const provider = await this.getWorkingProvider(preferredProvider);
        return await operation(provider);
      } catch (error) {
        lastError = error;
        console.log(`🔄 Attempt ${attempt} failed:`, error.message);
        
        // If it's a rate limit error, wait before retry
        if (error.message && (error.message.includes('rate limit') || error.message.includes('429'))) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s
          console.log(`⏳ Rate limit hit, waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }
      }
    }

    throw lastError || new Error('All AI providers failed after retries');
  }

  static getAvailableProviders() {
    const providerNames = ['gemini', 'openai', 'claude'];
    return providerNames.map(name => {
      const provider = this._createProvider(name);
      return {
        name,
        displayName: provider.displayName,
        configured: this.hasValidApiKeys(name),
        description: provider.description,
        apiKeyCount: this.getApiKeys(name).length
      };
    });
  }
}