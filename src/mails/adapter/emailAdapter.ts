import type { Email, ParsedEvent, Event } from '../types';
import type { JobApplication, InterviewEvent, InterviewStageType } from '../../types/applications';

/** Maps parsed event types to timeline stage types (e.g. next_steps -> first_contact). */
const toTimelineType = (type: Event['type']): InterviewStageType => {
  if (type === 'next_steps') return 'first_contact';
  return type as InterviewStageType | 'application_submitted';
};

export class EmailAdapter {
  /**
   * Returns an application payload for a new application from an application_submitted event.
   * Used when scanning finds a "thank you for applying" email and no matching app exists.
   */
  applicationFromEvent(event: Event): Omit<JobApplication, 'id'> {
    const date = event.date.split('T')[0] ?? event.date;
    const timelineEvent: InterviewEvent = {
      id: event.id,
      type: 'application_submitted',
      date,
      notes: event.notes ?? '',
      status: 'completed',
    };
    return {
      position: event.position ?? 'Unknown',
      company: event.company ?? 'Unknown',
      salary: '',
      status: 'Applied',
      applicationDate: date,
      interviewDate: '',
      timeline: [timelineEvent],
      notes: '',
      link: '',
      platform: 'Email',
      contactName: '',
      followUpDate: '',
    };
  }

  /** Builds the timeline event that would be added for this email event (for preview). */
  eventToInterviewEvent(event: Event): InterviewEvent {
    return {
      id: event.id,
      type: toTimelineType(event.type),
      date: event.date,
      notes: event.notes ?? '',
      status: 'completed',
    };
  }

  /**
   * Applies a parsed event to the matching application and returns a new applications array (immutable).
   * If no application matches, returns the same array unchanged.
   */
  applyEventToApplication(
    event: Event,
    applications: JobApplication[]
  ): JobApplication[] {
    const company = event.company?.toLowerCase();
    const idx = applications.findIndex((a) =>
      (a.company ?? '').toLowerCase().includes(company ?? '')
    );
    if (idx === -1) return applications;

    const app = applications[idx];
    const newEvent: InterviewEvent = {
      id: event.id,
      type: toTimelineType(event.type),
      date: event.date,
      notes: event.notes ?? '',
      status: 'completed',
    };
    const updated: JobApplication = {
      ...app,
      timeline: [...app.timeline, newEvent],
    };
    return applications.map((a, i) => (i === idx ? updated : a));
  }

  classify(email: Email): ParsedEvent | null {
    const s = email.subject.toLowerCase();
    const b = email.body.toLowerCase();

    // Application submitted
    if (s.includes('applied') || s.includes('applying') || 
        b.includes('thank you for applying') || b.includes('thanks for applying') ||
        s.includes('application received') || s.includes('application confirmation')) {
      return { 
        id: crypto.randomUUID(), 
        type: 'application_submitted', 
        date: email.date, 
        company: this.extractCompany(email), 
        position: this.extractPosition(email), 
        notes: email.subject 
      };
    }
    
    // Rejected
    if (s.includes('regret') || s.includes('unfortunately') || 
        s.includes('not moving forward') || s.includes('rejected') ||
        b.includes('regret to inform') || b.includes('decided to move forward with other candidates') ||
        b.includes('will not be moving forward')) {
      return { 
        id: crypto.randomUUID(), 
        type: 'rejected', 
        date: email.date, 
        company: this.extractCompany(email),
        position: this.extractPosition(email), // Agregado para saber qué posición fue rechazada
        notes: email.subject 
      };
    }
    
    // Next steps / Interview
    if (s.includes('interview') || s.includes('next steps') || s.includes('schedule') ||
        s.includes('invitation') || s.includes('meet with') ||
        b.includes('would like to schedule') || b.includes('next step') ||
        b.includes('move forward with your application')) {
      return { 
        id: crypto.randomUUID(), 
        type: 'next_steps', 
        date: email.date, 
        company: this.extractCompany(email),
        position: this.extractPosition(email), // Agregado
        notes: email.subject 
      };
    }
    
    // Offer
    if (s.includes('offer') || s.includes('congratulations') ||
        b.includes('we are pleased to offer') || b.includes('job offer') ||
        b.includes('offer of employment') || b.includes('excited to extend an offer')) {
      return { 
        id: crypto.randomUUID(), 
        type: 'offer', 
        date: email.date, 
        company: this.extractCompany(email),
        position: this.extractPosition(email), // Agregado
        notes: email.subject 
      };
    }
    
    return null;
  }

  private extractCompany(email: Email): string | undefined {
    const subject = email.subject.toLowerCase();
    const body = email.body.toLowerCase();
    const from = email.from.toLowerCase();
    // 1. Buscar en subject: "applying to [Company]" o "at [Company]"
    let match = subject.match(/(?:applying to|thanks? for applying to)\s+([^|,-]+?)(?:\s*\||$)/i);
    if (match) return match[1].trim();
    
    match = subject.match(/\bat\s+([^|,-]+?)(?:\s*\||$)/i);
    if (match) return match[1].trim();
    
    // 2. Buscar en body: "joining [Company]" o "at [Company]"
    match = body.match(/(?:joining|interest in)\s+([A-Z][a-zA-Z0-9\s&]+?)(?:\s+and|\.|,)/);
    if (match) return match[1].trim();
    
    // 3. Buscar nombre real en "From" (antes del <)
    match = from.match(/^([^<]+?)\s*(?:Hiring|Recruiting|Team)?(?:\s*<|$)/);
    if (match) {
      const name = match[1].trim();
      // Filtrar plataformas comunes
      if (!['Workable', 'no-reply'].some(p => name.includes(p))) {
        return name;
      }
    }
    
    // 4. Fallback: dominio (excluyendo plataformas conocidas)
    const platformDomains = ['greenhouse', 'ashbyhq', 'workday', 'teamtailor', 'workable', 'lever'];
    const domainMatch = from.match(/@([a-z0-9.-]+)\./i);
    const domain = domainMatch?.[1];
    
    if (domain && !platformDomains.some(p => domain.includes(p))) {
      return domain;
    }
    
    return undefined;
  }

  private extractPosition(email: Email): string | undefined {
    // 1. Buscar en subject después de "for" o "|"
    let match = email.subject.match(/(?:for the|for)\s+([^|,]+?)(?:\s+position|\s+role|,|\||$)/i);
    if (match) return match[1].trim();
    
    match = email.subject.match(/\|\s*([^|]+?)(?:,|$)/);
    if (match) return match[1].trim();
    
    // 2. Buscar en body: "for the X position/role"
    match = email.body.match(/(?:for the|application for)\s+([^.!]+?)\s+(?:position|role|job)/i);
    if (match) return match[1].trim();
    
    // 3. Fallback: después de "for" en subject (comportamiento original)
    match = email.subject.match(/for\s+(.+)/i);
    if (match) return match[1].trim();
    
    return undefined;
  }
}
