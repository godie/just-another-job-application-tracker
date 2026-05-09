// src/utils/geminiJobScoring.ts

import type { JobOpportunity } from '../types/opportunities';
import type {
  UserMatchProfile,
  JobMatchResult,
  JobMatchSubscores,
  MatchConfidence,
  MatchVerdict,
} from '../types/matching';
import { callGeminiApi } from './geminiApi';
import { calculateDeterministicScore } from './matching';

interface GeminiScoringResponse {
  overallScore: number;
  semanticFit: number;
  historicalFit: number;
  skillsFit: number;
  locationWorkTypeFit: number;
  compensationFit: number;
  seniorityFit: number;
  confidence: MatchConfidence;
  strengths: string[];
  gaps: string[];
  verdict: MatchVerdict;
  explanation: string;
}

const SYSTEM_PROMPT = `You are an expert talent matcher. Score how well a job opportunity matches a candidate profile.

Rules:
- Scores are 0-100 integers.
- Be fair: don't inflate scores. A score of 70+ means genuinely strong fit.
- Consider role alignment, skills match, seniority fit, compensation, location/work type.
- semanticFit: how well the role description and responsibilities align with the candidate's experience and goals.
- historicalFit: how similar this is to roles the candidate has succeeded with (based on successPatterns).
- skillsFit: explicit technical/soft skills overlap.
- locationWorkTypeFit: geographic and remote/hybrid/on-site preferences.
- compensationFit: salary alignment.
- seniorityFit: level appropriateness.
- Provide 2-4 concise strengths and 1-3 gaps.
- explanation: one sentence summary of the verdict.
- Return ONLY valid JSON. No markdown.

JSON Schema:
{
  "overallScore": number,
  "semanticFit": number,
  "historicalFit": number,
  "skillsFit": number,
  "locationWorkTypeFit": number,
  "compensationFit": number,
  "seniorityFit": number,
  "confidence": "low|medium|high",
  "strengths": ["string"],
  "gaps": ["string"],
  "verdict": "excellent_fit|good_fit|partial_fit|low_fit",
  "explanation": "string"
}`;

function buildScoringPrompt(opportunity: JobOpportunity, profile: UserMatchProfile): string {
  return `Score this job opportunity against the candidate profile.

## Job Opportunity
Title: ${opportunity.position}
Company: ${opportunity.company}
Location: ${opportunity.location ?? 'Not specified'}
Work Type: ${opportunity.jobType ?? 'Not specified'}
Salary: ${opportunity.salary ?? 'Not specified'}
Description: ${(opportunity.description ?? '').substring(0, 3000)}

## Candidate Profile
Target Roles: ${profile.targetRoles.join(', ')}
Seniority: ${profile.seniority ?? 'Not specified'}
Top Skills: ${profile.topSkills.join(', ')}
Preferred Work Types: ${profile.preferredWorkTypes.join(', ')}
Preferred Locations: ${profile.preferredLocations.join(', ')}
Salary Range: ${profile.salaryRange ? `${profile.salaryRange.min ?? 'any'} - ${profile.salaryRange.max ?? 'any'} ${profile.salaryRange.currency}` : 'Not specified'}
Industries: ${profile.preferredIndustries.join(', ') || 'Not specified'}
Profile Summary: ${profile.profileSummary}
Success Patterns: ${profile.successPatterns.join('; ') || 'None recorded'}
Avoid Patterns: ${profile.avoidPatterns.join('; ') || 'None recorded'}
${profile.cvText ? `\nCV Excerpt: ${profile.cvText.substring(0, 2000)}` : ''}

Provide the match score and analysis as JSON.`;
}

/**
 * Score a single opportunity against a profile using Gemini AI.
 */
async function scoreOpportunityWithGemini(
  apiKey: string,
  opportunity: JobOpportunity,
  profile: UserMatchProfile
): Promise<JobMatchResult | null> {
  try {
    const prompt = buildScoringPrompt(opportunity, profile);
    const response = await callGeminiApi(apiKey, prompt, {
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.15,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    });

    const parsed: GeminiScoringResponse = JSON.parse(response);

    const subscores: JobMatchSubscores = {
      semanticFit: clamp(parsed.semanticFit ?? 50),
      historicalFit: clamp(parsed.historicalFit ?? 50),
      skillsFit: clamp(parsed.skillsFit ?? 50),
      locationWorkTypeFit: clamp(parsed.locationWorkTypeFit ?? 50),
      compensationFit: clamp(parsed.compensationFit ?? 50),
      seniorityFit: clamp(parsed.seniorityFit ?? 50),
    };

    // Recalculate overall to ensure consistency with weights
    const overallScore = Math.round(
      subscores.semanticFit * 0.30 +
      subscores.historicalFit * 0.20 +
      subscores.skillsFit * 0.25 +
      subscores.locationWorkTypeFit * 0.15 +
      subscores.compensationFit * 0.05 +
      subscores.seniorityFit * 0.05
    );

    return {
      opportunityId: opportunity.id,
      overallScore: clamp(overallScore),
      confidence: parsed.confidence ?? 'medium',
      subscores,
      strengths: parsed.strengths ?? ['No specific strengths identified'],
      gaps: parsed.gaps ?? ['No specific gaps identified'],
      verdict: parsed.verdict ?? 'partial_fit',
      explanation: parsed.explanation ?? 'Match scored by AI.',
      profileVersion: profile.profileVersion,
      computedAt: new Date().toISOString(),
      computationMethod: 'gemini',
    };
  } catch (error) {
    console.error('Error scoring opportunity with Gemini:', error);
    return null;
  }
}

/**
 * Calculate a hybrid score: deterministic base + Gemini enrichment when available.
 * If Gemini fails, falls back to deterministic.
 */
async function calculateHybridScore(
  apiKey: string | null,
  opportunity: JobOpportunity,
  profile: UserMatchProfile
): Promise<JobMatchResult> {
  const deterministic = calculateDeterministicScore(opportunity, profile, profile.profileVersion);

  if (!apiKey) {
    return deterministic;
  }

  try {
    const geminiResult = await scoreOpportunityWithGemini(apiKey, opportunity, profile);
    if (!geminiResult) {
      return deterministic;
    }

    // Blend: 60% deterministic + 40% Gemini for stability
    const blendedSubscores: JobMatchSubscores = {
      semanticFit: Math.round(deterministic.subscores.semanticFit * 0.4 + geminiResult.subscores.semanticFit * 0.6),
      historicalFit: Math.round(deterministic.subscores.historicalFit * 0.6 + geminiResult.subscores.historicalFit * 0.4),
      skillsFit: Math.round(deterministic.subscores.skillsFit * 0.5 + geminiResult.subscores.skillsFit * 0.5),
      locationWorkTypeFit: Math.round(deterministic.subscores.locationWorkTypeFit * 0.6 + geminiResult.subscores.locationWorkTypeFit * 0.4),
      compensationFit: Math.round(deterministic.subscores.compensationFit * 0.7 + geminiResult.subscores.compensationFit * 0.3),
      seniorityFit: Math.round(deterministic.subscores.seniorityFit * 0.5 + geminiResult.subscores.seniorityFit * 0.5),
    };

    const blendedOverall = Math.round(
      blendedSubscores.semanticFit * 0.30 +
      blendedSubscores.historicalFit * 0.20 +
      blendedSubscores.skillsFit * 0.25 +
      blendedSubscores.locationWorkTypeFit * 0.15 +
      blendedSubscores.compensationFit * 0.05 +
      blendedSubscores.seniorityFit * 0.05
    );

    // Use Gemini's narrative but blend scores
    return {
      opportunityId: opportunity.id,
      overallScore: clamp(blendedOverall),
      confidence: geminiResult.confidence,
      subscores: blendedSubscores,
      strengths: geminiResult.strengths.length > 0 ? geminiResult.strengths : deterministic.strengths,
      gaps: geminiResult.gaps.length > 0 ? geminiResult.gaps : deterministic.gaps,
      verdict: geminiResult.verdict,
      explanation: geminiResult.explanation,
      profileVersion: profile.profileVersion,
      computedAt: new Date().toISOString(),
      computationMethod: 'hybrid',
    };
  } catch (error) {
    console.error('Hybrid scoring failed, returning deterministic:', error);
    return deterministic;
  }
}

/**
 * Batch score multiple opportunities with hybrid scoring.
 */
export async function batchCalculateHybridScores(
  apiKey: string | null,
  opportunities: JobOpportunity[],
  profile: UserMatchProfile
): Promise<Record<string, JobMatchResult>> {
  const results: Record<string, JobMatchResult> = {};

  // Score sequentially to avoid rate limits
  for (const opp of opportunities) {
    try {
      results[opp.id] = await calculateHybridScore(apiKey, opp, profile);
    } catch (error) {
      console.error(`Failed to score opportunity ${opp.id}:`, error);
      // Fallback to deterministic on individual failure
      results[opp.id] = calculateDeterministicScore(opp, profile, profile.profileVersion);
    }
  }

  return results;
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}
