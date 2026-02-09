import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEmailScan } from './useEmailScan';
import type { ScanPreview } from '../types';

const mockScanEmails = vi.fn();
const mockApplyScanPreview = vi.fn();

vi.mock('../services/scanService', () => ({
  scanEmails: (...args: unknown[]) => mockScanEmails(...args),
  applyScanPreview: (...args: unknown[]) => mockApplyScanPreview(...args),
}));

describe('useEmailScan', () => {
  const mockProvider = { search: vi.fn(), getMessage: vi.fn(), normalize: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes scan, applySelected, loading, applying, error, preview, clearPreview', () => {
    const { result } = renderHook(() => useEmailScan());
    expect(result.current).toHaveProperty('scan');
    expect(result.current).toHaveProperty('applySelected');
    expect(result.current.loading).toBe(false);
    expect(result.current.applying).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.preview).toBeNull();
    expect(result.current.clearPreview).toBeDefined();
  });

  it('scan sets preview on success', async () => {
    const preview: ScanPreview = {
      proposedAdditions: [],
      proposedUpdates: [],
    };
    mockScanEmails.mockResolvedValue(preview);
    const { result } = renderHook(() => useEmailScan());

    await act(async () => {
      await result.current.scan(mockProvider as never);
    });

    expect(mockScanEmails).toHaveBeenCalledWith(mockProvider);
    expect(result.current.preview).toEqual(preview);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('scan sets error on failure', async () => {
    mockScanEmails.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useEmailScan());

    await act(async () => {
      try {
        await result.current.scan(mockProvider as never);
      } catch {
        // expected
      }
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toBe('Network error');
    });
    expect(result.current.preview).toBeNull();
  });

  it('applySelected calls applyScanPreview and returns result', async () => {
    mockApplyScanPreview.mockReturnValue({ added: 1, updated: 0 });
    const preview: ScanPreview = {
      proposedAdditions: [
        {
          id: 'add-1',
          data: {
            position: 'Dev',
            company: 'Co',
            salary: '',
            status: 'Applied',
            applicationDate: '2025-01-01',
            interviewDate: '',
            timeline: [],
            notes: '',
            link: '',
            platform: 'Email',
            contactName: '',
            followUpDate: '',
          },
          source: { subject: 'Thanks', date: '2025-01-01' },
        },
      ],
      proposedUpdates: [],
    };
    mockScanEmails.mockResolvedValue(preview);
    const { result } = renderHook(() => useEmailScan());
    await act(async () => {
      await result.current.scan(mockProvider as never);
    });
    expect(result.current.preview).not.toBeNull();

    let applyResult: { added: number; updated: number } | undefined;
    await act(async () => {
      applyResult = await result.current.applySelected(
        preview.proposedAdditions,
        preview.proposedUpdates
      );
    });

    expect(mockApplyScanPreview).toHaveBeenCalledWith(
      preview.proposedAdditions,
      preview.proposedUpdates
    );
    expect(applyResult).toEqual({ added: 1, updated: 0 });
  });

  it('clearPreview clears preview and error', async () => {
    mockScanEmails.mockResolvedValue({ proposedAdditions: [], proposedUpdates: [] });
    const { result } = renderHook(() => useEmailScan());
    await act(async () => {
      await result.current.scan(mockProvider as never);
    });
    expect(result.current.preview).not.toBeNull();
    act(() => {
      result.current.clearPreview();
    });
    expect(result.current.preview).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
