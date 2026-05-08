// src/utils/matching.test.ts

import { describe, it, expect } from 'vitest';
import type { JobApplication, InterviewEvent } from '../types/applications';
import type { JobOpportunity } from '../types/opportunities';
import type { UserMatchProfile } from '../types/matching';
import {
  extractSeniorityFromTitle,
  calculateRoleSimilarity,
  extractSkillsFromDescription,
  calculateSkillsMatch,
  calculateCompensationFit,
  isWorkTypeMatch,
  buildProfileFromHistory,
  calculateDeterministicScore,
  batchCalculateScores,
} from './matching';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeApp(overrides: Partial<JobApplication> = {}): JobApplication {
  return {
    id: 'app-1',
    position: 'Software Engineer',
    company: 'Acme Corp',
    salary: '$120k',
    status: 'applied',
    applicationDate: '2024-01-15',
    interviewDate: '',
    timeline: [],
    notes: '',
    link: 'https://example.com',
    platform: 'LinkedIn',
    contactName: '',
    followUpDate: '',
    ...overrides,
  };
}

function makeEvent(type: InterviewEvent['type']): InterviewEvent {
  return {
    id: 'ev-1',
    type,
    date: '2024-02-01',
    status: 'completed',
  };
}

function makeOpp(overrides: Partial<JobOpportunity> = {}): JobOpportunity {
  return {
    id: 'opp-1',
    position: 'Senior Software Engineer',
    company: 'TechCorp',
    link: 'https://example.com/job',
    capturedDate: '2024-03-01',
    ...overrides,
  };
}

function makeProfile(overrides: Partial<UserMatchProfile> = {}): UserMatchProfile {
  return {
    targetRoles: ['Software Engineer', 'Backend Engineer'],
    seniority: 'senior',
    topSkills: ['javascript', 'react', 'node.js'],
    preferredWorkTypes: ['remote', 'hybrid'],
    preferredLocations: ['Remote', 'San Francisco'],
    salaryRange: { min: 100000, max: 160000, currency: 'USD' },
    preferredIndustries: [],
    profileSummary: 'Test profile',
    successPatterns: [],
    avoidPatterns: [],
    profileVersion: 1,
    confidence: 'high',
    lastComputed: new Date().toISOString(),
    ...overrides,
  };
}

// ─── extractSeniorityFromTitle ────────────────────────────────────────────

describe('extractSeniorityFromTitle', () => {
  it('detects junior roles', () => {
    expect(extractSeniorityFromTitle('Junior Developer')).toBe('junior');
    expect(extractSeniorityFromTitle('Jr. Software Engineer')).toBe('junior');
    expect(extractSeniorityFromTitle('Entry Level Data Scientist')).toBe('junior');
  });

  it('detects senior roles', () => {
    expect(extractSeniorityFromTitle('Senior Backend Engineer')).toBe('senior');
    expect(extractSeniorityFromTitle('Sr. Frontend Developer')).toBe('senior');
  });

  it('detects staff and lead roles', () => {
    expect(extractSeniorityFromTitle('Staff Engineer')).toBe('staff');
    expect(extractSeniorityFromTitle('Tech Lead')).toBe('lead');
  });

  it('detects intern roles', () => {
    expect(extractSeniorityFromTitle('Software Engineering Intern')).toBe('intern');
    expect(extractSeniorityFromTitle('Summer Internship 2024')).toBe('intern');
  });

  it('detects executive roles', () => {
    expect(extractSeniorityFromTitle('VP of Engineering')).toBe('executive');
    expect(extractSeniorityFromTitle('Director of Product')).toBe('executive');
    expect(extractSeniorityFromTitle('CTO')).toBe('executive');
  });

  it('returns null for ambiguous titles', () => {
    expect(extractSeniorityFromTitle('Software Engineer')).toBeNull();
    expect(extractSeniorityFromTitle('Developer')).toBeNull();
  });
});

// ─── calculateRoleSimilarity ────────────────────────────────────────────────

describe('calculateRoleSimilarity', () => {
  it('returns 100 for exact match', () => {
    expect(calculateRoleSimilarity('Software Engineer', ['Software Engineer'])).toBe(100);
  });

  it('returns 100 for substring match', () => {
    expect(calculateRoleSimilarity('Senior Software Engineer', ['Software Engineer'])).toBe(100);
    expect(calculateRoleSimilarity('Software Engineer', ['Senior Software Engineer'])).toBe(100);
  });

  it('calculates word overlap', () => {
    const score = calculateRoleSimilarity('Backend Engineer', ['Software Engineer']);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });

  it('returns 0 for completely unrelated roles', () => {
    expect(calculateRoleSimilarity('Marketing Manager', ['Software Engineer'])).toBe(0);
  });

  it('returns 0 when targetRoles is empty', () => {
    expect(calculateRoleSimilarity('Software Engineer', [])).toBe(0);
  });

  it('picks the best match from multiple target roles', () => {
    expect(calculateRoleSimilarity('Data Scientist', ['Software Engineer', 'Data Scientist'])).toBe(100);
  });
});

// ─── extractSkillsFromDescription ─────────────────────────────────────────

describe('extractSkillsFromDescription', () => {
  it('finds common tech skills', () => {
    const desc = 'We use React, Node.js, and PostgreSQL in our stack.';
    const skills = extractSkillsFromDescription(desc);
    expect(skills).toContain('react');
    expect(skills).toContain('node.js');
    expect(skills).toContain('postgresql');
  });

  it('is case-insensitive', () => {
    const desc = 'Looking for REACT and NODEJS developers.';
    const skills = extractSkillsFromDescription(desc);
    expect(skills).toContain('react');
    expect(skills).toContain('nodejs');
  });

  it('returns empty array for undefined description', () => {
    expect(extractSkillsFromDescription(undefined)).toEqual([]);
  });

  it('returns empty array for empty description', () => {
    expect(extractSkillsFromDescription('')).toEqual([]);
  });

  it('deduplicates skills', () => {
    const desc = 'React, React, and more React. Also Node.js and node.js.';
    const skills = extractSkillsFromDescription(desc);
    expect(skills.filter((s) => s === 'react').length).toBe(1);
  });
});

// ─── calculateSkillsMatch ─────────────────────────────────────────────────

describe('calculateSkillsMatch', () => {
  it('returns 100 when all profile skills are found', () => {
    expect(calculateSkillsMatch(['react', 'node.js'], ['react', 'node.js'])).toBe(100);
  });

  it('returns 50 when half the profile skills are found', () => {
    expect(calculateSkillsMatch(['react'], ['react', 'node.js'])).toBe(50);
  });

  it('returns 0 when no profile skills match', () => {
    expect(calculateSkillsMatch(['java', 'spring'], ['react', 'node.js'])).toBe(0);
  });

  it('returns 0 when profileSkills is empty', () => {
    expect(calculateSkillsMatch(['react'], [])).toBe(0);
  });

  it('returns 50 (neutral) when jobSkills is empty', () => {
    expect(calculateSkillsMatch([], ['react', 'node.js'])).toBe(50);
  });

  it('is case-insensitive', () => {
    expect(calculateSkillsMatch(['React', 'NODE.JS'], ['react', 'node.js'])).toBe(100);
  });
});

// ─── calculateCompensationFit ─────────────────────────────────────────────

describe('calculateCompensationFit', () => {
  const range = { min: 100000, max: 160000, currency: 'USD' };

  it('returns 100 when opportunity falls within range', () => {
    expect(calculateCompensationFit('$120k - $140k', range)).toBe(100);
  });

  it('returns lower score when opportunity is outside range', () => {
    const score = calculateCompensationFit('$200k - $250k', range);
    expect(score).toBeLessThan(50);
  });

  it('returns 50 when salary info is missing', () => {
    expect(calculateCompensationFit(undefined, range)).toBe(50);
  });

  it('returns 50 when range is missing', () => {
    expect(calculateCompensationFit('$120k', null)).toBe(50);
  });

  it('returns 40 on currency mismatch', () => {
    const eurRange = { min: 80000, max: 120000, currency: 'EUR' };
    expect(calculateCompensationFit('$120k', eurRange)).toBe(40);
  });

  it('handles K notation', () => {
    expect(calculateCompensationFit('80K - 120K', range)).toBeGreaterThan(0);
  });
});

// ─── isWorkTypeMatch ──────────────────────────────────────────────────────

describe('isWorkTypeMatch', () => {
  it('returns 100 for matching work type', () => {
    expect(isWorkTypeMatch('Remote', ['remote'])).toBe(100);
    expect(isWorkTypeMatch('Hybrid', ['hybrid', 'remote'])).toBe(100);
  });

  it('returns 0 for non-matching work type', () => {
    expect(isWorkTypeMatch('On-site', ['remote'])).toBe(0);
  });

  it('returns 50 when jobType is missing', () => {
    expect(isWorkTypeMatch(undefined, ['remote'])).toBe(50);
  });

  it('returns 50 when preferred array is empty', () => {
    expect(isWorkTypeMatch('Remote', [])).toBe(50);
  });

  it('handles various on-site spellings', () => {
    expect(isWorkTypeMatch('Onsite', ['on-site'])).toBe(100);
    expect(isWorkTypeMatch('Office-based', ['on-site'])).toBe(100);
  });
});

// ─── buildProfileFromHistory ──────────────────────────────────────────────

describe('buildProfileFromHistory', () => {
  it('builds profile from empty applications', () => {
    const profile = buildProfileFromHistory([]);
    expect(profile.targetRoles).toContain('Software Engineer');
    expect(profile.confidence).toBe('low');
    expect(profile.topSkills).toEqual([]);
  });

  it('infers target roles from successful applications', () => {
    const apps: JobApplication[] = [
      makeApp({
        id: '1',
        position: 'Frontend Developer',
        timeline: [makeEvent('technical_interview')],
      }),
      makeApp({
        id: '2',
        position: 'Backend Engineer',
        timeline: [makeEvent('offer')],
      }),
    ];
    const profile = buildProfileFromHistory(apps);
    expect(profile.targetRoles).toContain('Frontend Developer');
    expect(profile.targetRoles).toContain('Backend Engineer');
    expect(profile.confidence).toBe('medium');
  });

  it('infers seniority from titles', () => {
    const apps: JobApplication[] = [
      makeApp({ id: '1', position: 'Senior Developer', timeline: [makeEvent('technical_interview')] }),
      makeApp({ id: '2', position: 'Senior Developer', timeline: [makeEvent('offer')] }),
      makeApp({ id: '3', position: 'Junior Developer', timeline: [makeEvent('rejected')] }),
    ];
    const profile = buildProfileFromHistory(apps);
    expect(profile.seniority).toBe('senior');
  });

  it('sets high confidence with 5+ applications', () => {
    const apps: JobApplication[] = Array.from({ length: 5 }, (_, i) =>
      makeApp({
        id: String(i),
        position: 'Engineer',
        timeline: [makeEvent('technical_interview')],
      })
    );
    const profile = buildProfileFromHistory(apps);
    expect(profile.confidence).toBe('high');
  });

  it('includes success patterns for positive outcomes', () => {
    const apps: JobApplication[] = [
      makeApp({
        id: '1',
        position: 'Full Stack Developer',
        timeline: [makeEvent('technical_interview'), makeEvent('offer')],
      }),
    ];
    const profile = buildProfileFromHistory(apps);
    expect(profile.successPatterns.length).toBeGreaterThan(0);
    expect(profile.successPatterns[0]).toContain('1');
  });

  it('includes avoid patterns for rejected/withdrawn apps', () => {
    const apps: JobApplication[] = [
      makeApp({
        id: '1',
        position: 'DevOps Engineer',
        timeline: [makeEvent('rejected')],
      }),
    ];
    const profile = buildProfileFromHistory(apps);
    expect(profile.avoidPatterns.length).toBeGreaterThan(0);
  });

  it('applies explicit overrides', () => {
    const profile = buildProfileFromHistory([], {
      seniority: 'lead',
      topSkills: ['rust', 'go'],
    });
    expect(profile.seniority).toBe('lead');
    expect(profile.topSkills).toEqual(['rust', 'go']);
  });
});

// ─── calculateDeterministicScore ──────────────────────────────────────────

describe('calculateDeterministicScore', () => {
  it('returns a complete JobMatchResult structure', () => {
    const opp = makeOpp();
    const profile = makeProfile();
    const result = calculateDeterministicScore(opp, profile);

    expect(result.opportunityId).toBe(opp.id);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.subscores).toBeDefined();
    expect(result.strengths).toBeInstanceOf(Array);
    expect(result.gaps).toBeInstanceOf(Array);
    expect(result.verdict).toMatch(/excellent_fit|good_fit|partial_fit|low_fit/);
    expect(result.explanation).toBeTruthy();
    expect(result.computationMethod).toBe('deterministic');
  });

  it('gives high score for well-matched opportunity', () => {
    const opp = makeOpp({
      position: 'Software Engineer',
      description: 'Looking for JavaScript and React developers with Node.js experience. Remote position.',
      location: 'Remote',
      jobType: 'Remote',
      salary: '$120k - $150k',
    });
    const profile = makeProfile();
    const result = calculateDeterministicScore(opp, profile);
    expect(result.overallScore).toBeGreaterThan(50);
  });

  it('gives low score for poorly matched opportunity', () => {
    const opp = makeOpp({
      position: 'Marketing Manager',
      description: 'B2B marketing expert needed. On-site in New York.',
      location: 'New York',
      jobType: 'On-site',
      salary: '$60k - $80k',
    });
    const profile = makeProfile();
    const result = calculateDeterministicScore(opp, profile);
    expect(result.overallScore).toBeLessThan(50);
  });

  it('returns partial_fit or low_fit for neutral matches', () => {
    const opp = makeOpp({ position: 'Data Scientist', description: 'Python and ML' });
    const profile = makeProfile();
    const result = calculateDeterministicScore(opp, profile);
    expect(['partial_fit', 'low_fit']).toContain(result.verdict);
  });

  it('includes computationMethod and timestamp', () => {
    const result = calculateDeterministicScore(makeOpp(), makeProfile());
    expect(result.computationMethod).toBe('deterministic');
    expect(result.computedAt).toBeTruthy();
    expect(new Date(result.computedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });
});

// ─── batchCalculateScores ─────────────────────────────────────────────────

describe('batchCalculateScores', () => {
  it('scores multiple opportunities', () => {
    const opps: JobOpportunity[] = [
      makeOpp({ id: 'opp-1', position: 'Software Engineer' }),
      makeOpp({ id: 'opp-2', position: 'Marketing Manager' }),
      makeOpp({ id: 'opp-3', position: 'Backend Engineer' }),
    ];
    const profile = makeProfile();
    const results = batchCalculateScores(opps, profile);

    expect(Object.keys(results)).toHaveLength(3);
    expect(results['opp-1']).toBeDefined();
    expect(results['opp-2']).toBeDefined();
    expect(results['opp-3']).toBeDefined();
  });

  it('returns empty object for empty opportunities array', () => {
    const results = batchCalculateScores([], makeProfile());
    expect(results).toEqual({});
  });

  it('uses provided profileVersion', () => {
    const opps = [makeOpp()];
    const results = batchCalculateScores(opps, makeProfile(), 42);
    expect(results['opp-1'].profileVersion).toBe(42);
  });
});
