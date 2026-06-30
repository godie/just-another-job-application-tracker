import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import MergePromptHandler from './MergePromptHandler';
import { useMergeStore } from '../../stores/mergeStore';
import type { MergeData } from '../../utils/mergeData';

const mockMergeData: MergeData = {
  applications: [{ id: '1', position: 'Dev', company: 'Co', salary: '', status: 'applied', applicationDate: '', interviewDate: '', timeline: [], notes: '', link: '', platform: '', contactName: '', followUpDate: '' }],
  opportunities: [],
};

describe('MergePromptHandler', () => {
  beforeEach(() => {
    useMergeStore.getState().clearConflict();
  });

  it('renders nothing when no conflict is detected', () => {
    const { container } = render(<MergePromptHandler />);
    expect(container.innerHTML).toBe('');
  });

  it('renders modal when conflict is detected', () => {
    useMergeStore.getState().setConflict(mockMergeData, { applications: [], opportunities: [] });
    const { container } = render(<MergePromptHandler />);
    expect(container.querySelector('.fixed.inset-0')).toBeTruthy();
  });
});
