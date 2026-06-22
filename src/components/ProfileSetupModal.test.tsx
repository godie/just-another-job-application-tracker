// src/components/ProfileSetupModal.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileSetupModal } from './ProfileSetupModal';
import type { UserMatchProfile } from '../types/matching';

function makeProfile(overrides: Partial<UserMatchProfile> = {}): UserMatchProfile {
  return {
    targetRoles: ['Software Engineer', 'Backend Developer'],
    seniority: 'senior',
    topSkills: ['react', 'node.js'],
    preferredWorkTypes: ['remote', 'hybrid'],
    preferredLocations: ['Remote', 'San Francisco'],
    salaryRange: { min: 100000, max: 160000, currency: 'USD' },
    preferredIndustries: [],
    profileSummary: 'Test profile',
    successPatterns: [],
    avoidPatterns: [],
    profileVersion: 1,
    confidence: 'high',
    lastComputed: new Date().toISOString(),
    ...overrides,
  };
}

describe('ProfileSetupModal', () => {
  it('does not render when closed', () => {
    const { container } = render(
      <ProfileSetupModal
        isOpen={false}
        onClose={vi.fn()}
        existingProfile={null}
        onSave={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title and description', () => {
    render(
      <ProfileSetupModal
        isOpen={true}
        onClose={vi.fn()}
        existingProfile={null}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByText('Matching Profile Setup')).toBeInTheDocument();
    expect(screen.getByText('Help us find the best opportunities for you')).toBeInTheDocument();
  });

  it('pre-fills fields with existing profile', () => {
    render(
      <ProfileSetupModal
        isOpen={true}
        onClose={vi.fn()}
        existingProfile={makeProfile()}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue('Software Engineer, Backend Developer')).toBeInTheDocument();
    expect(screen.getByDisplayValue('react, node.js')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Remote, San Francisco')).toBeInTheDocument();
    expect(screen.getByDisplayValue('100000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('160000')).toBeInTheDocument();
  });

  it('calls onSave with correct data when saved', () => {
    const handleSave = vi.fn();
    render(
      <ProfileSetupModal
        isOpen={true}
        onClose={vi.fn()}
        existingProfile={null}
        onSave={handleSave}
      />
    );

    fireEvent.change(screen.getByLabelText('Target Roles'), {
      target: { value: 'Frontend Developer, UI Engineer' },
    });
    fireEvent.click(screen.getByText('Save Profile'));

    expect(handleSave).toHaveBeenCalledTimes(1);
    const saved = handleSave.mock.calls[0][0] as Partial<UserMatchProfile>;
    expect(saved.targetRoles).toEqual(['Frontend Developer', 'UI Engineer']);
    expect(saved.seniority).toBeNull();
  });

  it('calls onClose when cancel button clicked', () => {
    const handleClose = vi.fn();
    render(
      <ProfileSetupModal
        isOpen={true}
        onClose={handleClose}
        existingProfile={null}
        onSave={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close icon clicked', () => {
    const handleClose = vi.fn();
    render(
      <ProfileSetupModal
        isOpen={true}
        onClose={handleClose}
        existingProfile={null}
        onSave={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText('Close'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('toggles between manual and cv tabs', () => {
    render(
      <ProfileSetupModal
        isOpen={true}
        onClose={vi.fn()}
        existingProfile={null}
        onSave={vi.fn()}
      />
    );

    // Default: manual tab
    expect(screen.getByText('Target Roles')).toBeInTheDocument();

    // Switch to CV tab
    fireEvent.click(screen.getByText('Paste CV'));
    expect(screen.getByText('CV / Resume Text')).toBeInTheDocument();

    // Switch back
    fireEvent.click(screen.getByText('Manual Input'));
    expect(screen.getByText('Target Roles')).toBeInTheDocument();
  });

  it('toggles work type selection', () => {
    const handleSave = vi.fn();
    render(
      <ProfileSetupModal
        isOpen={true}
        onClose={vi.fn()}
        existingProfile={null}
        onSave={handleSave}
      />
    );

    const remoteLabel = screen.getByText('Remote').closest('label');
    expect(remoteLabel).toBeInTheDocument();
    if (remoteLabel) {
      fireEvent.click(remoteLabel);
    }

    fireEvent.click(screen.getByText('Save Profile'));
    expect(handleSave).toHaveBeenCalledTimes(1);
  });

  it('submits with salary data', () => {
    const handleSave = vi.fn();
    render(
      <ProfileSetupModal
        isOpen={true}
        onClose={vi.fn()}
        existingProfile={null}
        onSave={handleSave}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Min'), {
      target: { value: '80000' },
    });
    fireEvent.change(screen.getByPlaceholderText('Max'), {
      target: { value: '120000' },
    });
    fireEvent.click(screen.getByText('Save Profile'));

    const saved = handleSave.mock.calls[0][0] as Partial<UserMatchProfile>;
    expect(saved.salaryRange).toEqual({
      min: 80000,
      max: 120000,
      currency: 'USD',
    });
  });

  it('resets form fields when opened without existingProfile after being opened with one', () => {
    const handleSave = vi.fn();
    const { rerender } = render(
      <ProfileSetupModal
        key="edit-profile"
        isOpen={true}
        onClose={vi.fn()}
        existingProfile={makeProfile()}
        onSave={handleSave}
      />
    );

    // Verify profile data is pre-filled
    expect(screen.getByDisplayValue('Software Engineer, Backend Developer')).toBeInTheDocument();
    expect(screen.getByDisplayValue('react, node.js')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Remote, San Francisco')).toBeInTheDocument();

    // Close modal
    rerender(
      <ProfileSetupModal
        key="closed-modal"
        isOpen={false}
        onClose={vi.fn()}
        existingProfile={makeProfile()}
        onSave={handleSave}
      />
    );

    // Re-open without existingProfile — using a new key forces clean remount
    rerender(
      <ProfileSetupModal
        key="new-profile"
        isOpen={true}
        onClose={vi.fn()}
        existingProfile={null}
        onSave={handleSave}
      />
    );

    // Check that previously filled fields are now empty
    expect((screen.getByLabelText('Target Roles') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Top Skills') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Preferred Locations') as HTMLInputElement).value).toBe('');

    // Salary inputs should be empty
    expect(screen.getByPlaceholderText('Min')).toHaveValue(null);
    expect(screen.getByPlaceholderText('Max')).toHaveValue(null);

    // Default currency should be USD
    expect(screen.getByDisplayValue('USD')).toBeInTheDocument();
  });
});
