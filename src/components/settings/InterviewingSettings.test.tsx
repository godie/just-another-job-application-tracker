import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import InterviewingSettings from './InterviewingSettings';
import type { CustomInterviewEvent } from '../../types/preferences';

const event: CustomInterviewEvent = {
  id: 'event-1',
  label: 'Very long interview event label '.repeat(8),
};

function renderSettings() {
  return render(
    <InterviewingSettings
      customInterviewEvents={[event]}
      editingInterviewEvent={null}
      interviewEventForm={{}}
      setInterviewEventForm={vi.fn()}
      onAddInterviewEvent={vi.fn()}
      onEditInterviewEvent={vi.fn()}
      onUpdateInterviewEvent={vi.fn()}
      onDeleteInterviewEvent={vi.fn()}
      onCancelEdit={vi.fn()}
    />
  );
}

describe('InterviewingSettings hardening', () => {
  it('keeps actions keyboard-revealed for long interview labels', () => {
    renderSettings();

    const edit = screen.getByRole('button', { name: 'Edit' });
    const actions = edit.parentElement;

    expect(actions).toHaveClass('group-focus-within:opacity-100');
    const label = screen.getByText(/Very long interview event label/);
    expect(label.parentElement).toHaveClass('min-w-0');
    expect(label).toHaveClass('break-words');
    fireEvent.focus(edit);
    expect(edit).toBeVisible();
  });
});
