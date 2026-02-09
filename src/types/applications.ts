// src/types/applications.ts

/**
 * Interview Event Types
 */
export type InterviewStageType = 
  | 'application_submitted'
  | 'screener_call'
  | 'first_contact'
  | 'technical_interview'
  | 'code_challenge'
  | 'live_coding'
  | 'hiring_manager'
  | 'system_design'
  | 'cultural_fit'
  | 'final_round'
  | 'offer'
  | 'rejected'
  | 'withdrawn'
  | 'custom';

export type EventStatus = 'completed' | 'scheduled' | 'cancelled' | 'pending';

/**
 * Interview Event - Individual milestone in the interview process
 */
export interface InterviewEvent {
  id: string;
  type: InterviewStageType;
  date: string; // ISO format date
  notes?: string;
  status: EventStatus;
  customTypeName?: string; // For custom types
  interviewerName?: string; // Name of the interviewer
}

/** Work arrangement: remote, on-site, or hybrid */
export type WorkType = 'remote' | 'on-site' | 'hybrid';

/**
 * Job Application - Hybrid approach combining timeline, status, and flexibility
 */
export interface JobApplication {
  // Core identification
  id: string;
  position: string;
  company: string;

  // Location and work arrangement
  location?: string;
  workType?: WorkType;
  /** When workType is 'hybrid': days per week in office (1–5). */
  hybridDaysInOffice?: number;

  // Quick reference fields (legacy support)
  salary: string;
  status: string; // Quick status reference
  applicationDate: string;
  interviewDate: string;

  // New timeline-based tracking
  timeline: InterviewEvent[];

  // Additional fields
  notes: string;
  link: string;
  platform: string;
  contactName: string;
  followUpDate: string;

  // User-defined custom fields
  customFields?: Record<string, string>;
}

/**
 * Legacy JobApplication for backward compatibility during migration
 */
export interface LegacyJobApplication {
  id: string;
  position: string;
  company: string;
  location?: string;
  workType?: string;
  hybridDaysInOffice?: number;
  salary: string;
  status: string;
  applicationDate: string;
  interviewDate: string;
  notes: string;
  link: string;
  platform: string;
  contactName: string;
  followUpDate: string;
}

