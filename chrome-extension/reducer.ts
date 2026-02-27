import { JobOpportunity } from './components/PopupForm';

export interface State {
  opportunity: JobOpportunity;
  saveAsApplication: boolean;
  isLoading: boolean;
  isSaving: boolean;
  message: { type: 'success' | 'error' | 'info'; text: string } | null;
}

export type Action =
  | { type: 'SET_OPPORTUNITY'; payload: Partial<JobOpportunity> }
  | { type: 'MERGE_OPPORTUNITY'; payload: Partial<JobOpportunity> }
  | { type: 'SET_SAVE_AS_APPLICATION'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_MESSAGE'; payload: { type: 'success' | 'error' | 'info'; text: string } | null }
  | { type: 'SET_DATA_EXTRACTED'; payload: Partial<JobOpportunity> }
  | { type: 'INIT_TAB_DATA'; payload: { link: string; isLoading?: boolean; message?: { type: 'success' | 'error' | 'info'; text: string } | null } }
  | { type: 'RESET_FORM' };

export const initialState: State = {
  opportunity: {
    position: '',
    company: '',
    link: '',
    description: '',
    location: '',
    jobType: '',
    salary: '',
    postedDate: '',
  },
  saveAsApplication: false,
  isLoading: true,
  isSaving: false,
  message: null,
};

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_OPPORTUNITY':
      return { ...state, opportunity: { ...state.opportunity, ...action.payload } };
    case 'MERGE_OPPORTUNITY':
      return {
        ...state,
        opportunity: {
          ...state.opportunity,
          position: action.payload.position || state.opportunity.position,
          company: action.payload.company || state.opportunity.company,
          description: action.payload.description || state.opportunity.description,
          location: action.payload.location || state.opportunity.location,
          jobType: action.payload.jobType || state.opportunity.jobType,
          salary: action.payload.salary || state.opportunity.salary,
          postedDate: action.payload.postedDate || state.opportunity.postedDate,
          link: action.payload.link || state.opportunity.link,
        },
      };
    case 'SET_SAVE_AS_APPLICATION':
      return { ...state, saveAsApplication: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };
    case 'SET_MESSAGE':
      return { ...state, message: action.payload };
    case 'SET_DATA_EXTRACTED':
      return {
        ...state,
        isLoading: false,
        opportunity: { ...state.opportunity, ...action.payload },
        message: (action.payload.position || action.payload.company)
          ? { type: 'success', text: 'Job data extracted automatically!' }
          : state.message,
      };
    case 'INIT_TAB_DATA':
      return {
        ...state,
        opportunity: { ...state.opportunity, link: action.payload.link },
        isLoading: action.payload.isLoading ?? state.isLoading,
        message: action.payload.message !== undefined ? action.payload.message : state.message,
      };
    case 'RESET_FORM':
      return {
        ...state,
        opportunity: initialState.opportunity,
        saveAsApplication: false,
        message: null,
      };
    default:
      return state;
  }
}
