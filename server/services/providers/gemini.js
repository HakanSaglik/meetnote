import { BaseAIProvider } from '../baseAIProvider.js';

export class GeminiProvider extends BaseAIProvider {
  constructor() {
    super('gemini', 'Google Gemini', 'Google\'s advanced AI model for natural language processing');
    this.apiKeys = this.getApiKeys();
    this.currentKeyIndex = 0;
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  }

  getApiKeys() {
    const keys = [];
    
    // Add base key
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
      keys.push(process.env.GEMINI_API_KEY);
    }
    
    // Add additional keys
    for (let i = 2; i <= 5; i++) {
      const key = process.env[`GEMINI_API_KEY_${i}`];
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
      console.log(`🔄 Switched to Gemini API key ${this.currentKeyIndex + 1}/${this.apiKeys.length}`);
      return true;
    }
    return false;
  }

  isConfigured() {
    return this.apiKeys.length > 0;
  }

  async askQuestion(question, meetings) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Gemini API key not configured');
      }

      // Find most relevant meetings
      const relatedMeetings = this.findRelatedMeetings(question, meetings);
      const context = this.createContext(relatedMeetings);

      // Create prompt for Gemini
      const prompt = this.createPrompt(question, context);

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Retry mechanism with API key rotation
      let retryCount = 0;
      const maxRetries = this.apiKeys.length * 2; // Try each key twice
      let response;
      
      while (retryCount < maxRetries) {
        const currentKey = this.getCurrentApiKey();
        try {
          response = await fetch(`${this.apiUrl}?key=${currentKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: prompt
                }]
              }],
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.8,
                maxOutputTokens: 1024,
              }
            })
          });

          if (response.ok) {
            break; // Success, exit retry loop
          }
          
          if (response.status === 429) {
            console.log(`⏳ Rate limit hit with key ${this.currentKeyIndex + 1}/${this.apiKeys.length}`);
            if (this.rotateApiKey()) {
              console.log(`🔄 Trying next API key...`);
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 2000)); // Short delay before trying next key
              continue;
            } else {
              retryCount++;
              if (retryCount < maxRetries) {
                console.log(`⏳ Waiting ${15 * retryCount} seconds before retry ${retryCount}/${maxRetries}...`);
                await new Promise(resolve => setTimeout(resolve, 15000 * retryCount));
                continue;
              }
            }
          }
          
          const errorData = await response.json();
          throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
          
        } catch (fetchError) {
          if (retryCount === maxRetries - 1) {
            throw fetchError;
          }
          retryCount++;
          console.log(`⏳ Request failed in askQuestion, waiting ${5 * retryCount} seconds before retry ${retryCount}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, 5000 * retryCount));
        }
      }

      const data = await response.json();
      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Üzgünüm, cevap oluşturamadım.';

      // Check for revisions in the answer
      const hasRevisions = relatedMeetings.some(meeting => meeting.revised_from_id !== null);

      return {
        answer: answer.trim(),
        relatedMeetings: relatedMeetings.slice(0, 3), // Return top 3 most relevant
        hasRevisions,
        provider: 'gemini'
      };

    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }

  async test() {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const currentKey = this.getCurrentApiKey();
      const response = await fetch(`${this.apiUrl}?key=${currentKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Test mesajı: Merhaba, çalışıyor musun?'
            }]
          }]
        })
      });

      if (response.status === 429) {
        console.log(`⏳ Gemini test hit rate limit with key ${this.currentKeyIndex + 1}/${this.apiKeys.length}, but API key is valid`);
        return true; // API key is valid, just rate limited
      }

      return response.ok;
    } catch (error) {
      console.error('Gemini test error:', error);
      return false;
    }
  }

  async analyzeMeeting(meeting) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Gemini API key not configured');
      }

      const prompt = this.createAnalysisPrompt(meeting);

      const currentKey = this.getCurrentApiKey();
      const response = await fetch(`${this.apiUrl}?key=${currentKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 512,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Parse the analysis result
      return this.parseAnalysisResult(analysisText, meeting);

    } catch (error) {
      console.error('Gemini analysis error:', error);
      throw error;
    }
  }

  async extractImportantTasks(meetings) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Gemini API key not configured');
      }

      if (meetings.length === 0) {
        return {
          tasks: [],
          message: 'Henüz hiç toplantı kaydı bulunmuyor.'
        };
      }

      console.log('🔍 Gemini extractImportantTasks called with meetings:', meetings.length);
      console.log('📋 Meeting details:', meetings.map(m => ({ date: m.date, topic: m.topic })));
      
      const prompt = this.createImportantTasksPrompt(meetings);
      console.log('📝 Prompt sent to Gemini:', prompt.substring(0, 500) + '...');

      // Add longer delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Retry mechanism with API key rotation
      let retryCount = 0;
      const maxRetries = this.apiKeys.length * 2; // Try each key twice
      let response;
      
      while (retryCount < maxRetries) {
        const currentKey = this.getCurrentApiKey();
        try {
          response = await fetch(`${this.apiUrl}?key=${currentKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: prompt }]
              }],
              generationConfig: {
                temperature: 0.1,
                topK: 1,
                topP: 1,
                maxOutputTokens: 2048,
              }
            })
          });

          if (response.ok) {
            const data = await response.json();
            const tasksText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            console.log('🤖 Raw Gemini response:', tasksText);
            
            // Parse the tasks result
            const result = this.parseImportantTasksResult(tasksText);
            console.log('✅ Parsed result:', JSON.stringify(result, null, 2));
            return result;
          }
          
          if (response.status === 429) {
            console.log(`⏳ Rate limit hit with key ${this.currentKeyIndex + 1}/${this.apiKeys.length}`);
            if (this.rotateApiKey()) {
              console.log(`🔄 Trying next API key...`);
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 2000)); // Short delay before trying next key
              continue;
            } else {
              retryCount++;
              if (retryCount < maxRetries) {
                console.log(`⏳ Waiting ${30 * retryCount} seconds before retry ${retryCount}/${maxRetries}...`);
                await new Promise(resolve => setTimeout(resolve, 30000 * retryCount));
                continue;
              }
            }
          }
          
          const errorData = await response.json();
          throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
          
        } catch (fetchError) {
          if (retryCount === maxRetries - 1) {
            throw fetchError;
          }
          retryCount++;
          console.log(`⏳ Request failed, waiting ${10 * retryCount} seconds before retry ${retryCount}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, 10000 * retryCount));
        }
      }

      // If we reach here, all retries failed
      throw new Error('All retry attempts failed');

    } catch (error) {
      console.error('Gemini important tasks error:', error);
      
      // Handle rate limiting gracefully
      if (error.message && error.message.includes('rate limit')) {
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
      // Clean the response text
      let cleanText = analysisText.trim();
      
      // Remove markdown code blocks if present
      cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Find JSON object boundaries more carefully
      const startIndex = cleanText.indexOf('{');
      const lastIndex = cleanText.lastIndexOf('}');
      
      if (startIndex === -1 || lastIndex === -1 || startIndex >= lastIndex) {
        throw new Error('No valid JSON object found');
      }
      
      const jsonStr = cleanText.substring(startIndex, lastIndex + 1);
      
      // More aggressive cleaning for common issues
      let cleanedJson = jsonStr
        .replace(/,\s*}/g, '}')  // Remove trailing commas
        .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
        .replace(/\n/g, ' ')     // Replace newlines with spaces
        .replace(/\r/g, ' ')     // Replace carriage returns
        .replace(/\t/g, ' ')     // Replace tabs
        .replace(/\s+/g, ' ')    // Normalize whitespace
        .replace(/\\n/g, ' ')   // Replace escaped newlines
        .replace(/\\r/g, ' ')   // Replace escaped carriage returns
        .replace(/\\t/g, ' ');  // Replace escaped tabs
      
      // Fix common JSON issues
      cleanedJson = cleanedJson
        .replace(/(["'])([^"']*?)\1\s*:\s*(["'])([^"']*?)\3/g, '"$2": "$4"') // Normalize quotes
        .replace(/'/g, '"')     // Replace single quotes with double quotes
        .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":'); // Quote unquoted keys
      
      console.log('Attempting to parse JSON:', cleanedJson.substring(0, 200) + '...');
      
      const result = JSON.parse(cleanedJson);
      
      return {
        meetingId: meeting.uuid,
        hasImportantTasks: result.hasImportantTasks || false,
        tasks: result.tasks || [],
        summary: result.summary || '',
        analyzedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error parsing analysis result:', error);
      console.error('Raw response:', analysisText);
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
4. Revizyon varsa "Bu karar [tarih]'te alınmış, ancak [tarih]'te şöyle revize edilmiştir" şeklinde belirt
5. Türkçe, net ve anlaşılır bir dilde cevapla
6. Eğer soruya kesin bir cevap bulamıyorsan, buna yakın konulardaki kararları öner

Örnek cevap formatı:
"[Tarih] tarihli toplantıda '[karar]' kararı alınmıştır. Bu karar [sonraki tarih] tarihinde '[yeni karar]' şeklinde güncellenmiştir."

Cevabın:`;
  }
}