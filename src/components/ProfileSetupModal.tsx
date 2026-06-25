
import React, { useReducer, useCallback } from 'react';
import type { UserMatchProfile } from '../types/matching';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/Dialog';

interface ProfileSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingProfile: UserMatchProfile | null;
  onSave: (profile: Partial<UserMatchProfile>) => void;
}

import { profileSetupReducer } from './profileSetupReducer';
import { ManualInputTab } from './ManualInputTab';

export const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({
  isOpen,
  onClose,
  existingProfile,
  onSave,
}) => {
  const [state, dispatch] = useReducer(profileSetupReducer, {
    targetRoles: existingProfile?.targetRoles.join(', ') ?? '',
    seniority: existingProfile?.seniority ?? '',
    topSkills: existingProfile?.topSkills.join(', ') ?? '',
    preferredLocations: existingProfile?.preferredLocations.join(', ') ?? '',
    salaryMin: existingProfile?.salaryRange?.min?.toString() ?? '',
    salaryMax: existingProfile?.salaryRange?.max?.toString() ?? '',
    salaryCurrency: existingProfile?.salaryRange?.currency ?? 'USD',
    selectedWorkTypes: existingProfile?.preferredWorkTypes ?? [],
    cvText: existingProfile?.cvText ?? '',
    activeTab: 'manual' as const,
  });

  const { targetRoles, seniority, topSkills, preferredLocations, salaryMin, salaryMax, salaryCurrency, selectedWorkTypes, cvText, activeTab } = state;

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      onClose();
    }
  }, [onClose]);

  const handleSubmit = useCallback(() => {
    const profile: Partial<UserMatchProfile> = {
      targetRoles: targetRoles.split(',').flatMap((s) => s.trim() ? [s.trim()] : []),
      seniority: seniority || null,
      topSkills: topSkills.split(',').flatMap((s) => s.trim() ? [s.trim().toLowerCase()] : []),
      preferredLocations: preferredLocations.split(',').flatMap((s) => s.trim() ? [s.trim()] : []),
      preferredWorkTypes: selectedWorkTypes,
      salaryRange: salaryMin || salaryMax
        ? {
            min: salaryMin ? parseInt(salaryMin, 10) : undefined,
            max: salaryMax ? parseInt(salaryMax, 10) : undefined,
            currency: salaryCurrency,
          }
        : null,
      cvText: cvText || undefined,
    };
    onSave(profile);
    onClose();
  }, [
    targetRoles, seniority, topSkills, preferredLocations,
    selectedWorkTypes, salaryMin, salaryMax, salaryCurrency, cvText,
    onSave, onClose,
  ]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <DialogTitle className="text-xl">Matching Profile Setup</DialogTitle>
          <DialogDescription>
            Help us find the best opportunities for you
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="px-6 pt-4 flex-shrink-0">
          <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit" role="tablist">
            <button
              type="button"
              role="tab"
              id="tab-manual"
              aria-controls="panel-manual"
              aria-selected={activeTab === 'manual'}
              onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', value: 'manual' })}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
                activeTab === 'manual'
                  ? 'bg-white dark:bg-muted text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Manual Input
            </button>
            <button
              type="button"
              role="tab"
              id="tab-cv"
              aria-controls="panel-cv"
              aria-selected={activeTab === 'cv'}
              onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', value: 'cv' })}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
                activeTab === 'cv'
                  ? 'bg-white dark:bg-muted text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Paste CV
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6">
          <div
            className="py-4 space-y-5"
            role="tabpanel"
            id="panel-manual"
            aria-labelledby="tab-manual"
            hidden={activeTab !== 'manual'}
          >
            <ManualInputTab
              targetRoles={targetRoles}
              seniority={seniority}
              topSkills={topSkills}
              preferredLocations={preferredLocations}
              salaryMin={salaryMin}
              salaryMax={salaryMax}
              salaryCurrency={salaryCurrency}
              selectedWorkTypes={selectedWorkTypes}
              dispatch={dispatch}
            />
          </div>

          <div
            className="py-4 space-y-5"
            role="tabpanel"
            id="panel-cv"
            aria-labelledby="tab-cv"
            hidden={activeTab !== 'cv'}
          >
            <div className="space-y-1.5">
              <label htmlFor="cv-text" className="block text-sm font-semibold text-foreground">
                CV / Resume Text
              </label>
              <textarea
                id="cv-text"
                value={cvText}
                onChange={(e) => dispatch({ type: 'SET_CV_TEXT', value: e.target.value })}
                rows={12}
                placeholder="Paste your CV or resume text here. Our AI will analyze it to extract your skills, experience, and preferences..."
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:border-ring outline-none transition resize-none font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Your CV text is stored locally and used to enhance matching. You can also fill in the Manual Input tab for explicit control.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border bg-muted/50 flex-shrink-0 sm:justify-between">
          <p className="text-xs text-muted-foreground text-left">
            {activeTab === 'manual'
              ? 'Tip: You can also paste your CV in the other tab for AI-powered extraction.'
              : 'Tip: Fill manual fields for explicit control over your profile.'}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition border border-border"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition"
            >
              Save Profile
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
