// src/storage/opportunities.ts
import { OPPORTUNITIES_STORAGE_KEY } from '../utils/constants';
import { generateId } from '../utils/id';
import { sanitizeObject } from '../utils/url';
import type { JobOpportunity } from '../types/opportunities';
import type { JobApplication } from '../types/applications';

/**
 * Obtiene las oportunidades guardadas o un array vacío si no hay datos.
 */
export const getOpportunities = (): JobOpportunity[] => {
  try {
    const data = localStorage.getItem(OPPORTUNITIES_STORAGE_KEY);
    if (!data) return [];
    
    const opportunities = JSON.parse(data);
    if (!Array.isArray(opportunities)) return [];
    
    // ⚡ Bolt: Sanitize data on load to ensure safety before it reaches the UI.
    return opportunities.map((opp) =>
      sanitizeObject(opp as unknown as Record<string, unknown>) as unknown as JobOpportunity
    );
  } catch (error) {
    console.error("Error loading opportunities from localStorage:", error);
    return [];
  }
};

/**
 * Guarda el array de oportunidades en localStorage.
 */
export const saveOpportunities = (opportunities: JobOpportunity[]): void => {
  try {
    localStorage.setItem(OPPORTUNITIES_STORAGE_KEY, JSON.stringify(opportunities));
  } catch (error) {
    console.error("Error saving opportunities to localStorage:", error);
  }
};

/**
 * Agrega una nueva oportunidad a la lista.
 */
export const addOpportunity = (opportunity: Omit<JobOpportunity, 'id' | 'capturedDate'>): JobOpportunity => {
  const newOpportunity: JobOpportunity = {
    ...opportunity,
    id: generateId(),
    capturedDate: new Date().toISOString(),
  };
  
  const opportunities = getOpportunities();
  opportunities.push(newOpportunity);
  saveOpportunities(opportunities);
  
  return newOpportunity;
};

/**
 * Elimina una oportunidad por ID.
 */
export const deleteOpportunity = (id: string): void => {
  const opportunities = getOpportunities();
  const filtered = opportunities.filter(opp => opp.id !== id);
  saveOpportunities(filtered);
};

/** Map opportunity jobType (e.g. "Remote", "Hybrid") to JobApplication workType */
function toWorkType(jobType?: string): JobApplication['workType'] | undefined {
  if (!jobType) return undefined;
  const normalized = jobType.toLowerCase().replace(/\s+/g, '-');
  if (normalized === 'remote') return 'remote';
  if (normalized === 'on-site' || normalized === 'onsite') return 'on-site';
  if (normalized === 'hybrid') return 'hybrid';
  return undefined;
}

/**
 * Convierte una oportunidad en una aplicación de trabajo.
 * Crea un JobApplication con status "Applied" y fecha actual.
 */
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

