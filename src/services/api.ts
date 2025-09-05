const API_BASE = import.meta.env.VITE_API_URL || 
  (import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:3001/api');

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Helper function to handle API responses
const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

// Generic fetch wrapper with error handling
const apiRequest = async <T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> => {
  const url = `${API_BASE}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    return handleResponse<T>(response);
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error);
    throw error;
  }
};

export const apiService = {
  // Health check
  healthCheck: () => 
    apiRequest<{ status: string; timestamp: string; env: string }>('/health'),

  // Meetings API
  getMeetings: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    tags?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.tags) searchParams.set('tags', params.tags);
    
    const query = searchParams.toString();
    return apiRequest<import('../types/meeting').MeetingsResponse>(
      `/meetings${query ? `?${query}` : ''}`
    );
  },

  getMeeting: (id: string) => 
    apiRequest<import('../types/meeting').Meeting>(`/meetings/${id}`),

  createMeeting: (meeting: import('../types/meeting').CreateMeetingRequest) =>
    apiRequest<ApiResponse<import('../types/meeting').Meeting>>('/meetings', {
      method: 'POST',
      body: JSON.stringify(meeting),
    }),

  updateMeeting: (id: string, meeting: import('../types/meeting').UpdateMeetingRequest) =>
    apiRequest<import('../types/meeting').Meeting>(`/meetings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(meeting),
    }),

  deleteMeeting: (id: string) =>
    apiRequest<ApiResponse<void>>(`/meetings/${id}`, {
      method: 'DELETE',
    }),

  compareDecisions: (topic: string) =>
    apiRequest<{
      topic: string;
      timeline: import('../types/meeting').Meeting[];
      hasChanges: boolean;
    }>(`/meetings/compare/${encodeURIComponent(topic)}`),

  // AI API
  askQuestion: (question: string, provider?: string) =>
    apiRequest<import('../types/ai').QuestionResponse>('/ai/ask', {
      method: 'POST',
      body: JSON.stringify({ question, provider }),
    }),

  getAIProviders: () =>
    apiRequest<{
      providers: import('../types/ai').AIProvider[];
      default: string;
      configured: import('../types/ai').AIProvider[];
    }>('/ai/providers'),

  getProviders: () =>
    apiRequest<{
      providers: import('../types/ai').AIProvider[];
      default: string;
      configured: import('../types/ai').AIProvider[];
    }>('/ai/providers'),

  testAIProvider: (provider: string) =>
    apiRequest<{
      provider: string;
      working: boolean;
      message: string;
    }>('/ai/test', {
      method: 'POST',
      body: JSON.stringify({ provider }),
    }),

  getImportantTasks: () =>
    apiRequest<{
      tasks: Array<{
        id: string;
        title: string;
        description: string;
        priority: 'high' | 'medium' | 'low';
        isUrgent: boolean;
        deadline?: string;
        category: 'action' | 'reminder' | 'deadline';
        meetingDate?: string;
        meetingTopic?: string;
      }>;
      totalMeetings: number;
      summary: string;
      analyzedAt: string;
    }>('/ai/important-tasks'),

  updateTaskPriority: (taskId: string, priority: 'high' | 'medium' | 'low') => {
    console.log('🔗 API updateTaskPriority çağrıldı:', { taskId, priority });
    return apiRequest<{
      success: boolean;
      task: {
        id: string;
        title: string;
        description: string;
        priority: 'high' | 'medium' | 'low';
        isUrgent: boolean;
        deadline?: string;
        category: 'action' | 'reminder' | 'deadline';
        meetingDate?: string;
        meetingTopic?: string;
      };
    }>(`/ai/tasks/${taskId}/priority`, {
      method: 'PUT',
      body: JSON.stringify({ priority }),
    });
  },

  saveApiKey: (provider: string, apiKey: string) =>
    apiRequest<{
      success: boolean;
      message: string;
    }>('/ai/save-key', {
      method: 'POST',
      body: JSON.stringify({ provider, apiKey }),
    }),

  getApiKeys: () =>
    apiRequest<{
      success: boolean;
      apiKeys: Record<string, {
        key: string;
        envKey: string;
        addedAt: string;
      }>;
    }>('/ai/api-keys'),

  deleteApiKey: (provider: string) =>
    apiRequest<{
      success: boolean;
      message: string;
    }>('/ai/delete-key', {
      method: 'DELETE',
      body: JSON.stringify({ provider }),
    }),

  completeTask: (taskId: string, task: any) =>
    apiRequest<{
      success: boolean;
      message: string;
      completedTask: any;
    }>('/ai/complete-task', {
      method: 'POST',
      body: JSON.stringify({ taskId, task }),
    }),

  getCompletedTasks: () =>
    apiRequest<{
      success: boolean;
      completedTasks: Record<string, Record<string, {
        meetingTitle: string;
        tasks: Array<{
          id: string;
          title: string;
          description: string;
          priority: 'high' | 'medium' | 'low';
          isUrgent: boolean;
          deadline?: string;
          category: 'action' | 'reminder' | 'deadline';
          meetingDate?: string;
          meetingTopic?: string;
          completedAt: string;
        }>;
      }>>;
      totalCompleted: number;
    }>('/ai/completed-tasks'),

  deleteCompletedTask: (taskId: string) =>
    apiRequest<{
      success: boolean;
      message: string;
    }>(`/ai/completed-tasks/${taskId}`, {
      method: 'DELETE',
    }),

  // Analyze specific meeting with AI
  analyzeMeeting: (meetingId: string, provider?: string) =>
    apiRequest<{
      tasks: Array<{
        id: string;
        title: string;
        description: string;
        priority: 'high' | 'medium' | 'low';
        isUrgent: boolean;
        deadline?: string;
        category: 'action' | 'reminder' | 'deadline';
        meetingDate?: string;
        meetingTopic?: string;
      }>;
      summary: string;
      analyzedAt: string;
    }>('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ meetingId, provider }),
    }),
};