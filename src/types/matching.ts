
export type MatchConfidence = 'low' | 'medium' | 'high';
export type MatchVerdict = 'excellent_fit' | 'good_fit' | 'partial_fit' | 'low_fit';
export type SeniorityLevel = 'intern' | 'junior' | 'mid' | 'senior' | 'staff' | 'lead' | 'principal' | 'executive';

export interface UserMatchProfile {
  targetRoles: string[];
  seniority: SeniorityLevel | null;
  topSkills: string[];
  preferredWorkTypes: ('remote' | 'on-site' | 'hybrid')[];
  preferredLocations: string[];
  salaryRange: { min?: number; max?: number; currency: string } | null;
  preferredIndustries: string[];
  explicitRoles?: string[];
  explicitSkills?: string[];
  cvText?: string;
  profileSummary: string;
  successPatterns: string[];
  avoidPatterns: string[];
  profileVersion: number;
  confidence: MatchConfidence;
  lastComputed: string;
}

export interface JobMatchSubscores {
  semanticFit: number;
  historicalFit: number;
  skillsFit: number;
  locationWorkTypeFit: number;
  compensationFit: number;
  seniorityFit: number;
}

export interface JobMatchResult {
  opportunityId: string;
  overallScore: number;
  confidence: MatchConfidence;
  subscores: JobMatchSubscores;
  strengths: string[];
  gaps: string[];
  verdict: MatchVerdict;
  explanation: string;
  profileVersion: number;
  computedAt: string;
  computationMethod: 'deterministic' | 'gemini' | 'hybrid';
}

export interface MatchingPreferences {
  enabled: boolean;
  useGemini: boolean;
  includeCvText: boolean;
  includeNotes: boolean;
  includeTimeline: boolean;
  minMatchThreshold: number;
  prioritizeRemote: boolean;
  autoComputeOnOpportunityAdd: boolean;
}

export interface UserFeedbackOnMatch {
  opportunityId: string;
  profileVersion: number;
  feedback: 'thumbs_up' | 'thumbs_down' | 'irrelevant';
  timestamp: string;
  notes?: string;
}
