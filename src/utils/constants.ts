// src/utils/constants.ts
import type { UserPreferences, FieldDefinition } from "../types/preferences";
import type { InterviewStageType } from "../types/applications";

export const STORAGE_KEY = 'jobTrackerData';
export const OPPORTUNITIES_STORAGE_KEY = 'jobOpportunities';
export const PREFERENCES_STORAGE_KEY = 'jobTrackerPreferences';

export const VALUE_BY_STATUS: Record<string, string> = {
  'applied': 'Applied',
  'interviewing': 'Interviewing',
  'offer': 'Offer',
  'rejected': 'Rejected',
  'withdrawn': 'Withdrawn',
};

export const DEFAULT_FIELDS: FieldDefinition[] = [
  { id: 'position', label: 'Position', type: 'text', required: true },
  { id: 'company', label: 'Company', type: 'text', required: true },
  { id: 'location', label: 'Location', type: 'text', required: false },
  { id: 'workType', label: 'Work Type', type: 'text', required: false },
  { id: 'status', label: 'Status', type: 'text', required: false },
  { id: 'applicationDate', label: 'Application Date', type: 'date', required: false },
  { id: 'timeline', label: 'Timeline', type: 'text', required: false },
  { id: 'notes', label: 'Notes', type: 'text', required: false },
  { id: 'link', label: 'Link', type: 'url', required: false },
  { id: 'platform', label: 'Platform', type: 'text', required: false },
  { id: 'salary', label: 'Salary', type: 'text', required: false },
  { id: 'contactName', label: 'Contact', type: 'text', required: false },
  { id: 'followUpDate', label: 'Follow Up', type: 'date', required: false },
];

export const DEFAULT_PREFERENCES: UserPreferences = {
  enabledFields: DEFAULT_FIELDS.filter(field => field.id !== 'notes').map(field => field.id),
  columnOrder: DEFAULT_FIELDS.map(field => field.id),
  customFields: [],
  defaultView: 'table',
  dateFormat: 'YYYY-MM-DD',
  customInterviewEvents: [],
  atsSearch: {
    roles: '"customer success engineer" OR "customer success" OR "customer support" OR "technical support"',
    keywords: '"hiring" OR "apply" OR "open role"',
    location: '"remote" OR "work from home"',
  },
  emailScanMonths: 3,
  enabledChatbots: ['ChatGPT', 'Claude', 'Gemini'],
};

export const CHATBOTS = [
  { id: 'ChatGPT', name: 'ChatGPT', url: 'https://chatgpt.com/' },
  { id: 'Claude', name: 'Claude', url: 'https://claude.ai/new' },
  { id: 'Gemini', name: 'Gemini', url: 'https://gemini.google.com/app' },
];

export const ATS_PLATFORMS = [
  { id: 'ashby', name: 'Ashby', url: 'jobs.ashbyhq.com' },
  { id: 'teamtailor', name: 'Teamtailor', url: '*.teamtailor.com' },
  { id: 'workday', name: 'Workday', url: 'myworkdayjobs.com' },
  { id: 'greenhouse', name: 'Greenhouse', url: 'boards.greenhouse.io' },
  { id: 'lever', name: 'Lever', url: 'jobs.lever.co' },
  { id: 'icims', name: 'iCIMS', url: '*.icims.com' },
  { id: 'workable', name: 'Workable', url: 'apply.workable.com' },
];

export const INTERVIEW_TYPES = new Set<InterviewStageType>([
  'screener_call',
  'first_contact',
  'technical_interview',
  'code_challenge',
  'live_coding',
  'hiring_manager',
  'system_design',
  'cultural_fit',
  'final_round',
]);
