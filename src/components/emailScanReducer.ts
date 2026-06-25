
export interface EmailScanReviewState {
  activeTab: 'automatic' | 'manual';
  processingMode: 'manual' | 'api';
  showGeminiModal: boolean;
  geminiProcessing: boolean;
  scanMonths: number;
  snippetLength: number;
  pastedJson: string;
}

export type EmailScanReviewAction =
  | { type: 'SET_ACTIVE_TAB'; value: 'automatic' | 'manual' }
  | { type: 'SET_PROCESSING_MODE'; value: 'manual' | 'api' }
  | { type: 'SET_SHOW_GEMINI_MODAL'; value: boolean }
  | { type: 'SET_GEMINI_PROCESSING'; value: boolean }
  | { type: 'SET_SCAN_MONTHS'; value: number }
  | { type: 'SET_SNIPPET_LENGTH'; value: number }
  | { type: 'SET_PASTED_JSON'; value: string };

export function emailScanReviewReducer(state: EmailScanReviewState, action: EmailScanReviewAction): EmailScanReviewState {
  switch (action.type) {
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.value };
    case 'SET_PROCESSING_MODE':
      return { ...state, processingMode: action.value };
    case 'SET_SHOW_GEMINI_MODAL':
      return { ...state, showGeminiModal: action.value };
    case 'SET_GEMINI_PROCESSING':
      return { ...state, geminiProcessing: action.value };
    case 'SET_SCAN_MONTHS':
      return { ...state, scanMonths: action.value };
    case 'SET_SNIPPET_LENGTH':
      return { ...state, snippetLength: action.value };
    case 'SET_PASTED_JSON':
      return { ...state, pastedJson: action.value };
    default:
      return state;
  }
}
