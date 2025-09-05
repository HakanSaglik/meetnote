import { BaseAIProvider } from '../baseAIProvider.js';

export class TogetherProvider extends BaseAIProvider {
  constructor() {
    super('together', 'Together AI', 'Together AI with various open-source models including Llama');
    this.apiKey = process.env.TOGETHER_API_KEY;
    this.apiUrl = 'https://api.together.xyz/v1/chat/completions';
    this.model = 'meta-llama/Llama-3-70b-chat-hf'; // High quality Llama model
  }

  isConfigured() {
    return !!this.apiKey;
  }

  async askQuestion(question, meetings) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Together AI API key not configured');
      }

      // Find most relevant meetings
      const relatedMeetings = this.findRelatedMeetings(question, meetings);
      const context = this.createContext(relatedMeetings);

      // Create prompt for Together AI
      const prompt = this.createPrompt(question, context);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'Sen bir toplantı yönetim sistemi asistanısın. Kullanıcıların sorularını geçmiş toplantı kararlarına dayanarak cevaplamalısın. Türkçe, net ve anlaşılır bir dilde cevap ver.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1024,
          top_p: 0.8,
          stop: ['<|eot_id|>'] // Llama specific stop token
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Together AI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content || 'Üzgünüm, cevap oluşturamadım.';

      // Check for revisions in the answer
      const hasRevisions = relatedMeetings.some(meeting => meeting.revised_from_id !== null);

      return {
        answer: answer.trim(),
        relatedMeetings: relatedMeetings.slice(0, 3), // Return top 3 most relevant
        hasRevisions,
        provider: 'together'
      };

    } catch (error) {
      console.error('Together AI API error:', error);
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
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: 'Test mesajı: Merhaba, çalışıyor musun?'
            }
          ],
          max_tokens: 50
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Together AI test error:', error);
      return false;
    }
  }

  async analyzeMeeting(meeting) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Together AI API key not configured');
      }

      const prompt = this.createAnalysisPrompt(meeting);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'Sen bir toplantı analiz uzmanısın. Toplantı notlarını analiz edip önemli görevleri çıkarmalısın. Sadece JSON formatında cevap ver.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 512,
          stop: ['<|eot_id|>']
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Together AI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const analysisText = data.choices?.[0]?.message?.content || '';

      // Parse the analysis result
      return this.parseAnalysisResult(analysisText, meeting);

    } catch (error) {
      console.error('Together AI analysis error:', error);
      throw error;
    }
  }

  async extractImportantTasks(meetings) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Together AI API key not configured');
      }

      if (meetings.length === 0) {
        return {
          tasks: [],
          message: 'Henüz hiç toplantı kaydı bulunmuyor.'
        };
      }

      console.log('🔗 Together AI extractImportantTasks called with meetings:', meetings.length);
      console.log('📋 Meeting details:', meetings.map(m => ({ date: m.date, topic: m.topic })));
      
      const prompt = this.createImportantTasksPrompt(meetings);
      console.log('📝 Prompt sent to Together AI:', prompt.substring(0, 500) + '...');
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'Sen bir toplantı analiz uzmanısın. Toplantı kayıtlarından sadece kritik ve önemli görevleri çıkarmalısın. Sadece JSON formatında cevap ver.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 2048,
          top_p: 1,
          stop: ['<|eot_id|>']
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Together AI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const tasksText = data.choices?.[0]?.message?.content || '';
      console.log('🤖 Raw Together AI response:', tasksText);

      // Parse the tasks result
      const result = this.parseImportantTasksResult(tasksText);
      console.log('✅ Parsed result:', JSON.stringify(result, null, 2));
      return result;

    } catch (error) {
      console.error('Together AI important tasks error:', error);
      
      // Handle rate limiting gracefully
      if (error.message && (error.message.includes('rate limit') || error.message.includes('429'))) {
        return {
          tasks: [],
          totalMeetings: meetings.length,
          summary: 'API rate limit aşıldı. Lütfen birkaç dakika sonra tekrar deneyin.',
          analyzedAt: new Date().toISOString()
        };
      }
      
      return {
        tasks: [],
        totalMeetings: meetings.length,
        summary: 'Görev analizi sırasında hata oluştu.',
        analyzedAt: new Date().toISOString()
      };
    }
  }

  createAnalysisPrompt(meeting) {
    const date = new Date(meeting.date).toLocaleDateString('tr-TR');
    return `
Bu toplantı notunu analiz et ve önemli, acil veya unutulmaması gereken görevleri çıkar:

Toplantı Bilgileri:
Tarih: ${date}
Konu: ${meeting.topic}
Karar: ${meeting.decision}
${meeting.notes ? `Notlar: ${meeting.notes}` : ''}
${meeting.tags ? `Etiketler: ${meeting.tags}` : ''}

Görevlerin:
1. Bu toplantıdan çıkan önemli görevleri belirle
2. Acil olan görevleri işaretle
3. Unutulmaması gereken önemli noktaları belirle
4. Her görev için önem derecesi ver (yüksek/orta/düşük)
5. Mümkünse tarih bilgisi varsa deadline belirle

Cevabını şu JSON formatında ver:
{
  "hasImportantTasks": true/false,
  "tasks": [
    {
      "title": "Görev başlığı",
      "description": "Görev açıklaması",
      "priority": "high/medium/low",
      "isUrgent": true/false,
      "deadline": "YYYY-MM-DD" veya null,
      "category": "action/reminder/deadline"
    }
  ],
  "summary": "Toplantının genel özeti"
}

Sadece JSON formatında cevap ver, başka açıklama ekleme.`;
  }

  createImportantTasksPrompt(meetings) {
    const context = meetings.map(meeting => {
      const date = new Date(meeting.date).toLocaleDateString('tr-TR');
      return `Tarih: ${date}\nKonu: ${meeting.topic}\nKarar: ${meeting.decision}${meeting.notes ? `\nNotlar: ${meeting.notes}` : ''}`;
    }).join('\n\n---\n\n');

    return `
Toplantı kayıtlarını analiz et ve SADECE önemli, kritik ve unutulursa problem yaratacak görevleri çıkar:

Toplantı Kayıtları:
${context}

ÖNEMLİ TALİMATLAR:
1. SADECE şu kriterleri karşılayan görevleri çıkar:
   - Eğer unutulursa ciddi problem yaratacak görevler
   - Belirli bir tarih/deadline'ı olan görevler
   - Takip edilmesi gereken süreçler
   - Yapılması zorunlu olan işlemler
   - Önemli kişilerle iletişim gerektiren durumlar

2. ÇIKARMA:
   - Genel bilgilendirmeler
   - Rutin işlemler
   - Belirsiz ifadeler
   - "dikkat edilecek", "önemli" gibi genel tavsiyeler

3. Her görev için:
   - Kısa ve net başlık (maksimum 50 karakter)
   - Spesifik açıklama
   - Gerçekçi öncelik değerlendirmesi
   - Varsa tarih bilgisini deadline olarak belirle

4. En fazla 8 kritik görev seç
5. Görevleri önem sırasına göre sırala

Cevabını şu JSON formatında ver:
{
  "tasks": [
    {
      "title": "Kısa görev başlığı",
      "description": "Spesifik görev açıklaması",
      "priority": "high/medium/low",
      "isUrgent": true/false,
      "deadline": "YYYY-MM-DD" veya null,
      "category": "action/reminder/deadline",
      "meetingDate": "YYYY-MM-DD",
      "meetingTopic": "Toplantı konusu"
    }
  ],
  "totalMeetings": ${meetings.length},
  "summary": "Çıkarılan kritik görev sayısı ve genel durum"
}

Sadece JSON formatında cevap ver, başka açıklama ekleme.`;
  }

  parseAnalysisResult(analysisText, meeting) {
    try {
      // Clean the response and extract JSON
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response');
      }

      const result = JSON.parse(jsonMatch[0]);
      
      return {
        meetingId: meeting.uuid,
        hasImportantTasks: result.hasImportantTasks || false,
        tasks: result.tasks || [],
        summary: result.summary || '',
        analyzedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error parsing analysis result:', error);
      return {
        meetingId: meeting.uuid,
        hasImportantTasks: false,
        tasks: [],
        summary: 'Analiz sonucu işlenirken hata oluştu.',
        analyzedAt: new Date().toISOString()
      };
    }
  }

  parseImportantTasksResult(tasksText) {
    try {
      // Clean the response text
      let cleanText = tasksText.trim();
      
      // Remove markdown code blocks if present
      cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Find JSON object boundaries more carefully
      const startIndex = cleanText.indexOf('{');
      const lastIndex = cleanText.lastIndexOf('}');
      
      if (startIndex === -1 || lastIndex === -1 || startIndex >= lastIndex) {
        throw new Error('No valid JSON object found');
      }
      
      const jsonStr = cleanText.substring(startIndex, lastIndex + 1);
      
      // Additional cleaning for common issues
      const cleanedJson = jsonStr
        .replace(/,\s*}/g, '}')  // Remove trailing commas
        .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
        .replace(/\n/g, ' ')     // Replace newlines with spaces
        .replace(/\s+/g, ' ');   // Normalize whitespace
      
      const result = JSON.parse(cleanedJson);
      
      return {
        tasks: result.tasks || [],
        totalMeetings: result.totalMeetings || 0,
        summary: result.summary || '',
        analyzedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error parsing important tasks result:', error);
      console.error('Raw response:', tasksText);
      return {
        tasks: [],
        totalMeetings: 0,
        summary: 'Görev analizi sonucu işlenirken hata oluştu.',
        analyzedAt: new Date().toISOString()
      };
    }
  }

  createPrompt(question, context) {
    return `
Toplantı yönetim sistemi asistanı olarak görev yapıyorsun. Kullanıcıların sorularını, geçmiş toplantı kararlarına dayanarak cevaplamalısın.

Toplantı Kayıtları:
${context}

Kullanıcı Sorusu: ${question}

Görevlerin:
1. Soruyu analiz et ve en uygun toplantı kararlarını bul
2. Karar tarihlerini mutlaka belirt
3. Eğer aynı konuda birden fazla karar varsa, kronolojik sırayla göster
4. Revizyon varsa "Bu karar [tarih]'te alınmış, ancak [tarih]'te şöyle revise edilmiştir" şeklinde belirt
5. Türkçe, net ve anlaşılır bir dilde cevapla
6. Eğer soruya kesin bir cevap bulamıyorsan, buna yakın konulardaki kararları öner

Örnek cevap formatı:
"[Tarih] tarihli toplantıda '[karar]' kararı alınmıştır. Bu karar [sonraki tarih] tarihinde '[yeni karar]' şeklinde güncellenmiştir."

Cevabın:`;
  }
}