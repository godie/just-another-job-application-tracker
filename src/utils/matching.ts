
import type { JobApplication, InterviewStageType } from '../types/applications';
import type { JobOpportunity } from '../types/opportunities';
import type {
  UserMatchProfile,
  JobMatchResult,
  JobMatchSubscores,
  MatchConfidence,
  MatchVerdict,
  SeniorityLevel,
} from '../types/matching';

const POSITIVE_SIGNALS = new Set<InterviewStageType>([
  'technical_interview',
  'code_challenge',
  'live_coding',
  'hiring_manager',
  'system_design',
  'cultural_fit',
  'final_round',
  'offer',
]);

const NEGATIVE_SIGNALS = new Set<InterviewStageType>(['rejected', 'withdrawn']);

const SENIORITY_KEYWORDS: Record<string, SeniorityLevel> = {
  intern: 'intern',
  internship: 'intern',
  junior: 'junior',
  jr: 'junior',
  'entry level': 'junior',
  'entry-level': 'junior',
  mid: 'mid',
  'mid-level': 'mid',
  'mid level': 'mid',
  intermediate: 'mid',
  senior: 'senior',
  sr: 'senior',
  staff: 'staff',
  lead: 'lead',
  principal: 'principal',
  executive: 'executive',
  vp: 'executive',
  director: 'executive',
  cto: 'executive',
  ceo: 'executive',
};

const COMMON_TECH_SKILLS = [
  'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c++', 'c#',
  'react', 'angular', 'vue', 'svelte', 'next.js', 'nuxt', 'gatsby',
  'node.js', 'nodejs', 'express', 'nestjs', 'django', 'flask', 'fastapi',
  'ruby on rails', 'rails', 'spring', 'laravel', 'symfony',
  'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'dynamodb', 'sqlite',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins',
  'graphql', 'rest', 'grpc', 'soap',
  'html', 'css', 'sass', 'scss', 'tailwind', 'bootstrap', 'material-ui',
  'git', 'github', 'gitlab', 'bitbucket',
  'linux', 'unix', 'bash', 'powershell',
  'machine learning', 'ml', 'ai', 'deep learning', 'tensorflow', 'pytorch',
  'data science', 'pandas', 'numpy', 'scipy', 'matplotlib',
  'react native', 'flutter', 'swift', 'kotlin', 'objective-c',
  'android', 'ios', 'mobile',
  'agile', 'scrum', 'kanban', 'jira', 'confluence',
  'ci/cd', 'devops', 'sre', 'observability', 'monitoring',
  'microservices', 'serverless', 'lambda', 'event-driven',
  'testing', 'jest', 'mocha', 'cypress', 'playwright', 'selenium', 'unit testing', 'integration testing',
  'security', 'oauth', 'jwt', 'authentication', 'authorization',
  'performance', 'optimization', 'caching', 'cdn',
];


export function extractSeniorityFromTitle(title: string): SeniorityLevel | null {
  const lowerTitle = title.toLowerCase();
  for (const [keyword, level] of Object.entries(SENIORITY_KEYWORDS)) {
    // react-doctor-disable-next-line js-set-map-lookups -- String.prototype.includes; SENIORITY_KEYWORDS is a plain object literal (Record), not an array/Set.
    if (lowerTitle.includes(keyword)) return level;
  }
  return null;
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function calculateRoleSimilarity(title: string, targetRoles: string[]): number {
  if (!title || targetRoles.length === 0) return 0;
  const normalizedTitle = normalizeTitle(title);
  const titleWords = normalizedTitle.split(' ');

  let bestScore = 0;
  for (const role of targetRoles) {
    const normalizedRole = normalizeTitle(role);
    const roleWords = normalizedRole.split(' ');

    // react-doctor-disable-next-line js-set-map-lookups -- String.prototype.includes on normalized titles.
    if (normalizedTitle.includes(normalizedRole) || normalizedRole.includes(normalizedTitle)) {
      bestScore = Math.max(bestScore, 100);
      continue;
    }

    const roleWordsSet = new Set(roleWords);
    const commonWords = titleWords.filter((w) => roleWordsSet.has(w));
    const overlapScore = (commonWords.length / Math.max(titleWords.length, roleWords.length)) * 100;
    bestScore = Math.max(bestScore, overlapScore);
  }

  return Math.min(100, Math.round(bestScore));
}

const SKILL_REGEXES = COMMON_TECH_SKILLS.map(
  (skill) => new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
);

export function extractSkillsFromDescription(description: string | undefined): string[] {
  if (!description) return [];
  const lowerDesc = description.toLowerCase();
  const found: string[] = [];
  for (let i = 0; i < COMMON_TECH_SKILLS.length; i++) {
    if (SKILL_REGEXES[i].test(lowerDesc)) {
      found.push(COMMON_TECH_SKILLS[i]);
    }
  }
  return [...new Set(found)];
}

export function calculateSkillsMatch(
  jobSkills: string[],
  profileSkills: string[]
): number {
  if (profileSkills.length === 0) return 0;
  if (jobSkills.length === 0) return 50; // neutral if no data

  const profileSet = new Set(profileSkills.map((s) => s.toLowerCase()));
  const matches = jobSkills.filter((s) => profileSet.has(s.toLowerCase()));
  return Math.min(100, Math.round((matches.length / profileSet.size) * 100));
}

function parseSalaryRange(salaryStr: string | undefined): { min: number; max: number; currency: string } | null {
  if (!salaryStr) return null;
  const text = salaryStr.toLowerCase();

  let currency = 'USD';
  if (text.includes('€') || text.includes('eur') || text.includes('euro')) currency = 'EUR';
  if (text.includes('£') || text.includes('gbp')) currency = 'GBP';

  const numbers = text.match(/\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+/g);
  if (!numbers || numbers.length === 0) return null;

  const values = numbers.reduce<number[]>((acc, n) => { const v = parseInt(n.replace(/,/g, ''), 10); if (!isNaN(v)) acc.push(v); return acc; }, []);
  if (values.length === 0) return null;

  const kMultiplied = values.map((v) => (v < 1000 && text.includes('k') ? v * 1000 : v));

  return {
    min: Math.min(...kMultiplied),
    max: Math.max(...kMultiplied),
    currency,
  };
}

export function calculateCompensationFit(
  oppSalary: string | undefined,
  range: UserMatchProfile['salaryRange']
): number {
  if (!range || !oppSalary) return 50; // neutral

  const parsed = parseSalaryRange(oppSalary);
  if (!parsed) return 50;

  if (range.currency !== parsed.currency) return 40; // currency mismatch

  const profileMin = range.min ?? 0;
  const profileMax = range.max ?? Number.MAX_SAFE_INTEGER;

  if (parsed.min >= profileMin && parsed.max <= profileMax) return 100;

  const overlapMin = Math.max(parsed.min, profileMin);
  const overlapMax = Math.min(parsed.max, profileMax);
  if (overlapMax >= overlapMin) {
    const overlapAmount = overlapMax - overlapMin;
    const totalRange = Math.max(parsed.max, profileMax) - Math.min(parsed.min, profileMin);
    return Math.round((overlapAmount / totalRange) * 100);
  }

  const distance = parsed.max < profileMin
    ? profileMin - parsed.max // opp is below profile
    : parsed.min - profileMax; // opp is above profile

  const maxGap = Math.max(profileMax, parsed.max) - Math.min(profileMin, parsed.min);
  const penalty = Math.min(100, Math.round((distance / maxGap) * 100));
  return Math.max(0, 50 - penalty);
}

export function isWorkTypeMatch(
  jobType: string | undefined,
  preferred: ('remote' | 'on-site' | 'hybrid')[]
): number {
  if (!jobType || preferred.length === 0) return 50;
  const lower = jobType.toLowerCase();
  const mapped = lower.includes('remote')
    ? 'remote'
    : lower.includes('hybrid')
      ? 'hybrid'
      : lower.includes('on-site') || lower.includes('onsite') || lower.includes('office')
        ? 'on-site'
        : null;
  if (!mapped) return 50;
  const preferredSet = new Set(preferred);
  return preferredSet.has(mapped) ? 100 : 0;
}

function calculateLocationMatch(
  oppLocation: string | undefined,
  preferredLocations: string[]
): number {
  if (!oppLocation || preferredLocations.length === 0) return 50;
  const lowerOpp = oppLocation.toLowerCase();
  for (const loc of preferredLocations) {
    const lowerLoc = loc.toLowerCase();
    // react-doctor-disable-next-line js-set-map-lookups -- String.prototype.includes on lowercased locations.
    if (lowerOpp.includes(lowerLoc) || lowerLoc.includes(lowerOpp)) return 100;
    // react-doctor-disable-next-line js-set-map-lookups -- String.prototype.includes on lowercased locations.
    if (lowerLoc === 'remote' && lowerOpp.includes('remote')) return 100;
  }
  return 0;
}

function determineConfidence(
  profile: UserMatchProfile,
  opportunity: JobOpportunity
): MatchConfidence {
  let score = 0;
  if (profile.targetRoles.length > 0) score++;
  if (profile.topSkills.length > 0) score++;
  if (profile.seniority) score++;
  if (opportunity.description && opportunity.description.length > 50) score++;
  if (opportunity.location) score++;
  if (opportunity.salary) score++;

  if (score >= 5) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

function determineVerdict(overallScore: number): MatchVerdict {
  if (overallScore >= 85) return 'excellent_fit';
  if (overallScore >= 65) return 'good_fit';
  if (overallScore >= 40) return 'partial_fit';
  return 'low_fit';
}

function generateExplanation(subscores: JobMatchSubscores, verdict: MatchVerdict): string {
  const parts: string[] = [];
  if (subscores.skillsFit >= 70) parts.push('strong skills alignment');
  if (subscores.skillsFit < 30) parts.push('significant skills gap');
  if (subscores.locationWorkTypeFit >= 80) parts.push('ideal location and work arrangement');
  if (subscores.locationWorkTypeFit < 30) parts.push('location or work type mismatch');
  if (subscores.seniorityFit >= 80) parts.push('appropriate seniority level');
  if (subscores.seniorityFit < 30) parts.push('seniority level mismatch');
  if (subscores.compensationFit >= 80) parts.push('compensation within your range');
  if (subscores.compensationFit < 30) parts.push('compensation outside your expectations');

  const verdictText = {
    excellent_fit: 'This is an excellent match',
    good_fit: 'This is a good match',
    partial_fit: 'This is a partial match',
    low_fit: 'This is a low match',
  }[verdict];

  if (parts.length > 0) {
    return `${verdictText} with ${parts.join(', ')}.`;
  }
  return `${verdictText} based on available data.`;
}

function generateStrengths(subscores: JobMatchSubscores): string[] {
  const strengths: string[] = [];
  if (subscores.skillsFit >= 70) strengths.push(`Strong skills match (${subscores.skillsFit}%)`);
  if (subscores.semanticFit >= 70) strengths.push(`Role aligns well with your experience (${subscores.semanticFit}%)`);
  if (subscores.locationWorkTypeFit >= 80) strengths.push('Location and work type match your preferences');
  if (subscores.seniorityFit >= 80) strengths.push('Seniority level matches your profile');
  if (subscores.compensationFit >= 80) strengths.push('Compensation within your expected range');
  if (subscores.historicalFit >= 70) strengths.push('Similar to roles you have succeeded with');
  return strengths.length > 0 ? strengths : ['Some alignment detected'];
}

function generateGaps(subscores: JobMatchSubscores): string[] {
  const gaps: string[] = [];
  if (subscores.skillsFit < 40) gaps.push(`Skills gap detected (${subscores.skillsFit}% match)`);
  if (subscores.semanticFit < 40) gaps.push('Role differs significantly from your experience');
  if (subscores.locationWorkTypeFit < 40) gaps.push('Location or work type may not suit you');
  if (subscores.seniorityFit < 40) gaps.push('Seniority level may not align with your profile');
  if (subscores.compensationFit < 40) gaps.push('Compensation may not meet your expectations');
  return gaps.length > 0 ? gaps : ['Limited data available to identify gaps'];
}


export function buildProfileFromHistory(
  applications: JobApplication[],
  explicitOverrides?: Partial<UserMatchProfile>
): UserMatchProfile {
  const positiveApps = applications.filter((app) =>
    app.timeline.some((event) => POSITIVE_SIGNALS.has(event.type))
  );

  const negativeApps = applications.filter((app) =>
    app.timeline.some((event) => NEGATIVE_SIGNALS.has(event.type)) &&
    !app.timeline.some((event) => POSITIVE_SIGNALS.has(event.type))
  );

  const targetRoles = [
    ...new Set(positiveApps.map((app) => app.position)),
  ];

  const seniorityCounts = new Map<SeniorityLevel, number>();
  for (const app of applications) {
    const level = extractSeniorityFromTitle(app.position);
    if (level) {
      seniorityCounts.set(level, (seniorityCounts.get(level) || 0) + 1);
    }
  }
  let inferredSeniority: SeniorityLevel | null = null;
  let maxCount = 0;
  for (const [level, count] of seniorityCounts) {
    if (count > maxCount) {
      maxCount = count;
      inferredSeniority = level;
    }
  }

  const allText = applications
    .flatMap((app) => [app.notes, app.position, app.company].flatMap(v => v ? [v] : []))
    .join(' ');
  const topSkills = extractSkillsFromDescription(allText);

  const preferredLocations = [...new Set(applications.reduce<string[]>((acc, app) => { if (app.location) acc.push(app.location); return acc; }, []))];
  const preferredWorkTypes = [
    ...new Set(applications.reduce<('remote' | 'on-site' | 'hybrid')[]>((acc, app) => { if (app.workType) acc.push(app.workType); return acc; }, [])),
  ];

  const successPatterns = positiveApps.length > 0
    ? [
        `Successfully progressed to interviews for ${positiveApps.length} role(s)`,
        `Common role types: ${[...new Set(positiveApps.map((a) => a.position))].slice(0, 3).join(', ')}`,
      ]
    : ['Limited interview data available'];

  const avoidPatterns = negativeApps.length > 0
    ? [
        `${negativeApps.length} application(s) resulted in rejection/withdrawal`,
      ]
    : [];

  const profile: UserMatchProfile = {
    targetRoles: targetRoles.length > 0 ? targetRoles : ['Software Engineer'],
    seniority: inferredSeniority,
    topSkills: topSkills.length > 0 ? topSkills : [],
    preferredWorkTypes: preferredWorkTypes.length > 0 ? preferredWorkTypes : ['remote', 'hybrid'],
    preferredLocations: preferredLocations.length > 0 ? preferredLocations : ['Remote'],
    salaryRange: null,
    preferredIndustries: [],
    profileSummary: `Profile based on ${applications.length} application(s). ${positiveApps.length} reached interview stages.`,
    successPatterns,
    avoidPatterns,
    profileVersion: 1,
    confidence: applications.length >= 5 ? 'high' : applications.length >= 2 ? 'medium' : 'low',
    lastComputed: new Date().toISOString(),
    ...explicitOverrides,
  };

  return profile;
}

export function calculateDeterministicScore(
  opportunity: JobOpportunity,
  profile: UserMatchProfile,
  profileVersion = 1
): JobMatchResult {
  const roleScore = calculateRoleSimilarity(opportunity.position, profile.targetRoles);

  const oppSkills = extractSkillsFromDescription(opportunity.description);
  const skillsScore = calculateSkillsMatch(oppSkills, profile.topSkills);

  const locationScore = calculateLocationMatch(opportunity.location, profile.preferredLocations);
  const workTypeScore = isWorkTypeMatch(opportunity.jobType, profile.preferredWorkTypes);
  const locationWorkTypeScore = Math.round((locationScore + workTypeScore) / 2);

  const compensationScore = calculateCompensationFit(opportunity.salary, profile.salaryRange);

  const oppSeniority = extractSeniorityFromTitle(opportunity.position);
  const seniorityScore = profile.seniority && oppSeniority
    ? profile.seniority === oppSeniority ? 100 : 30
    : 50; // neutral if unknown

  const historicalScore = roleScore; // simplified — if role matches past targets, it's "historically good"

  const semanticScore = Math.round((roleScore + skillsScore) / 2);

  const subscores: JobMatchSubscores = {
    semanticFit: semanticScore,
    historicalFit: historicalScore,
    skillsFit: skillsScore,
    locationWorkTypeFit: locationWorkTypeScore,
    compensationFit: compensationScore,
    seniorityFit: seniorityScore,
  };

  const overallScore = Math.round(
    subscores.semanticFit * 0.30 +
    subscores.historicalFit * 0.20 +
    subscores.skillsFit * 0.25 +
    subscores.locationWorkTypeFit * 0.15 +
    subscores.compensationFit * 0.05 +
    subscores.seniorityFit * 0.05
  );

  const verdict = determineVerdict(overallScore);
  const confidence = determineConfidence(profile, opportunity);

  return {
    opportunityId: opportunity.id,
    overallScore: Math.min(100, Math.max(0, overallScore)),
    confidence,
    subscores,
    strengths: generateStrengths(subscores),
    gaps: generateGaps(subscores),
    verdict,
    explanation: generateExplanation(subscores, verdict),
    profileVersion,
    computedAt: new Date().toISOString(),
    computationMethod: 'deterministic',
  };
}

export function batchCalculateScores(
  opportunities: JobOpportunity[],
  profile: UserMatchProfile,
  profileVersion = 1
): Record<string, JobMatchResult> {
  const results: Record<string, JobMatchResult> = {};
  for (const opp of opportunities) {
    results[opp.id] = calculateDeterministicScore(opp, profile, profileVersion);
  }
  return results;
}
