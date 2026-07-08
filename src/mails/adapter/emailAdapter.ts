import type { Email, ParsedEvent, Event } from '../types';
import type { JobApplication, InterviewEvent, InterviewStageType } from '../../types/applications';

const toTimelineType = (type: Event['type']): InterviewStageType => {
  if (type === 'next_steps') return 'first_contact';
  return type as InterviewStageType | 'application_submitted';
};

const NON_COMPANY_PREFIXES = [
  'application update', 'application received', 'application confirmation',
  'status update', 'thank you for', 'thanks for', 'update on',
  'regarding your', 'your application', 'job application',
] as const;

const JOB_TITLE_ENDS = /(?:Engineer|Developer|Manager|Designer|Analyst|Consultant|Specialist|Lead|Principal|Staff|Director|Architect|Intern)$/i;

const EXCLUDED_NAMES = new Set([
  'workable', 'no-reply', 'noreply', 'donotreply', 'notifications',
  'hiring team', 'recruiting team', 'talent team',
  'recruiting', 'hiring', 'talent', 'team', 'careers', 'jobs',
]);

const EXCLUDED_DOMAIN_PATTERN = /greenhouse|ashbyhq|workday|teamtailor|workable|lever|applytojob|postmark|amazonses|notifications|send/;

export class EmailAdapter {
  applicationFromEvent(event: Event, email?: Email): Omit<JobApplication, 'id'> {
    const date = event.date.split('T')[0] ?? event.date;
    const timelineEvent: InterviewEvent = {
      id: event.id,
      type: event.type === 'offer' ? 'offer' : 'application_submitted',
      date,
      notes: event.notes ?? '',
      status: 'completed',
    };
    const salary = event.salary ?? (event.type === 'offer' && email ? this.extractSalary(email) : '') ?? '';
    const status = event.type === 'offer' ? 'Offer' : 'Applied';
    return {
      position: event.position ?? 'Unknown',
      company: event.company ?? 'Unknown',
      salary,
      status,
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

  eventToInterviewEvent(event: Event): InterviewEvent {
    return {
      id: event.id,
      type: toTimelineType(event.type),
      date: event.date,
      notes: event.notes ?? '',
      status: 'completed',
    };
  }

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

    if (s.includes('regret') || s.includes('unfortunately') ||
        s.includes('not moving forward') || s.includes('rejected') ||
        // Spanish rejection subject keywords
        s.includes('lamentamos') || s.includes('regretamos') ||
        b.includes('regret to inform') || b.includes('decided to move forward with other candidates') ||
        b.includes('moving forward with other candidates') ||
        b.includes('will not be moving forward') || b.includes('we have chosen another candidate') ||
        b.includes('position has been filled') || b.includes('your application was not successful') ||
        b.includes('another applicant was selected') || b.includes('proceed with other candidates') ||
        b.includes('we have filled this position') || b.includes('filled this role') ||
        b.includes('qualifications align') || b.includes('if a position opens') ||
        b.includes('we wish you all the best') ||
        // Spanish rejection body keywords
        b.includes('no hemos seleccionado tu perfil') ||
        b.includes('no procederemos con tu candidatura') ||
        b.includes('no has sido seleccionado') ||
        b.includes('hemos decidido continuar con otros candidatos') ||
        b.includes('no pasará a la siguiente fase') ||
        b.includes('otro candidato ha sido seleccionado') ||
        b.includes('hemos cubierto la vacante') ||
        b.includes('lamentamos informar') ||
        b.includes('no hemos avanzado con tu candidatura')) {
      return {
        id: crypto.randomUUID(),
        type: 'rejected',
        date: email.date,
        company: this.extractCompany(email),
        position: this.extractPosition(email),
        notes: email.subject
      };
    }

    if (s.includes('applied') || s.includes('applying') ||
        b.includes('thank you for applying') || b.includes('thanks for applying') ||
        s.includes('application received') || s.includes('application confirmation') ||
        b.includes('we have received your application') || b.includes('we received your application') ||
        b.includes('your candidacy has been received') ||
        b.includes('we received your candidacy') || b.includes('application for the role') ||
        b.includes('your job application') || b.includes('candidature received') ||
        (b.includes('application status') && b.includes('received')) ||
        // Spanish application submitted keywords
        s.includes('confirmación de solicitud') || s.includes('solicitud recibida') ||
        s.includes('postulación recibida') ||
        b.includes('hemos recibido tu candidatura') || b.includes('hemos recibido tu solicitud') ||
        b.includes('hemos recibido tu postulación') ||
        b.includes('tu candidatura ha sido recibida') ||
        b.includes('recibimos tu candidatura') || b.includes('confirmamos tu solicitud') ||
        // Note: "gracias por aplicar" also appears in rejection emails; safe here because
        // rejected is checked first — do NOT reorder classification checks
        b.includes('gracias por tu postulación') || b.includes('gracias por aplicar') ||
        b.includes('tu solicitud ha sido enviada') || b.includes('postulación recibida')) {
      return {
        id: crypto.randomUUID(),
        type: 'application_submitted',
        date: email.date,
        company: this.extractCompany(email),
        position: this.extractPosition(email),
        notes: email.subject
      };
    }

    if (s.includes('interview') || s.includes('next steps') || s.includes('schedule') ||
        s.includes('invitation') || s.includes('meet with') ||
        b.includes('would like to schedule') || b.includes('next step') ||
        b.includes('move forward with your application') || b.includes("we'd like to get to know you") ||
        b.includes('we would like to schedule') || b.includes('technical assessment') ||
        b.includes('hiring manager review') || b.includes('panel interview') ||
        b.includes('video interview') || b.includes('phone screen') ||
        b.includes('interview with the team') || b.includes('book a time') ||
        b.includes('calendly') ||
        // Spanish interview/next steps keywords
        s.includes('entrevista') || s.includes('próximos pasos') ||
        b.includes('te invitamos a entrevista') ||
        b.includes('próximos pasos') || b.includes('siguiente fase') ||
        b.includes('entrevista telefónica') || b.includes('entrevista por video') ||
        b.includes('entrevista presencial') || b.includes('entrevista con el equipo') ||
        // Note: "evaluación" is broad (means evaluation); could match non-interview emails
        b.includes('prueba técnica') || b.includes('evaluación')) {
      return {
        id: crypto.randomUUID(),
        type: 'next_steps',
        date: email.date,
        company: this.extractCompany(email),
        position: this.extractPosition(email),
        notes: email.subject
      };
    }

    if (s.includes('offer') || s.includes('congratulations') ||
        b.includes('we are pleased to offer') || b.includes('job offer') ||
        b.includes('offer of employment') || b.includes('excited to extend an offer') ||
        // Spanish offer keywords
        s.includes('oferta de empleo') || s.includes('oferta laboral') ||
        s.includes('felicitaciones') ||
        b.includes('oferta de empleo') || b.includes('oferta laboral') ||
        b.includes('tenemos el gusto de ofrecerte') ||
        b.includes('nos complace ofrecerte')) {
      return {
        id: crypto.randomUUID(),
        type: 'offer',
        date: email.date,
        company: this.extractCompany(email),
        position: this.extractPosition(email),
        salary: this.extractSalary(email),
        notes: email.subject
      };
    }

    return null;
  }

  private extractCompany(email: Email): string | undefined {
    const subject = email.subject;
    const body = email.body;
    const from = email.from;
    const fromLower = from.toLowerCase();

    let match = subject.match(/^([A-Z][A-Za-z0-9 &'/.]+?)\s*[-–—|]\s/);
    if (match && match[1].length > 1) {
      const candidate = match[1].trim();
      const candidateLower = candidate.toLowerCase();
      const isNonCompanyPrefix = NON_COMPANY_PREFIXES.some(p => candidateLower === p || candidateLower.startsWith(p + ' '));
      const isJobTitle = JOB_TITLE_ENDS.test(candidate.trim());
      if (!isNonCompanyPrefix && !isJobTitle) {
        return this.cleanCompanyName(match[1]);
      }
    }

    match = body.match(/(?:applying (?:to|for)|applied to)\s+the?\s+([A-Z][A-Za-z0-9 &'/]+?)(?:\s+(?:role|position|at|team|company|for|and|in|of)|\s*[,.]|\s*$)/i);
    if (match && !JOB_TITLE_ENDS.test(match[1].trim())) return this.cleanCompanyName(match[1]);
    match = body.match(/interest in\s+(?:joining|working at)\s+(?!our\b|their\b|my\b|the\b)([A-Z][A-Za-z0-9 &'/]+?)(?:\s+(?:role|position|at|team|company|for|and|in|of)|\s*[,.]|\s*$)/i);
    if (match && !JOB_TITLE_ENDS.test(match[1].trim())) return this.cleanCompanyName(match[1]);

    match = body.match(/(?:thank you for applying|thanks for applying)\s+to\s+(?:the\s+)?([A-Z][A-Za-z0-9 &'/]+?)(?:\s+(?:for|and|in|of|at|role|position)|\s*[,.]|\s*$)/i);
    if (match && !JOB_TITLE_ENDS.test(match[1].trim())) return this.cleanCompanyName(match[1]);

    match = body.match(/(?:welcome to(?: the)?|joining)\s+(?!our\b|their\b|my\b|the\b)([A-Z][A-Za-z0-9 &'/.]+?)(?:\s+team|\s*[,.!]|\s*$)/i);
    if (match) return this.cleanCompanyName(match[1]);

    match = body.match(/(?:role|position|job|opportunity|career)\s+at\s+([A-Z][A-Za-z0-9 &'/.]+?)(?:\s*[,.]|\s*$)/i);
    if (match) return this.cleanCompanyName(match[1]);
    match = body.match(/(?:Engineer|Developer|Manager|Designer|Analyst|Consultant|Specialist|Lead|Principal|Staff)\s+at\s+([A-Z][A-Za-z0-9 &'/.]+?)(?:\s*[,.]|\s*$)/i);
    if (match) return this.cleanCompanyName(match[1]);

    match = from.match(/^([A-Z][A-Za-z0-9 &']+?)\s*(?:via|for)\s+(?:greenhouse|ashbyhq|workday|teamtailor|workable|lever|jobvite|smartrecruiters|applytojob|postmark)/i);
    if (match) return this.cleanCompanyName(match[1]);

    match = from.match(/^([A-Z][A-Za-z0-9 &']+?)(?:\s+(?:Recruiting|Hiring|Team|Talent)?(?:\s+Team)?)?\s*</);
    if (match) {
      const name = match[1].trim();
      if (!EXCLUDED_NAMES.has(name.toLowerCase())) {
        return this.cleanCompanyName(name);
      }
    }

    match = fromLower.match(/@([a-z0-9-]+)\.(com|org|io|co|net|ca|ai|ai\.com)/);
    if (match) {
      const domain = match[1];
      if (!EXCLUDED_DOMAIN_PATTERN.test(domain)) {
        return this.cleanCompanyName(domain);
      }
    }

    match = body.match(/^([A-Z][A-Za-z0-9]+)(?:\s+(?:IT\s+)?Recruitment)?\s*$/m);
    if (match) return this.cleanCompanyName(match[1]);

    return undefined;
  }

  private cleanCompanyName(name: string): string {
    const cleaned = name
      .replace(/\s+(?:via|for|at|on)\s+(?:greenhouse|ashbyhq|workday|teamtailor|workable|lever)/i, '')
      .replace(/\s+(?:IT\s+)?Recruitment\s*$/i, '')
      .replace(/\s+(?:Recruiting|Hiring|Team|Talent)\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  private extractPosition(email: Email): string | undefined {
    const subject = email.subject;
    const body = email.body;


    let match = subject.match(/^(?:Application update|Application received|Application confirmation|Status update|Update on|Thank you for|Thanks for|Regarding your|Your application|Job application)\s*[-–—|]\s+(.+)/i);
    if (match) {
      const pos = this.cleanPosition(match[1]);
      if (pos) return pos;
    }

    match = subject.match(/^([A-Z][A-Za-z0-9 &'.]+?)\s*[-–—|]\s+(.+)/);
    if (match) {
      const firstSegment = match[1].trim().toLowerCase();
      const isCompanyPrefix = !NON_COMPANY_PREFIXES.some(p => firstSegment === p || firstSegment.startsWith(p + ' '));
      if (isCompanyPrefix) {
        const pos = this.cleanPosition(match[2]);
        if (pos) return pos;
      }
    }

    match = subject.match(/^([A-Z][A-Za-z0-9 ./&-]+?)\s*[-–—]\s+(?:Fort|New|San|Los|London|Toronto|Chicago|Seattle|Boston|Austin)/);
    if (match) {
      const pos = this.cleanPosition(match[1]);
      if (pos) return pos;
    }

    match = subject.match(/(.+?)\s+at\s+[A-Z]/i);
    if (match) return this.cleanPosition(match[1]);

    match = subject.match(/\|\s*([^|]+?)(?:,|$)/);
    if (match) {
      const pos = this.cleanPosition(match[1]);
      if (pos) return pos;
    }

    match = body.match(/(?:position of|role of|job title\s*:)\s*([^\n.,]+?)(?:\s+at\s|\s+in\s|\s+with\s|[.,\n]|$)/i);
    if (match) return this.cleanPosition(match[1]);

    match = body.match(/job title[\s]+([^\n.,]+)/i);
    if (match) return this.cleanPosition(match[1]);

    match = body.match(/(?:applying (?:to|for)|for the)\s+(?:the\s+)?([^\n.,]+?)\s+(?:role|position|job)/i);
    if (match) return this.cleanPosition(match[1]);

    match = body.match(/(?:as\s+|in\s+)?([A-Z][A-Za-z0-9 &/]+(?:Engineer|Developer|Manager|Designer|Analyst|Consultant|Specialist|Lead|Principal|Staff))(?:\s+(?:at|with|for|$|,))/i);
    if (match) return this.cleanPosition(match[1]);

    match = subject.match(/for\s+([^|\n]+?)(?:\s*[,.]|\s*$)/i);
    if (match) return this.cleanPosition(match[1]);

    match = body.match(/(?:^|\n)(?:position|role|job title)[\s:]+([^\n.,]+)/i);
    if (match) return this.cleanPosition(match[1]);

    return undefined;
  }

  private extractSalary(email: Email): string | undefined {
    const body = email.body;

    const CS = '[\\$€£]';              // currency symbol
    const NUM = '[\\d,]+(?:\\.\\d+)?';  // number with optional commas/decimals
    const KNUM = '[\\d,]+(?:\\.\\d+)?[Kk]'; // k-suffix number

    let match = body.match(
      new RegExp(`(?:annual\\s+)?(?:salary|compensation|base\\s*(?:pay|salary)?|offered\\s+(?:salary|compensation))\\s*[:-]?\\s*(${CS})?\\s*(${NUM})`, 'i')
    );
    if (match) return this.formatSalaryNum(match[2], match[1] || '$');

    match = body.match(
      new RegExp(`(${CS})\\s*(${NUM})\\s*(?:per\\s*year|per\\s*annum|annually|/yr|/year|\\s+a\\s+year)`, 'i')
    );
    if (match) return this.formatSalaryNum(match[2], match[1]);

    match = body.match(
      new RegExp(`(${CS})\\s*(${KNUM})\\s*[-–—]\\s*(?:${CS}\\s*)?(${KNUM})`, 'i')
    );
    if (match) {
      const sym = match[1];
      const low = this.formatSalaryNum(this.expandK(match[2]), sym);
      const high = this.formatSalaryNum(this.expandK(match[3]), sym);
      return `${low} - ${high}`;
    }

    match = body.match(
      new RegExp(`(${CS})?\\s*(${KNUM})\\s*(?:per\\s*year|per\\s*annum|annually|/yr|/year|\\s+a\\s+year)`, 'i')
    );
    if (match) return this.formatSalaryNum(this.expandK(match[2]), match[1] || '$');

    match = body.match(
      new RegExp(`(?:salary|compensation|package|pay|base)\\s*(?:of|is|:)?\\s*(${CS})\\s*(${KNUM})`, 'i')
    );
    if (match) return this.formatSalaryNum(this.expandK(match[2]), match[1]);

    match = body.match(
      new RegExp(`(${CS})\\s*(${NUM})\\s*(?:[-–—]|to)\\s*(?:${CS}\\s*)?(${NUM})`, 'i')
    );
    if (match) {
      const sym = match[1];
      const low = this.formatSalaryNum(match[2], sym);
      const high = this.formatSalaryNum(match[3], sym);
      return `${low} - ${high}`;
    }

    match = body.match(
      new RegExp(`(${CS})\\s*(${NUM}).{0,50}(?:salary|compensation|per\\s*year|annually)`, 'i')
    );
    if (match) return this.formatSalaryNum(match[2], match[1]);

    match = body.match(
      new RegExp(`(?:salary|compensation).{0,50}(${CS})\\s*(${NUM})`, 'i')
    );
    if (match) return this.formatSalaryNum(match[2], match[1]);

    match = body.match(
      new RegExp(`(${CS})\\s*(${NUM})\\s*(?:/month|per\\s*month|monthly)`, 'i')
    );
    if (match) {
      const sym = match[1];
      const monthly = parseFloat(match[2].replace(/,/g, ''));
      const annual = Math.round(monthly * 12);
      const formatted = annual.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return `${sym}${formatted} (approx.)`;
    }

    return undefined;
  }

  private expandK(kStr: string): string {
    const match = kStr.match(/^([\d,]+(?:\.\d+)?)\s*[Kk]$/);
    if (!match) return kStr; // not a k-suffix, return as-is
    const val = parseFloat(match[1].replace(/,/g, ''));
    const full = Math.round(val * 1000); // always multiply by 1000
    return full.toString();
  }

  private formatSalaryNum(numStr: string, currency: string): string {
    const raw = numStr.replace(/,/g, '');
    const val = parseFloat(raw);
    if (isNaN(val)) return `${currency}${numStr}`;
    const rounded = Math.round(val);
    const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${currency}${formatted}`;
  }

  private cleanPosition(position: string): string {
    return position
      // Strip location suffixes: " - Fort Lauderdale,Fl" or " (Remote)"
      .replace(/\s*[-–—|]\s*(Fort Lauderdale(?:,\s*[A-Za-z]{2})?|New York(?:,\s*[A-Za-z]{2})?|San Francisco(?:,\s*[A-Za-z]{2})?|Los Angeles(?:,\s*[A-Za-z]{2})?|London|Toronto|Chicago|Seattle|Boston|Austin|Hybrid|Remote|On-site|Onsite|Flexible)\s*$/gi, '')
      .replace(/\s*\((?:Remote|Hybrid|On-site|Onsite|Flexible|Work from home|WFH)\s*\)/gi, '')
      .replace(/\s*\[(?:Remote|Hybrid|On-site|Onsite|Flexible)\]/gi, '')
      // Strip team/department suffixes: " (Budgeting)", " - Engineering"
      .replace(/\s*\((Fort Lauderdale(?:,\s*[A-Za-z]{2})?|New York(?:,\s*[A-Za-z]{2})?|San Francisco|Los Angeles|London|Toronto|Chicago|Seattle|Boston|Austin|Budgeting|Engineering|Product|Design|Team)\s*\)$/gi, '')
      // Strip leading "the " prefix
      .replace(/^the\s+/i, '')
      // Strip common seniority modifiers that are redundant
      .replace(/\b(Full-time|Part-time|Contract|FT|PT)\b/gi, '')
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }
}
