import type { EmailScanState, EmailScanAction } from './types';

export function emailScanReducer(state: EmailScanState, action: EmailScanAction): EmailScanState {
  switch (action.type) {
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    case 'TOGGLE_ADDITION': {
      const next = new Set(state.selectedAdditions);
      if (next.has(action.payload)) next.delete(action.payload);
      else next.add(action.payload);
      return { ...state, selectedAdditions: next };
    }
    case 'TOGGLE_UPDATE': {
      const next = new Set(state.selectedUpdates);
      if (next.has(action.payload)) next.delete(action.payload);
      else next.add(action.payload);
      return { ...state, selectedUpdates: next };
    }
    case 'SELECT_ALL_ADDITIONS':
      return { ...state, selectedAdditions: new Set<string>(action.payload) };
    case 'SELECT_ALL_UPDATES':
      return { ...state, selectedUpdates: new Set<string>(action.payload) };
    case 'SET_SCAN_MONTHS':
      return { ...state, scanMonths: action.payload };
    case 'SET_SNIPPET_LENGTH':
      return { ...state, snippetLength: action.payload };
    case 'TOGGLE_EMAIL': {
      const next = new Set<string>(state.selectedEmailIds);
      if (next.has(action.payload)) next.delete(action.payload);
      else next.add(action.payload);
      return { ...state, selectedEmailIds: next };
    }
    case 'SELECT_ALL_EMAILS':
      return { ...state, selectedEmailIds: new Set<string>(action.payload) };
    case 'SET_PASTED_JSON':
      return { ...state, pastedJson: action.payload };
    case 'TOGGLE_FORCE_ADD': {
      const next = new Set(state.forceAddIds);
      if (next.has(action.payload)) next.delete(action.payload);
      else next.add(action.payload);
      return { ...state, forceAddIds: next };
    }
    case 'CLEAR_SELECTIONS':
      return {
        ...state,
        selectedAdditions: new Set<string>(),
        selectedUpdates: new Set<string>(),
      };
    case 'APPLIED_CHANGES': {
      const nextAdditions = new Set<string>(state.selectedAdditions);
      const nextUpdates = new Set<string>(state.selectedUpdates);
      action.payload.additions.forEach((id) => nextAdditions.delete(id));
      action.payload.updates.forEach((id) => nextUpdates.delete(id));
      return { ...state, selectedAdditions: nextAdditions, selectedUpdates: nextUpdates };
    }
    default:
      return state;
  }
}
