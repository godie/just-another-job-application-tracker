
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

export interface InterviewEvent {
  id: string;
  type: InterviewStageType;
  date: string; // ISO format date
  notes?: string;
  status: EventStatus;
  customTypeName?: string; // For custom types
  interviewerName?: string; // Name of the interviewer
}

export type WorkType = 'remote' | 'on-site' | 'hybrid';

export interface JobApplication {
  id: string;
  position: string;
  company: string;

  location?: string;
  workType?: WorkType;
  hybridDaysInOffice?: number;

  salary: string;
  status: string; // Quick status reference
  applicationDate: string;
  interviewDate: string;

  timeline: InterviewEvent[];

  notes: string;
  link: string;
  platform: string;
  contactName: string;
  followUpDate: string;

  customFields?: Record<string, string>;
}

export interface ApplicationWithMetadata extends JobApplication {
  parsedApplicationDate: Date | null;
  searchMetadata: string;
  translatedStatus: string;
  translatedPlatform: string;
  translatedWorkType: string;
  interviewingSubStatus: string | null;
  sortedTimeline: InterviewEvent[];
  nextEvent: InterviewEvent | null;
}

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

