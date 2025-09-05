import { BaseAIProvider } from '../baseAIProvider.js';

export class OpenAIProvider extends BaseAIProvider {
  constructor() {
    super('openai', 'OpenAI GPT', 'OpenAI\'s GPT models for advanced language understanding');
    this.apiKeys = this.getApiKeys();
    this.currentKeyIndex = 0;
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    this.model = 'gpt-3.5-turbo'; // Can be changed to gpt-4 if available
  }

  getApiKeys() {
    const keys = [];
    
    // Add base key
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '') {
      keys.push(process.env.OPENAI_API_KEY);
    }
    
    // Add additional keys
    for (let i = 2; i <= 5; i++) {
      const key = process.env[`OPENAI_API_KEY_${i}`];
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
      console.log(`🔄 Switched to OpenAI API key ${this.currentKeyIndex + 1}/${this.apiKeys.length}`);
      return true;
    }
    return false;
  }

  isConfigured() {
    return this.apiKeys.length > 0;
  }

  async askQuestion(question, meetings) {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const relatedMeetings = this.findRelatedMeetings(question, meetings);
      const context = this.createContext(relatedMeetings);

      const messages = [
        {
          role: 'system',
          content: this.getSystemPrompt()
        },
        {
          role: 'user',
          content: `Toplantı Kayıtları:\n${context}\n\nSorum: ${question}`
        }
      ];

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getCurrentApiKey()}`
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.7,
          max_tokens: 1024
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content || 'Üzgünüm, cevap oluşturamadım.';

      const hasRevisions = relatedMeetings.some(meeting => meeting.revised_from_id !== null);

      return {
        answer: answer.trim(),
        relatedMeetings: relatedMeetings.slice(0, 3),
        hasRevisions,
        provider: 'openai'
      };

    } catch (error) {
      console.error('OpenAI API error:', error);
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
          'Authorization': `Bearer ${this.getCurrentApiKey()}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 5
        })
      });

      return response.ok;
    } catch (error) {
      console.error('OpenAI test error:', error);
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