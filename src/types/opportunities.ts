
export interface JobOpportunity {
  id: string;
  position: string;
  company: string;
  link: string;
  description?: string;
  location?: string;
  jobType?: string; // Remote, Hybrid, On-site
  salary?: string;
  postedDate?: string; // ISO format date
  capturedDate: string; // ISO format date - when it was captured
}

