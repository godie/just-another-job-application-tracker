import { OPPORTUNITIES_STORAGE_KEY } from '../utils/constants';
import { generateId } from '../utils/id';
import { sanitizeObject } from '../utils/url';
import type { JobOpportunity } from '../types/opportunities';
import type { JobApplication } from '../types/applications';

export const getOpportunities = (): JobOpportunity[] => {
  try {
    const data = localStorage.getItem(OPPORTUNITIES_STORAGE_KEY);
    if (!data) return [];
    
    const rawOpportunities = JSON.parse(data);
    if (!Array.isArray(rawOpportunities)) return [];

    const opportunities = rawOpportunities.map(opp =>
      typeof opp === 'object' && opp !== null
        ? sanitizeObject(opp as Record<string, unknown>)
        : opp
    );
    
    return opportunities as JobOpportunity[];
  } catch (error) {
    console.error("Error loading opportunities from localStorage:", error);
    return [];
  }
};

export const saveOpportunities = (opportunities: JobOpportunity[]): void => {
  try {
    localStorage.setItem(OPPORTUNITIES_STORAGE_KEY, JSON.stringify(opportunities));
  } catch (error) {
    console.error("Error saving opportunities to localStorage:", error);
  }
};

function toWorkType(jobType?: string): JobApplication['workType'] | undefined {
  if (!jobType) return undefined;
  const normalized = jobType.toLowerCase().replace(/\s+/g, '-');
  if (normalized === 'remote') return 'remote';
  if (normalized === 'on-site' || normalized === 'onsite') return 'on-site';
  if (normalized === 'hybrid') return 'hybrid';
  return undefined;
}

export const convertOpportunityToApplication = (opportunity: JobOpportunity): JobApplication => {
  const now = new Date().toISOString().split('T')[0];

  const application: JobApplication = {
    id: generateId(),
    position: opportunity.position,
    company: opportunity.company,
    location: opportunity.location,
    workType: toWorkType(opportunity.jobType),
    salary: opportunity.salary || '',
    status: 'Applied',
    applicationDate: now,
    interviewDate: '',
    timeline: [
      {
        id: generateId(),
        type: 'application_submitted',
        date: now,
        status: 'completed',
      },
    ],
    notes: opportunity.description || '',
    link: opportunity.link,
    platform: 'LinkedIn',
    contactName: '',
    followUpDate: '',
  };

  if (opportunity.postedDate) {
    application.notes = application.notes
      ? `${application.notes}\n\nPosted: ${opportunity.postedDate}`
      : `Posted: ${opportunity.postedDate}`;
  }

  return application;
};

