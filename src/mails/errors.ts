/**
 * Error thrown when Gmail API returns 429 Too Many Requests or 503.
 * Allows the UI to show a specific "try again later" message.
 */
export class GmailRateLimitError extends Error {
  readonly isRateLimit = true;
  readonly status: number;

  constructor(status: number, message?: string) {
    super(
      message ??
        'Too many requests. Gmail rate limit exceeded. Please try again in a few minutes.'
    );
    this.name = 'GmailRateLimitError';
    this.status = status;
    Object.setPrototypeOf(this, GmailRateLimitError.prototype);
  }
}

export function isGmailRateLimitError(err: unknown): err is GmailRateLimitError {
  return err instanceof GmailRateLimitError || (err instanceof Error && (err as Error & { isRateLimit?: boolean }).isRateLimit === true);
}
