import type { ScanPreview } from '../../mails/types';

export interface EmailScanState {
  activeTab: 'automatic' | 'manual';
  selectedAdditions: Set<string>;
  selectedUpdates: Set<string>;
  scanMonths: number;
  snippetLength: number;
  selectedEmailIds: Set<string>;
  pastedJson: string;
  forceAddIds: Set<string>;
}

export type EmailScanAction =
  | { type: 'SET_ACTIVE_TAB'; payload: 'automatic' | 'manual' }
  | { type: 'TOGGLE_ADDITION'; payload: string }
  | { type: 'TOGGLE_UPDATE'; payload: string }
  | { type: 'SELECT_ALL_ADDITIONS'; payload: string[] }
  | { type: 'SELECT_ALL_UPDATES'; payload: string[] }
  | { type: 'SET_SCAN_MONTHS'; payload: number }
  | { type: 'SET_SNIPPET_LENGTH'; payload: number }
  | { type: 'TOGGLE_EMAIL'; payload: string }
  | { type: 'SELECT_ALL_EMAILS'; payload: string[] }
  | { type: 'SET_PASTED_JSON'; payload: string }
  | { type: 'TOGGLE_FORCE_ADD'; payload: string }
  | { type: 'CLEAR_SELECTIONS' }
  | { type: 'APPLIED_CHANGES'; payload: { additions: string[]; updates: string[] } };

export type PreviewSetState = React.Dispatch<React.SetStateAction<ScanPreview | null>>;
