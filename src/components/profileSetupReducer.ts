
import type { SeniorityLevel } from '../types/matching';

export interface ProfileSetupState {
  targetRoles: string;
  seniority: SeniorityLevel | '';
  topSkills: string;
  preferredLocations: string;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  selectedWorkTypes: ('remote' | 'on-site' | 'hybrid')[];
  cvText: string;
  activeTab: 'manual' | 'cv';
}

export type ProfileSetupAction =
  | { type: 'SET_TARGET_ROLES'; value: string }
  | { type: 'SET_SENIORITY'; value: SeniorityLevel | '' }
  | { type: 'SET_TOP_SKILLS'; value: string }
  | { type: 'SET_PREFERRED_LOCATIONS'; value: string }
  | { type: 'SET_SALARY_MIN'; value: string }
  | { type: 'SET_SALARY_MAX'; value: string }
  | { type: 'SET_SALARY_CURRENCY'; value: string }
  | { type: 'TOGGLE_WORK_TYPE'; value: 'remote' | 'on-site' | 'hybrid' }
  | { type: 'SET_CV_TEXT'; value: string }
  | { type: 'SET_ACTIVE_TAB'; value: 'manual' | 'cv' };

export function profileSetupReducer(state: ProfileSetupState, action: ProfileSetupAction): ProfileSetupState {
  switch (action.type) {
    case 'SET_TARGET_ROLES':
      return { ...state, targetRoles: action.value };
    case 'SET_SENIORITY':
      return { ...state, seniority: action.value };
    case 'SET_TOP_SKILLS':
      return { ...state, topSkills: action.value };
    case 'SET_PREFERRED_LOCATIONS':
      return { ...state, preferredLocations: action.value };
    case 'SET_SALARY_MIN':
      return { ...state, salaryMin: action.value };
    case 'SET_SALARY_MAX':
      return { ...state, salaryMax: action.value };
    case 'SET_SALARY_CURRENCY':
      return { ...state, salaryCurrency: action.value };
    case 'TOGGLE_WORK_TYPE':
      return {
        ...state,
        selectedWorkTypes: state.selectedWorkTypes.includes(action.value)
          ? state.selectedWorkTypes.filter((w) => w !== action.value)
          : [...state.selectedWorkTypes, action.value],
      };
    case 'SET_CV_TEXT':
      return { ...state, cvText: action.value };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.value };
    default:
      return state;
  }
}
