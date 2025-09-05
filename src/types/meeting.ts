export interface Meeting {
  id: number;
  uuid: string;
  date: string;
  topic: string;
  decision: string;
  notes?: string;
  tags?: string;
  revised_from_id?: number;
  created_at: string;
  updated_at: string;
  
  // New fields for attachments
  images?: string[]; // Array of image file paths/URLs
  documents?: string[]; // Array of document file paths/URLs
  links?: string[]; // Array of external links (YouTube, HTTP, etc.)
  
  // Joined fields from revised_from meeting
  revised_from_topic?: string;
  revised_from_date?: string;
  revised_from_decision?: string;
  
  // Revisions of this meeting
  revisions?: Meeting[];
}

export interface CreateMeetingRequest {
  date: string;
  topic: string;
  decision: string;
  notes?: string;
  tags?: string;
  revisedFromId?: number;
  images?: string[];
  documents?: string[];
  links?: string[];
}

export interface UpdateMeetingRequest {
  date: string;
  topic: string;
  decision: string;
  notes?: string;
  tags?: string;
  images?: string[];
  documents?: string[];
  links?: string[];
}

export interface MeetingsResponse {
  meetings: Meeting[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MeetingFilters {
  search?: string;
  tags?: string;
  dateFrom?: string;
  dateTo?: string;
}