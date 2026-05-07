// src/utils/geminiProfile.ts

import type { JobApplication } from '../types/applications';
import type { UserMatchProfile, SeniorityLevel } from '../types/matching';
import { callGeminiApi } from './geminiApi';
import { buildProfileFromHistory } from './matching';

interface GeminiProfileResponse {
  targetRoles: string[];
  seniority: SeniorityLevel | null;
  topSkills: string[];
  preferredWorkTypes: ('remote' | 'on-site' | 'hybrid')[];
  preferredLocations: string[];
  salaryRange: { min?: number; max?: number; currency: string } | null;
  preferredIndustries: string[];
  profileSummary: string;
  successPatterns: string[];
  avoidPatterns: string[];
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Redact company names to protect privacy before sending to Gemini.
 */
function redactApplicationsForGemini(apps: JobApplication[]): Array<{
  position: string;
  company: string;
  location?: string;
  workType?: string;
  salary: string;
  status: string;
  timeline: Array<{
    type: string;
    status: string;
    date: string;
  }>;
  notes?: string;
}> {
  const companyMap = new Map<string, string>();
  let counter = 1;

  function getRedacted(name: string): string {
    const key = name.toLowerCase().trim();
    if (!key) return '[COMPANY]';
    if (!companyMap.has(key)) {
      companyMap.set(key, `[COMPANY_${counter++}]`);
    }
    return companyMap.get(key)!;
  }

  return apps.map((app) => {
    const redacted: ReturnType<typeof redactApplicationsForGemini>[number] = {
      position: app.position,
      company: getRedacted(app.company),
      location: app.location,
      workType: app.workType,
      salary: app.salary,
      status: app.status,
      timeline: app.timeline.map((t) => ({
        type: t.type,
        status: t.status,
        date: t.date,
      })),
    };
    return redacted;
  });
}

const SYSTEM_PROMPT = `You are an expert career coach and talent analyst. Your task is to analyze a user's job application history and synthesize a professional profile for job matching.

Rules:
- Infer the user's career trajectory, target roles, seniority level, skills, and preferences.
- Be concise but insightful. Focus on patterns in their applications.
- Identify what has worked (positive signals: interviews, offers) and what hasn't.
- Return ONLY valid JSON matching the schema below. No markdown, no explanation text.
- Seniority levels: intern, junior, mid, senior, staff, lead, principal, executive.
- Work types: remote, on-site, hybrid.
- Currency: infer from salary strings (USD, EUR, GBP, etc.).

JSON Schema:
{
  "targetRoles": ["string"],
  "seniority": "string or null",
  "topSkills": ["string"],
  "preferredWorkTypes": ["remote|on-site|hybrid"],
  "preferredLocations": ["string"],
  "salaryRange": { "min": number, "max": number, "currency": "string" } or null,
  "preferredIndustries": ["string"],
  "profileSummary": "string (1-2 sentences)",
  "successPatterns": ["string"],
  "avoidPatterns": ["string"],
  "confidence": "low|medium|high"
}`;

/**
 * Synthesize a UserMatchProfile from application history using Gemini AI.
 * Sends redacted application data to protect privacy.
 */
export async function synthesizeUserProfileWithGemini(
  apiKey: string,
  applications: JobApplication[],
  options?: {
    cvText?: string;
    includeNotes?: boolean;
    includeTimeline?: boolean;
    existingProfile?: UserMatchProfile | null;
  }
): Promise<UserMatchProfile | null> {
  if (applications.length === 0 && !options?.cvText) {
    return null;
  }

  const redactedApps = redactApplicationsForGemini(applications);

  // If user opts out of notes/timeline, strip them
  const appsToSend = redactedApps.map((app) => {
    const a = { ...app };
    if (!options?.includeNotes) {
      delete a.notes;
    }
    if (!options?.includeTimeline) {
      a.timeline = [];
    }
    return a;
  });

  let userPrompt = `Analyze this job application history and create a profile:\n\n${JSON.stringify(appsToSend, null, 2)}`;

  if (options?.cvText) {
    userPrompt += `\n\nAdditional CV/Resume text:\n${options.cvText.substring(0, 8000)}`;
  }

  if (options?.existingProfile) {
    userPrompt += `\n\nPrevious profile (for reference, version ${options.existingProfile.profileVersion}):\n${JSON.stringify(
      {
        targetRoles: options.existingProfile.targetRoles,
        seniority: options.existingProfile.seniority,
        topSkills: options.existingProfile.topSkills,
        profileSummary: options.existingProfile.profileSummary,
      },
      null,
      2
    )}`;
  }

  try {
    const response = await callGeminiApi(apiKey, userPrompt, {
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    });

    const parsed: GeminiProfileResponse = JSON.parse(response);

    const profile: UserMatchProfile = {
      targetRoles: parsed.targetRoles ?? [],
      seniority: parsed.seniority,
      topSkills: parsed.topSkills ?? [],
      preferredWorkTypes: parsed.preferredWorkTypes ?? ['remote', 'hybrid'],
      preferredLocations: parsed.preferredLocations ?? [],
      salaryRange: parsed.salaryRange,
      preferredIndustries: parsed.preferredIndustries ?? [],
      profileSummary: parsed.profileSummary ?? 'Profile generated by AI',
      successPatterns: parsed.successPatterns ?? [],
      avoidPatterns: parsed.avoidPatterns ?? [],
      profileVersion: (options?.existingProfile?.profileVersion ?? 0) + 1,
      confidence: parsed.confidence ?? 'low',
      lastComputed: new Date().toISOString(),
      cvText: options?.cvText,
    };

    return profile;
  } catch (error) {
    console.error('Error synthesizing profile with Gemini:', error);
    return null;
  }
}

/**
 * Build a hybrid profile: deterministic base + AI enrichment if available.
 */
export async function buildHybridProfile(
  apiKey: string | null,
  applications: JobApplication[],
  options?: {
    cvText?: string;
    includeNotes?: boolean;
    includeTimeline?: boolean;
    deterministicProfile: UserMatchProfile;
  }
): Promise<UserMatchProfile> {
  const deterministic = options?.deterministicProfile ?? buildProfileFromHistory(applications);

  if (!apiKey) {
    return deterministic;
  }

  try {
    const aiProfile = await synthesizeUserProfileWithGemini(apiKey, applications, {
      cvText: options?.cvText,
      includeNotes: options?.includeNotes,
      includeTimeline: options?.includeTimeline,
      existingProfile: deterministic,
    });

    if (!aiProfile) {
      return deterministic;
    }

    // Merge: AI enriches what deterministic missed
    return {
      ...deterministic,
      targetRoles: aiProfile.targetRoles.length > 0 ? aiProfile.targetRoles : deterministic.targetRoles,
      seniority: aiProfile.seniority ?? deterministic.seniority,
      topSkills: aiProfile.topSkills.length > 0 ? aiProfile.topSkills : deterministic.topSkills,
      preferredWorkTypes: aiProfile.preferredWorkTypes.length > 0 ? aiProfile.preferredWorkTypes : deterministic.preferredWorkTypes,
      preferredLocations: aiProfile.preferredLocations.length > 0 ? aiProfile.preferredLocations : deterministic.preferredLocations,
      salaryRange: aiProfile.salaryRange ?? deterministic.salaryRange,
      preferredIndustries: aiProfile.preferredIndustries.length > 0 ? aiProfile.preferredIndustries : deterministic.preferredIndustries,
      profileSummary: aiProfile.profileSummary || deterministic.profileSummary,
      successPatterns: [...new Set([...deterministic.successPatterns, ...aiProfile.successPatterns])],
      avoidPatterns: [...new Set([...deterministic.avoidPatterns, ...aiProfile.avoidPatterns])],
      profileVersion: aiProfile.profileVersion,
      confidence: aiProfile.confidence,
      lastComputed: aiProfile.lastComputed,
      cvText: options?.cvText ?? deterministic.cvText,
    };
  } catch (error) {
    console.error('Hybrid profile build failed, falling back to deterministic:', error);
    return deterministic;
  }
}

// Re-export buildProfileFromHistory for convenience
export { buildProfileFromHistory } from './matching';
