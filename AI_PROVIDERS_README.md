# AI Providers Integration Guide

## Overview
This document describes the integration of new AI providers to address Gemini API rate limits and provide alternative options for the MeetNote application.

## New AI Providers Added

### 1. Groq (Llama 3.1 70B)
- **Provider**: Groq
- **Model**: llama-3.1-70b-versatile
- **Free Tier**: 500k tokens/day per model, 14,400 requests/day
- **Rate Limit**: 30 requests/minute
- **Performance**: ~250 tokens/second
- **API Key**: `GROQ_API_KEY`

### 2. Cerebras (Llama 3.1 70B)
- **Provider**: Cerebras
- **Model**: llama3.1-70b
- **Free Tier**: 1M tokens/day per model
- **Rate Limit**: 30 requests/minute
- **Performance**: ~446 tokens/second (fastest)
- **Context Window**: 8k tokens (temporary limit due to high demand)
- **API Key**: `CEREBRAS_API_KEY`

### 3. Together AI (Llama 3.1 70B)
- **Provider**: Together AI
- **Model**: meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo
- **Performance**: ~86 tokens/second
- **API Key**: `TOGETHER_API_KEY`

### 4. OpenRouter (Multiple Models)
- **Provider**: OpenRouter
- **Model**: meta-llama/llama-3.1-70b-instruct
- **Features**: Access to multiple models through single API
- **API Key**: `OPENROUTER_API_KEY`

## Configuration

### Environment Variables
Add the following to your `.env` file:

```env
# New AI Providers (Free/High Limit Options)
GROQ_API_KEY=your_groq_key_here
CEREBRAS_API_KEY=your_cerebras_key_here
TOGETHER_API_KEY=your_together_key_here
OPENROUTER_API_KEY=your_openrouter_key_here
```

### Getting API Keys

1. **Groq**: Visit [console.groq.com](https://console.groq.com) and create a free account
2. **Cerebras**: Visit [cloud.cerebras.ai](https://cloud.cerebras.ai) and sign up
3. **Together AI**: Visit [api.together.xyz](https://api.together.xyz) and create an account
4. **OpenRouter**: Visit [openrouter.ai](https://openrouter.ai) and get your API key

## Fallback System

The application now includes an intelligent fallback system that automatically switches between providers when rate limits are encountered:

### Priority Order
1. Groq (fastest free option)
2. Cerebras (highest free token limit)
3. Together AI
4. OpenRouter
5. Gemini (original)
6. OpenAI
7. Claude

### Features
- **Automatic Retry**: Exponential backoff with retries
- **Rate Limit Detection**: Automatically detects and handles rate limit errors
- **Provider Health**: Tracks working providers and skips non-configured ones
- **Seamless Switching**: Users don't notice provider changes

## Implementation Details

### Files Modified/Created

1. **New Provider Files**:
   - `server/services/providers/groq.js`
   - `server/services/providers/cerebras.js`
   - `server/services/providers/together.js`
   - `server/services/providers/openrouter.js`

2. **Updated Files**:
   - `server/services/aiProvider.js` - Added fallback system
   - `server/routes/ai.js` - Integrated fallback for all endpoints
   - `src/pages/SettingsPage.tsx` - Updated configuration info
   - `.env` - Added new API key fields

### API Endpoints Enhanced

- `/ai/ask` - Question answering with fallback
- `/ai/analyze` - Meeting analysis with fallback
- `/ai/important-tasks` - Task extraction with AI + text analysis fallback

## Testing

To test the new providers:

1. Add at least one API key to `.env`
2. Restart the server
3. Visit Settings page to see provider status
4. Use the "Test" button for each configured provider
5. Try asking questions or analyzing meetings

## Benefits

- **Reduced Rate Limits**: Multiple providers with high free tiers
- **Better Reliability**: Automatic fallback prevents service interruption
- **Cost Effective**: Free tiers provide substantial usage
- **Performance**: Some providers offer faster response times
- **Flexibility**: Easy to add more providers in the future

## Troubleshooting

### Common Issues

1. **Provider Not Working**: Check API key configuration in `.env`
2. **Rate Limits**: System automatically switches providers
3. **No Response**: Ensure at least one provider is configured
4. **Slow Performance**: Cerebras offers fastest response times

### Logs

Check console logs for:
- Provider selection messages
- Fallback attempts
- Rate limit warnings
- API errors

## Future Enhancements

- Provider performance monitoring
- Usage analytics per provider
- Custom provider priority settings
- Load balancing between providers
- Provider-specific model selection