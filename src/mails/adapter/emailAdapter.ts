import type { Email, ParsedEvent, Event } from '../types';
import type { JobApplication, InterviewEvent, InterviewStageType } from '../../types/applications';

/** Maps parsed event types to timeline stage types (e.g. next_steps -> first_contact). */
const toTimelineType = (type: Event['type']): InterviewStageType => {
  if (type === 'next_steps') return 'first_contact';
  return type as InterviewStageType | 'application_submitted';
};

/** Subject prefixes that are NOT company names in structured subjects like "Application update - Position". */
const NON_COMPANY_PREFIXES = [
  'application update', 'application received', 'application confirmation',
  'status update', 'thank you for', 'thanks for', 'update on',
  'regarding your', 'your application', 'job application',
] as const;

/** Regex to detect words that typically end a job title (not a company name). */
const JOB_TITLE_ENDS = /(?:Engineer|Developer|Manager|Designer|Analyst|Consultant|Specialist|Lead|Principal|Staff|Director|Architect|Intern)$/i;

export class EmailAdapter {
  /**
   * Returns an application payload for a new application from an application_submitted event.
   * Used when scanning finds a "thank you for applying" email and no matching app exists.
   */
  applicationFromEvent(event: Event, email?: Email): Omit<JobApplication, 'id'> {
    const date = event.date.split('T')[0] ?? event.date;
    const timelineEvent: InterviewEvent = {
      id: event.id,
      type: event.type === 'offer' ? 'offer' : 'application_submitted',
      date,
      notes: event.notes ?? '',
      status: 'completed',
    };
    // Extract salary from offer emails, or use event.salary if already extracted
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

    // Rejected — English + Spanish (check BEFORE application_submitted to avoid false positives)
    // Many rejection emails say "thank you for your interest" but are rejections
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

    // Application submitted — English + Spanish
    // Note: "thank you for your interest" is NOT here because it appears in rejection emails too
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

    // Next steps / Interview — English + Spanish
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

    // Offer — English + Spanish
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

    // 1. Structured subject: "Company - Position" or "Company — Position"
    // Extract first segment before " - " or " — "
    // Block common non-company subject prefixes like "Application update"
    let match = subject.match(/^([A-Z][A-Za-z0-9 &'/.]+?)\s*[-–—|]\s/);
    if (match && match[1].length > 1) {
      const candidate = match[1].trim();
      const candidateLower = candidate.toLowerCase();
      // Skip if it's a known non-company prefix or looks like a job title
      const isNonCompanyPrefix = NON_COMPANY_PREFIXES.some(p => candidateLower === p || candidateLower.startsWith(p + ' '));
      const isJobTitle = JOB_TITLE_ENDS.test(candidate.trim());
      if (!isNonCompanyPrefix && !isJobTitle) {
        return this.cleanCompanyName(match[1]);
      }
    }

    // 2. Body: "Thanks for applying to the [Company] role" or "applying for the [Company] position"
    // Stop at common prepositions to avoid over-capturing
    // Skip if captured text ends with a job title word (it's a position, not a company)
    match = body.match(/(?:applying (?:to|for)|applied to)\s+the?\s+([A-Z][A-Za-z0-9 &'/]+?)(?:\s+(?:role|position|at|team|company|for|and|in|of)|\s*[,.]|\s*$)/i);
    if (match && !JOB_TITLE_ENDS.test(match[1].trim())) return this.cleanCompanyName(match[1]);
    // 2b. Body: "interest in joining [Company]" — exclude pronouns and stop at prepositions
    match = body.match(/interest in\s+(?:joining|working at)\s+(?!our\b|their\b|my\b|the\b)([A-Z][A-Za-z0-9 &'/]+?)(?:\s+(?:role|position|at|team|company|for|and|in|of)|\s*[,.]|\s*$)/i);
    if (match && !JOB_TITLE_ENDS.test(match[1].trim())) return this.cleanCompanyName(match[1]);

    // 3. Body: "Thank you for applying to [Company]" — skip "the", stop at prepositions
    match = body.match(/(?:thank you for applying|thanks for applying)\s+to\s+(?:the\s+)?([A-Z][A-Za-z0-9 &'/]+?)(?:\s+(?:for|and|in|of|at|role|position)|\s*[,.]|\s*$)/i);
    if (match && !JOB_TITLE_ENDS.test(match[1].trim())) return this.cleanCompanyName(match[1]);

    // 4. Body: "Welcome to [Company]" or "Welcome to the [Company] team"
    // Exclude pronouns: "joining our team" should NOT extract "Our"
    match = body.match(/(?:welcome to(?: the)?|joining)\s+(?!our\b|their\b|my\b|the\b)([A-Z][A-Za-z0-9 &'/.]+?)(?:\s+team|\s*[,.!]|\s*$)/i);
    if (match) return this.cleanCompanyName(match[1]);

    // 5. Body: "role at [Company]" or "position at [Company]" — require a job-related word before "at"
    match = body.match(/(?:role|position|job|opportunity|career)\s+at\s+([A-Z][A-Za-z0-9 &'/.]+?)(?:\s*[,.]|\s*$)/i);
    if (match) return this.cleanCompanyName(match[1]);
    // 5b. Body: "at [Company]" after a job title ending — require title word before "at"
    match = body.match(/(?:Engineer|Developer|Manager|Designer|Analyst|Consultant|Specialist|Lead|Principal|Staff)\s+at\s+([A-Z][A-Za-z0-9 &'/.]+?)(?:\s*[,.]|\s*$)/i);
    if (match) return this.cleanCompanyName(match[1]);

    // 6. From header: "Company Name via Greenhouse" or "Company Name Careers"
    // Strip ATS platform suffixes like "via Greenhouse", "via Lever", etc.
    match = from.match(/^([A-Z][A-Za-z0-9 &']+?)\s*(?:via|for)\s+(?:greenhouse|ashbyhq|workday|teamtailor|workable|lever|jobvite|smartrecruiters|applytojob|postmark)/i);
    if (match) return this.cleanCompanyName(match[1]);

    // 7. From header: extract display name before email (e.g., "Acme Corp <hr@acme.com>")
    match = from.match(/^([A-Z][A-Za-z0-9 &']+?)(?:\s+(?:Recruiting|Hiring|Team|Talent)?(?:\s+Team)?)?\s*</);
    if (match) {
      const name = match[1].trim();
      const excludedNames = ['Workable', 'no-reply', 'noreply', 'donotreply', 'notifications',
        'Hiring Team', 'Recruiting Team', 'Talent Team',
        'Recruiting', 'Hiring', 'Talent', 'Team', 'Careers', 'Jobs'];
      if (!excludedNames.some(p => name.toLowerCase() === p.toLowerCase())) {
        return this.cleanCompanyName(name);
      }
    }

    // 8. From header: company name from sender email (e.g., "jobs@company.com" -> "Company")
    match = fromLower.match(/@([a-z0-9-]+)\.(com|org|io|co|net|ca|ai|ai\.com)/);
    if (match) {
      const domain = match[1];
      const excludedDomains = ['greenhouse', 'ashbyhq', 'workday', 'teamtailor', 'workable', 'lever', 'applytojob', 'postmark', 'amazonses', 'notifications', 'send'];
      if (!excludedDomains.some(d => domain.includes(d))) {
        return this.cleanCompanyName(domain);
      }
    }

    // 9. Body: "Kovasys IT Recruitment" -> "Kovasys"
    match = body.match(/^([A-Z][A-Za-z0-9]+)(?:\s+(?:IT\s+)?Recruitment)?\s*$/m);
    if (match) return this.cleanCompanyName(match[1]);

    return undefined;
  }

  /** Cleans and normalizes company name. */
  private cleanCompanyName(name: string): string {
    const cleaned = name
      .replace(/\s+(?:via|for|at|on)\s+(?:greenhouse|ashbyhq|workday|teamtailor|workable|lever)/i, '')
      .replace(/\s+(?:IT\s+)?Recruitment\s*$/i, '')
      .replace(/\s+(?:Recruiting|Hiring|Team|Talent)\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    // Capitalize first letter if name appears to be lowercase (e.g., domain fallback)
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  private extractPosition(email: Email): string | undefined {
    const subject = email.subject;
    const body = email.body;

    // 1. Structured subject patterns
    // (NON_COMPANY_PREFIXES is a module-level constant)

    // 1a. Non-company-prefix subject: "Application update - Software Engineer"
    // When the first segment is a known non-company prefix, the second segment IS the position
    // Covers all entries in NON_COMPANY_PREFIXES (with /i flag, exact casing is handled)
    let match = subject.match(/^(?:Application update|Application received|Application confirmation|Status update|Update on|Thank you for|Thanks for|Regarding your|Your application|Job application)\s*[-–—|]\s+(.+)/i);
    if (match) {
      const pos = this.cleanPosition(match[1]);
      if (pos) return pos;
    }

    // 1b. Structured subject: "Company - Position" — only when first segment looks like a company
    // E.g., "ClearGov - Sr. Software Engineer (Budgeting)" -> "Sr. Software Engineer (Budgeting)"
    match = subject.match(/^([A-Z][A-Za-z0-9 &'.]+?)\s*[-–—|]\s+(.+)/);
    if (match) {
      const firstSegment = match[1].trim().toLowerCase();
      const isCompanyPrefix = !NON_COMPANY_PREFIXES.some(p => firstSegment === p || firstSegment.startsWith(p + ' '));
      if (isCompanyPrefix) {
        const pos = this.cleanPosition(match[2]);
        if (pos) return pos;
      }
    }

    // 1c. Subject starts with position followed by location: "Ruby/Rails Developer - Fort Lauderdale,Fl"
    // Detect when the segment after dash is a location (starts with city name)
    match = subject.match(/^([A-Z][A-Za-z0-9 ./&-]+?)\s*[-–—]\s+(?:Fort|New|San|Los|London|Toronto|Chicago|Seattle|Boston|Austin)/);
    if (match) {
      const pos = this.cleanPosition(match[1]);
      if (pos) return pos;
    }

    // 2. Subject: "Position at Company" (position is text before "at")
    match = subject.match(/(.+?)\s+at\s+[A-Z]/i);
    if (match) return this.cleanPosition(match[1]);

    // 3. Subject: "[Company] | Position" (position after pipe)
    match = subject.match(/\|\s*([^|]+?)(?:,|$)/);
    if (match) {
      const pos = this.cleanPosition(match[1]);
      if (pos) return pos;
    }

    // 4. Body: "position of [Position]" or "role of [Position]" or "job title: [Position]"
    // Stop at "at", "in", "with" (as whole words), newlines, punctuation to avoid over-capturing
    match = body.match(/(?:position of|role of|job title\s*:)\s*([^\n.,]+?)(?:\s+at\s|\s+in\s|\s+with\s|[.,\n]|$)/i);
    if (match) return this.cleanPosition(match[1]);

    // 4b. Body: "Job title [Position]" (without colon, e.g. "Job title Product Manager\n")
    match = body.match(/job title[\s]+([^\n.,]+)/i);
    if (match) return this.cleanPosition(match[1]);

    // 5. Body: "applying for the [Position] role" or "for the [Position] position"
    match = body.match(/(?:applying (?:to|for)|for the)\s+(?:the\s+)?([^\n.,]+?)\s+(?:role|position|job)/i);
    if (match) return this.cleanPosition(match[1]);

    // 6. Body: "at [Company] as [Position]"
    match = body.match(/(?:as\s+|in\s+)?([A-Z][A-Za-z0-9 &/]+(?:Engineer|Developer|Manager|Designer|Analyst|Consultant|Specialist|Lead|Principal|Staff))(?:\s+(?:at|with|for|$|,))/i);
    if (match) return this.cleanPosition(match[1]);

    // 7. Subject: after "for" (fallback)
    match = subject.match(/for\s+([^|\n]+?)(?:\s*[,.]|\s*$)/i);
    if (match) return this.cleanPosition(match[1]);

    // 8. Body: "Software Engineer role at Company" - extract from heading/label pattern
    match = body.match(/(?:^|\n)(?:position|role|job title)[\s:]+([^\n.,]+)/i);
    if (match) return this.cleanPosition(match[1]);

    return undefined;
  }

  /**
   * Extracts salary information from offer emails.
   * Handles annual, monthly, k-suffix, ranges, and multiple currencies.
   * Returns a clean, normalized salary string or undefined.
   */
  private extractSalary(email: Email): string | undefined {
    const body = email.body;

    // Shared regex building blocks
    // Note: $ must be escaped as \\$ in the character class for reliable matching
    // Note: In template literals for new RegExp(), \\s produces the string \s, which is the regex \s metacharacter
    const CS = '[\\$€£]';              // currency symbol
    const NUM = '[\\d,]+(?:\\.\\d+)?';  // number with optional commas/decimals
    const KNUM = '[\\d,]+(?:\\.\\d+)?[Kk]'; // k-suffix number

    // 1. Explicit annual salary: "annual salary: $120,000" or "compensation: €80,000"
    let match = body.match(
      new RegExp(`(?:annual\\s+)?(?:salary|compensation|base\\s*(?:pay|salary)?|offered\\s+(?:salary|compensation))\\s*[:-]?\\s*(${CS})?\\s*(${NUM})`, 'i')
    );
    if (match) return this.formatSalaryNum(match[2], match[1] || '$');

    // 2. Currency amount with per-year indicator: "$120,000 per year", "€80,000 annually"
    match = body.match(
      new RegExp(`(${CS})\\s*(${NUM})\\s*(?:per\\s*year|per\\s*annum|annually|/yr|/year|\\s+a\\s+year)`, 'i')
    );
    if (match) return this.formatSalaryNum(match[2], match[1]);

    // 3a. K-suffix range: "$100k - $120k" or "$100K-$120K"
    match = body.match(
      new RegExp(`(${CS})\\s*(${KNUM})\\s*[-–—]\\s*(?:${CS}\\s*)?(${KNUM})`, 'i')
    );
    if (match) {
      const sym = match[1];
      const low = this.formatSalaryNum(this.expandK(match[2]), sym);
      const high = this.formatSalaryNum(this.expandK(match[3]), sym);
      return `${low} - ${high}`;
    }

    // 3b. Single k-suffix with year indicator: "$120k per year", "100K/yr"
    match = body.match(
      new RegExp(`(${CS})?\\s*(${KNUM})\\s*(?:per\\s*year|per\\s*annum|annually|/yr|/year|\\s+a\\s+year)`, 'i')
    );
    if (match) return this.formatSalaryNum(this.expandK(match[2]), match[1] || '$');

    // 3c. K-suffix in offer context: "salary of $120k", "compensation: $120K"
    match = body.match(
      new RegExp(`(?:salary|compensation|package|pay|base)\\s*(?:of|is|:)?\\s*(${CS})\\s*(${KNUM})`, 'i')
    );
    if (match) return this.formatSalaryNum(this.expandK(match[2]), match[1]);

    // 4. Full-number salary range: "$100,000 - $120,000" or "€80,000 to €95,000"
    match = body.match(
      new RegExp(`(${CS})\\s*(${NUM})\\s*(?:[-–—]|to)\\s*(?:${CS}\\s*)?(${NUM})`, 'i')
    );
    if (match) {
      const sym = match[1];
      const low = this.formatSalaryNum(match[2], sym);
      const high = this.formatSalaryNum(match[3], sym);
      return `${low} - ${high}`;
    }

    // 5. Currency amount with "salary" nearby (within 50 chars after): "$120,000 ... salary"
    match = body.match(
      new RegExp(`(${CS})\\s*(${NUM}).{0,50}(?:salary|compensation|per\\s*year|annually)`, 'i')
    );
    if (match) return this.formatSalaryNum(match[2], match[1]);

    // 6. Reverse: "salary" ... "$120,000"
    match = body.match(
      new RegExp(`(?:salary|compensation).{0,50}(${CS})\\s*(${NUM})`, 'i')
    );
    if (match) return this.formatSalaryNum(match[2], match[1]);

    // 7. Monthly salary: "$10,000/month", "€8,000 per month" → convert to annual (approx.)
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

  /** Expands a k-suffix number string (e.g., "120k" → "120000", "1.5K" → "1500"). */
  private expandK(kStr: string): string {
    const match = kStr.match(/^([\d,]+(?:\.\d+)?)\s*[Kk]$/);
    if (!match) return kStr; // not a k-suffix, return as-is
    const val = parseFloat(match[1].replace(/,/g, ''));
    const full = Math.round(val * 1000); // always multiply by 1000
    return full.toString();
  }

  /**
   * Formats a raw number string with a currency symbol into a clean salary value.
   * - Adds commas as thousands separators
   * - Places currency symbol in front
   * - Handles already-comma-formatted numbers
   */
  private formatSalaryNum(numStr: string, currency: string): string {
    // Remove existing commas, parse, re-format with commas
    const raw = numStr.replace(/,/g, '');
    const val = parseFloat(raw);
    if (isNaN(val)) return `${currency}${numStr}`;
    const rounded = Math.round(val);
    const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${currency}${formatted}`;
  }

  /** Cleans and strips location/modifier suffixes from position title. */
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
