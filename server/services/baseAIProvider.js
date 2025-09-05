/**
 * Base AI Provider Class
 * Abstract base class for all AI providers
 */
export class BaseAIProvider {
  constructor(name, displayName, description) {
    this.name = name;
    this.displayName = displayName;
    this.description = description;
  }

  isConfigured() {
    throw new Error('isConfigured method must be implemented by subclass');
  }

  async askQuestion(question, meetings) {
    throw new Error('askQuestion method must be implemented by subclass');
  }

  async test() {
    throw new Error('test method must be implemented by subclass');
  }

  async analyzeMeeting(meeting) {
    throw new Error('analyzeMeeting method must be implemented by subclass');
  }

  async extractImportantTasks(meetings) {
    throw new Error('extractImportantTasks method must be implemented by subclass');
  }

  /**
   * Create context from meetings for AI prompts
   */
  createContext(meetings) {
    if (!meetings || meetings.length === 0) {
      return 'Henüz hiç toplantı kaydı bulunmuyor.';
    }

    return meetings.map(meeting => {
      const date = new Date(meeting.date).toLocaleDateString('tr-TR');
      return `Tarih: ${date}\nKonu: ${meeting.topic}\nKarar: ${meeting.decision}${meeting.notes ? `\nNotlar: ${meeting.notes}` : ''}`;
    }).join('\n\n---\n\n');
  }

  /**
   * Find meetings related to the question
   */
  findRelatedMeetings(question, meetings, limit = 5) {
    if (!meetings || meetings.length === 0) return [];
    
    const questionLower = question.toLowerCase();
    
    const scored = meetings.map(meeting => {
      let score = 0;
      const topic = meeting.topic.toLowerCase();
      const decision = meeting.decision.toLowerCase();
      const notes = (meeting.notes || '').toLowerCase();
      const tags = (meeting.tags || '').toLowerCase();
      
      // Direct text matching
      if (topic.includes(questionLower)) score += 3;
      if (decision.includes(questionLower)) score += 2;
      if (notes.includes(questionLower)) score += 1;
      if (tags.includes(questionLower)) score += 1;
      
      // Keyword-based matching for better Turkish support
      const questionWords = questionLower.split(' ');
      questionWords.forEach(word => {
        if (word.length > 2) { // Skip short words
          if (topic.includes(word)) score += 1;
          if (decision.includes(word)) score += 1;
          if (notes.includes(word)) score += 0.5;
          if (tags.includes(word)) score += 1;
        }
      });
      
      // Specific keyword mappings for common queries
      const keywordMappings = {
        'sınav': ['sınav', 'değerlendirme', 'ara sınav', 'final'],
        'tarih': ['tarih', 'zaman', 'ne zaman'],
        'proje': ['proje', 'ödev', 'teslim'],
        'devamsızlık': ['devamsızlık', 'katılım', 'yoklama'],
        'toplantı': ['toplantı', 'zümre', 'kadro']
      };
      
      Object.entries(keywordMappings).forEach(([key, synonyms]) => {
        if (questionLower.includes(key)) {
          synonyms.forEach(synonym => {
            if (topic.includes(synonym)) score += 2;
            if (decision.includes(synonym)) score += 2;
            if (notes.includes(synonym)) score += 1;
            if (tags.includes(synonym)) score += 1;
          });
        }
      });
      
      return { meeting, score };
    });
    
    // If no meetings have a score > 0, return all meetings (fallback)
    const filtered = scored.filter(item => item.score > 0);
    
    if (filtered.length === 0) {
      return meetings.slice(0, limit);
    }
    
    return filtered
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.meeting);
  }
}