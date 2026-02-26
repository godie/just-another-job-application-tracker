// chrome-extension/job-extractors/index.ts
// Registry and factory for job extractors

import { JobExtractor, JobData } from './JobExtractor';
import { LinkedInJobExtractor } from './LinkedInJobExtractor';
import { GreenhouseJobExtractor } from './GreenhouseJobExtractor';
import { AshbyhqJobExtractor } from './AshbyhqJobExtractor';
import { WorkableJobExtractor } from './WorkableJobExtractor';
import { LeverJobExtractor } from './LeverJobExtractor';
import { IndeedJobExtractor } from './IndeedJobExtractor';

/**
 * Registry of all available job extractors
 */
const extractors: JobExtractor[] = [
  new LinkedInJobExtractor(),
  new GreenhouseJobExtractor(),
  new AshbyhqJobExtractor(),
  new WorkableJobExtractor(),
  new LeverJobExtractor(),
  new IndeedJobExtractor(),
];

/**
 * Find the appropriate extractor for the current URL
 * @param url The current page URL
 * @returns The matching extractor or null if none found
 */
export function findExtractor(url: string): JobExtractor | null {
  return extractors.find(extractor => extractor.canHandle(url)) || null;
}

/**
 * Extract job data from the current page using the appropriate extractor
 * @param url The current page URL (optional, defaults to window.location.href)
 * @returns JobData object with extracted information
 */
export function extractJobData(url?: string): JobData {
  const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const extractor = findExtractor(currentUrl);
  
  if (extractor) {
    return extractor.extract();
  }
  
  return {};
}

/**
 * Get all registered extractors
 * @returns Array of all registered extractors
 */
export function getAllExtractors(): JobExtractor[] {
  return [...extractors];
}

/**
 * Register a new extractor
 * @param extractor The extractor to register
 */
export function registerExtractor(extractor: JobExtractor): void {
  extractors.push(extractor);
}

// Export types and classes for external use
export type { JobExtractor, JobData };
export { LinkedInJobExtractor };
export { GreenhouseJobExtractor };
export { AshbyhqJobExtractor };
export { WorkableJobExtractor };
export { LeverJobExtractor };
export { IndeedJobExtractor };

