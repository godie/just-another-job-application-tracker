
type FieldType = 'text' | 'date' | 'number' | 'select' | 'checkbox' | 'url';

export interface FieldDefinition {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
}

export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type ViewType = 'table' | 'timeline' | 'kanban' | 'calendar';

export interface CustomInterviewEvent {
  id: string;
  label: string;
}

export interface ATSSearchPreferences {
  roles: string[];
  keywords: string[];
  location: string[];
  source?: string;
  techStack?: string[];
}

export interface UserPreferences {
  enabledFields: string[];
  customFields: FieldDefinition[];
  columnOrder: string[];
  defaultView: ViewType;
  dateFormat: DateFormat;
  customInterviewEvents: CustomInterviewEvent[];
  atsSearch?: ATSSearchPreferences;
  emailScanMonths?: number;
  enabledChatbots?: string[];
}

