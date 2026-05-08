// src/components/settings/MatchingSettings.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatchingSettings } from './MatchingSettings';
import type { MatchingPreferences } from '../../types/matching';

function makePrefs(overrides: Partial<MatchingPreferences> = {}): MatchingPreferences {
  return {
    enabled: true,
    useGemini: true,
    includeCvText: true,
    includeNotes: false,
    includeTimeline: true,
    minMatchThreshold: 50,
    prioritizeRemote: false,
    autoComputeOnOpportunityAdd: true,
    ...overrides,
  };
}

describe('MatchingSettings', () => {
  it('renders master toggle and title', () => {
    render(
      <MatchingSettings
        preferences={makePrefs({ enabled: false })}
        profileStatus="none"
        profileLastComputed={null}
        isComputingScores={false}
        onUpdatePreferences={vi.fn()}
        onBuildProfile={vi.fn()}
        onComputeScores={vi.fn()}
        onOpenProfileModal={vi.fn()}
        onClearData={vi.fn()}
      />
    );
    expect(screen.getByText('AI-Powered Job Matching')).toBeInTheDocument();
    expect(screen.getByText('Automatically score how well opportunities match your profile')).toBeInTheDocument();
  });

  it('shows additional sections when enabled', () => {
    render(
      <MatchingSettings
        preferences={makePrefs({ enabled: true })}
        profileStatus="none"
        profileLastComputed={null}
        isComputingScores={false}
        onUpdatePreferences={vi.fn()}
        onBuildProfile={vi.fn()}
        onComputeScores={vi.fn()}
        onOpenProfileModal={vi.fn()}
        onClearData={vi.fn()}
      />
    );
    expect(screen.getByText('Use Gemini AI for Scoring')).toBeInTheDocument();
    expect(screen.getByText('Data Sources')).toBeInTheDocument();
    expect(screen.getByText('Behavior')).toBeInTheDocument();
  });

  it('hides additional sections when disabled', () => {
    render(
      <MatchingSettings
        preferences={makePrefs({ enabled: false })}
        profileStatus="none"
        profileLastComputed={null}
        isComputingScores={false}
        onUpdatePreferences={vi.fn()}
        onBuildProfile={vi.fn()}
        onComputeScores={vi.fn()}
        onOpenProfileModal={vi.fn()}
        onClearData={vi.fn()}
      />
    );
    expect(screen.queryByText('Use Gemini AI for Scoring')).not.toBeInTheDocument();
    expect(screen.queryByText('Data Sources')).not.toBeInTheDocument();
  });

  it('calls onUpdatePreferences when master toggle clicked', () => {
    const handleUpdate = vi.fn();
    render(
      <MatchingSettings
        preferences={makePrefs({ enabled: false })}
        profileStatus="none"
        profileLastComputed={null}
        isComputingScores={false}
        onUpdatePreferences={handleUpdate}
        onBuildProfile={vi.fn()}
        onComputeScores={vi.fn()}
        onOpenProfileModal={vi.fn()}
        onClearData={vi.fn()}
      />
    );
    // Click the master toggle (first switch)
    const toggle = screen.getAllByRole('switch')[0];
    fireEvent.click(toggle);
    expect(handleUpdate).toHaveBeenCalledWith({ enabled: true });
  });

  it('calls onUpdatePreferences when Gemini toggle clicked', () => {
    const handleUpdate = vi.fn();
    render(
      <MatchingSettings
        preferences={makePrefs({ enabled: true, useGemini: false })}
        profileStatus="none"
        profileLastComputed={null}
        isComputingScores={false}
        onUpdatePreferences={handleUpdate}
        onBuildProfile={vi.fn()}
        onComputeScores={vi.fn()}
        onOpenProfileModal={vi.fn()}
        onClearData={vi.fn()}
      />
    );
    // Gemini toggle is the second switch (after master toggle)
    const toggles = screen.getAllByRole('switch');
    fireEvent.click(toggles[1]);
    expect(handleUpdate).toHaveBeenCalledWith({ useGemini: true });
  });

  it('calls onOpenProfileModal when edit profile clicked', () => {
    const handleOpen = vi.fn();
    render(
      <MatchingSettings
        preferences={makePrefs({ enabled: true })}
        profileStatus="none"
        profileLastComputed={null}
        isComputingScores={false}
        onUpdatePreferences={vi.fn()}
        onBuildProfile={vi.fn()}
        onComputeScores={vi.fn()}
        onOpenProfileModal={handleOpen}
        onClearData={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Edit Profile'));
    expect(handleOpen).toHaveBeenCalledTimes(1);
  });

  it('calls onBuildProfile when build button clicked', () => {
    const handleBuild = vi.fn();
    render(
      <MatchingSettings
        preferences={makePrefs({ enabled: true })}
        profileStatus="none"
        profileLastComputed={null}
        isComputingScores={false}
        onUpdatePreferences={vi.fn()}
        onBuildProfile={handleBuild}
        onComputeScores={vi.fn()}
        onOpenProfileModal={vi.fn()}
        onClearData={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Build Profile from History'));
    expect(handleBuild).toHaveBeenCalledTimes(1);
  });

  it('calls onComputeScores when compute scores clicked', () => {
    const handleCompute = vi.fn();
    render(
      <MatchingSettings
        preferences={makePrefs({ enabled: true })}
        profileStatus="ready"
        profileLastComputed={null}
        isComputingScores={false}
        onUpdatePreferences={vi.fn()}
        onBuildProfile={vi.fn()}
        onComputeScores={handleCompute}
        onOpenProfileModal={vi.fn()}
        onClearData={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Compute Scores'));
    expect(handleCompute).toHaveBeenCalledTimes(1);
  });

  it('disables compute scores when profile is none', () => {
    render(
      <MatchingSettings
        preferences={makePrefs({ enabled: true })}
        profileStatus="none"
        profileLastComputed={null}
        isComputingScores={false}
        onUpdatePreferences={vi.fn()}
        onBuildProfile={vi.fn()}
        onComputeScores={vi.fn()}
        onOpenProfileModal={vi.fn()}
        onClearData={vi.fn()}
      />
    );
    const button = screen.getByText('Compute Scores');
    expect(button).toBeDisabled();
  });

  it('shows building spinner', () => {
    render(
      <MatchingSettings
        preferences={makePrefs({ enabled: true })}
        profileStatus="building"
        profileLastComputed={null}
        isComputingScores={false}
        onUpdatePreferences={vi.fn()}
        onBuildProfile={vi.fn()}
        onComputeScores={vi.fn()}
        onOpenProfileModal={vi.fn()}
        onClearData={vi.fn()}
      />
    );
    expect(screen.getByText('Building...')).toBeInTheDocument();
  });

  it('shows scoring spinner', () => {
    render(
      <MatchingSettings
        preferences={makePrefs({ enabled: true })}
        profileStatus="ready"
        profileLastComputed={null}
        isComputingScores={true}
        onUpdatePreferences={vi.fn()}
        onBuildProfile={vi.fn()}
        onComputeScores={vi.fn()}
        onOpenProfileModal={vi.fn()}
        onClearData={vi.fn()}
      />
    );
    expect(screen.getByText('Scoring...')).toBeInTheDocument();
  });

  it('calls onClearData when clear button clicked', () => {
    const handleClear = vi.fn();
    render(
      <MatchingSettings
        preferences={makePrefs({ enabled: true })}
        profileStatus="ready"
        profileLastComputed="2024-03-15T10:00:00Z"
        isComputingScores={false}
        onUpdatePreferences={vi.fn()}
        onBuildProfile={vi.fn()}
        onComputeScores={vi.fn()}
        onOpenProfileModal={vi.fn()}
        onClearData={handleClear}
      />
    );
    fireEvent.click(screen.getByText('Clear All Matching Data'));
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('shows last profile computed date', () => {
    render(
      <MatchingSettings
        preferences={makePrefs({ enabled: true })}
        profileStatus="ready"
        profileLastComputed="2024-03-15T10:00:00Z"
        isComputingScores={false}
        onUpdatePreferences={vi.fn()}
        onBuildProfile={vi.fn()}
        onComputeScores={vi.fn()}
        onOpenProfileModal={vi.fn()}
        onClearData={vi.fn()}
      />
    );
    expect(screen.getByText(/Last profile update:/)).toBeInTheDocument();
  });
});
