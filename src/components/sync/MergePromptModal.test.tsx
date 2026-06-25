import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MergePromptModal from './MergePromptModal';
import { useMergeStore } from '../../stores/mergeStore';
import type { MergeData } from '../../utils/mergeData';

const mockLocalData: MergeData = {
  applications: [{ id: '1', position: 'Local Dev', company: 'Local Co', salary: '', status: 'applied', applicationDate: '', interviewDate: '', timeline: [], notes: '', link: '', platform: '', contactName: '', followUpDate: '' }],
  opportunities: [],
};

const mockCloudData: MergeData = {
  applications: [{ id: '2', position: 'Cloud Dev', company: 'Cloud Co', salary: '', status: 'applied', applicationDate: '', interviewDate: '', timeline: [], notes: '', link: '', platform: '', contactName: '', followUpDate: '' }],
  opportunities: [],
};

describe('MergePromptModal', () => {
  beforeEach(() => {
    useMergeStore.getState().setConflict(mockLocalData, mockCloudData);
  });

  afterEach(() => {
    useMergeStore.getState().clearConflict();
  });

  it('renders null when no data is available', () => {
    useMergeStore.getState().clearConflict();
    const { container } = render(<MergePromptModal />);
    expect(container.innerHTML).toBe('');
  });

  it('renders the conflict modal with data summary', () => {
    render(<MergePromptModal />);
    expect(screen.getByText('Data Conflict')).toBeTruthy();
  });

  it('renders three strategy options', () => {
    render(<MergePromptModal />);
    expect(screen.getByText('Use Cloud Data')).toBeTruthy();
    expect(screen.getByText('Keep Local Data')).toBeTruthy();
    expect(screen.getByText('Merge Both (Recommended)')).toBeTruthy();
  });

  it('calls onClose when cancel is clicked', () => {
    const onClose = vi.fn();
    render(<MergePromptModal onClose={onClose} />);
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
