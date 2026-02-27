import { useState, useCallback } from 'react';

import {
  scanEmails,
  applyScanPreview,
} from '../services/scanService';
import type { EmailProvider } from '../providers/emailProvider';
import type { ScanPreview, ProposedAddition, ProposedUpdate, ApplyResult } from '../types';

export function useEmailScan() {
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [preview, setPreview] = useState<ScanPreview | null>(null);

  const scan = useCallback(async (provider: EmailProvider, daysBack: number = 30) => {
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const result = await scanEmails(provider, daysBack);
      setPreview(result);
      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const applySelected = useCallback(
    async (
      additions: ProposedAddition[],
      updates: ProposedUpdate[]
    ): Promise<ApplyResult> => {
      setApplying(true);
      setError(null);
      try {
        const result = applyScanPreview(additions, updates);
        setPreview((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            proposedAdditions: prev.proposedAdditions.filter(
              (a) => !additions.some((x) => x.id === a.id)
            ),
            proposedUpdates: prev.proposedUpdates.filter(
              (u) => !updates.some((x) => x.id === u.id)
            ),
          };
        });
        return result;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setApplying(false);
      }
    },
    []
  );

  const clearPreview = useCallback(() => {
    setPreview(null);
    setError(null);
  }, []);

  return { scan, applySelected, loading, applying, error, preview, setPreview, clearPreview };
}
  