// src/types/preferences.ts

/**
 * Configurable field definitions for applications table & forms
 */
export type FieldType = 'text' | 'date' | 'number' | 'select' | 'checkbox' | 'url';

export interface FieldDefinition {
  /**
   * Internal identifier, also used to map against JobApplication keys.
   * Example: "position", "company", "applicationdate"
   */
  id: string;
  /** Human readable label shown in UI */
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
}

export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type ViewType = 'table' | 'timeline' | 'kanban' | 'calendar';

/**
 * Custom interview event type definition
 */
export interface CustomInterviewEvent {
  id: string;
  label: string;
}

export interface ATSSearchPreferences {
  roles: string;
  keywords: string;
  location: string;
}

export interface UserPreferences {
  /** IDs of fields that should be visible/enabled in the table */
  enabledFields: string[];
  /** User defined additional fields (stored for future expansion) */
  customFields: FieldDefinition[];
  /** Order of columns in the table (references field IDs) */
  columnOrder: string[];
  /** Default view to show when opening the applications page */
  defaultView: ViewType;
  /** Date format preference */
  dateFormat: DateFormat;
  /** User defined custom interview event types */
  customInterviewEvents: CustomInterviewEvent[];
  /** ATS Search filters configuration */
  atsSearch?: ATSSearchPreferences;
}

