import { Meeting } from './meeting';

export interface QuestionResponse {
  answer: string;
  relatedMeetings: Meeting[];
  hasRevisions: boolean;
  provider: string;
}

export interface AIProvider {
  name: string;
  displayName: string;
  configured: boolean;
  description: string;
}

export interface AITestResponse {
  provider: string;
  working: boolean;
  message: string;
}

export interface AIProvidersResponse {
  providers: AIProvider[];
  default: string;
  configured: AIProvider[];
}