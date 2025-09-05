import { BaseAIProvider } from '../baseAIProvider.js';

export class ClaudeProvider extends BaseAIProvider {
  constructor() {
    super('claude', 'Anthropic Claude', 'Anthropic\'s Claude AI for helpful, harmless, and honest responses');
    this.apiKeys = this.getApiKeys();
    this.currentKeyIndex = 0;
    this.apiUrl = 'https://api.anthropic.com/v1/messages';
    this.model = 'claude-3-sonnet-20240229';
  }

  getApiKeys() {
    const keys = [];
    
    // Add base key
    if (process.env.CLAUDE_API_KEY && process.env.CLAUDE_API_KEY.trim() !== '') {
      keys.push(process.env.CLAUDE_API_KEY);
    }
    
    // Add additional keys
    for (let i = 2; i <= 5; i++) {
      const key = process.env[`CLAUDE_API_KEY_${i}`];
      if (key && key.trim() !== '') {
        keys.push(key);
      }
    }
    
    return keys;
  }

  getCurrentApiKey() {
    if (this.apiKeys.length === 0) return null;
    return this.apiKeys[this.currentKeyIndex % this.apiKeys.length];
  }

  rotateApiKey() {
    if (this.apiKeys.length > 1) {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
      console.log(`🔄 Switched to Claude API key ${this.currentKeyIndex + 1}/${this.apiKeys.length}`);
      return true;
    }
    return false;
  }

  isConfigured() {
    return this.apiKeys.length > 0;
  }

  async askQuestion(question, meetings) {
    if (!this.isConfigured()) {
      throw new Error('Claude API key not configured');
    }

    try {
      const relatedMeetings = this.findRelatedMeetings(question, meetings);
      const context = this.createContext(relatedMeetings);

      const prompt = `Toplantı Kayıtları:\n${context}\n\nSorum: ${question}`;

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.getCurrentApiKey(),
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: `${this.getSystemPrompt()}\n\n${prompt}`
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const answer = data.content?.[0]?.text || 'Üzgünüm, cevap oluşturamadım.';

      const hasRevisions = relatedMeetings.some(meeting => meeting.revised_from_id !== null);

      return {
        answer: answer.trim(),
        relatedMeetings: relatedMeetings.slice(0, 3),
        hasRevisions,
        provider: 'claude'
      };

    } catch (error) {
      console.error('Claude API error:', error);
      throw error;
    }
  }

  async test() {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.getCurrentApiKey(),
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 10,
          messages: [{
            role: 'user',
            content: 'Test'
          }]
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Claude test error:', error);
      return false;
    }
  }

  getSystemPrompt() {
    return `Sen bir toplantı yönetim sistemi asistanısın. Kullanıcıların sorularını geçmiş toplantı kararlarına dayanarak cevaplayacaksın.

Görevlerin:
1. Soruyu analiz et ve en uygun toplantı kararlarını bul
2. Karar tarihlerini mutlaka belirt
3. Eğer aynı konuda birden fazla karar varsa, kronolojik sırayla göster
4. Revizyon varsa "Bu karar [tarih]'te alınmış, ancak [tarih]'te şöyle revize edilmiştir" şeklinde belirt
5. Türkçe, net ve anlaşılır bir dilde cevapla
6. Eğer soruya kesin bir cevap bulamıyorsan, buna yakın konulardaki kararları öner

Örnek cevap formatı:
"[Tarih] tarihli toplantıda '[karar]' kararı alınmıştır. Bu karar [sonraki tarih] tarihinde '[yeni karar]' şeklinde güncellenmiştir."`;
  }
}