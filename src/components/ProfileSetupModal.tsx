// src/components/ProfileSetupModal.tsx

import React, { useState, useRef, useCallback, useEffect } from 'react';
import useFocusTrap from '../hooks/useFocusTrap';
import useKeyboardEscape from '../hooks/useKeyboardEscape';
import type { UserMatchProfile, SeniorityLevel } from '../types/matching';

interface ProfileSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingProfile: UserMatchProfile | null;
  onSave: (profile: Partial<UserMatchProfile>) => void;
}

const SENIORITY_OPTIONS: { value: SeniorityLevel; label: string }[] = [
  { value: 'intern', label: 'Intern' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-level' },
  { value: 'senior', label: 'Senior' },
  { value: 'staff', label: 'Staff' },
  { value: 'lead', label: 'Lead' },
  { value: 'principal', label: 'Principal' },
  { value: 'executive', label: 'Executive' },
];

const WORK_TYPE_OPTIONS: { value: 'remote' | 'on-site' | 'hybrid'; label: string }[] = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'on-site', label: 'On-site' },
];

export const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({
  isOpen,
  onClose,
  existingProfile,
  onSave,
}) => {
  const modalRef = useRef<HTMLDialogElement>(null);
  useFocusTrap(modalRef, isOpen);
  useKeyboardEscape(onClose, isOpen);

  // Form state
  const [targetRoles, setTargetRoles] = useState('');
  const [seniority, setSeniority] = useState<SeniorityLevel | ''>('');
  const [topSkills, setTopSkills] = useState('');
  const [preferredLocations, setPreferredLocations] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [salaryCurrency, setSalaryCurrency] = useState('USD');
  const [selectedWorkTypes, setSelectedWorkTypes] = useState<('remote' | 'on-site' | 'hybrid')[]>([]);
  const [cvText, setCvText] = useState('');
  const [activeTab, setActiveTab] = useState<'manual' | 'cv'>('manual');

  // Sync/reset form state whenever isOpen or existingProfile changes
  useEffect(() => {
    if (isOpen) {
      setTargetRoles(existingProfile?.targetRoles.join(', ') ?? '');
      setSeniority(existingProfile?.seniority ?? '');
      setTopSkills(existingProfile?.topSkills.join(', ') ?? '');
      setPreferredLocations(existingProfile?.preferredLocations.join(', ') ?? '');
      setSalaryMin(existingProfile?.salaryRange?.min?.toString() ?? '');
      setSalaryMax(existingProfile?.salaryRange?.max?.toString() ?? '');
      setSalaryCurrency(existingProfile?.salaryRange?.currency ?? 'USD');
      setSelectedWorkTypes(existingProfile?.preferredWorkTypes ?? []);
      setCvText(existingProfile?.cvText ?? '');
      setActiveTab('manual');
    }
  }, [isOpen, existingProfile]);

  const handleToggleWorkType = (wt: 'remote' | 'on-site' | 'hybrid') => {
    setSelectedWorkTypes((prev) =>
      prev.includes(wt) ? prev.filter((w) => w !== wt) : [...prev, wt]
    );
  };

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="none"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <dialog
        open
        aria-modal="true"
        aria-labelledby="profile-setup-title"
        ref={modalRef}
        className="w-full max-w-2xl bg-white dark:bg-earth-800 rounded-xl shadow-2xl border border-earth-200 dark:border-earth-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-earth-200 dark:border-earth-700 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 id="profile-setup-title" className="text-xl font-semibold text-earth-900 dark:text-earth-100">
              Matching Profile Setup
            </h2>
            <p className="text-sm text-earth-500 dark:text-earth-400 mt-0.5">
              Help us find the best opportunities for you
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-earth-400 hover:text-earth-600 dark:hover:text-earth-300 hover:bg-earth-100 dark:hover:bg-earth-700 transition"
            aria-label="Close"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 flex-shrink-0">
          <div className="flex gap-1 p-1 bg-earth-100 dark:bg-earth-700/50 rounded-lg w-fit" role="tablist">
            <button
              type="button"
              role="tab"
              id="tab-manual"
              aria-controls="panel-manual"
              aria-selected={activeTab === 'manual'}
              onClick={() => setActiveTab('manual')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
                activeTab === 'manual'
                  ? 'bg-white dark:bg-earth-600 text-earth-900 dark:text-earth-100 shadow-sm'
                  : 'text-earth-600 dark:text-earth-400 hover:text-earth-800 dark:hover:text-earth-200'
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
              onClick={() => setActiveTab('cv')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
                activeTab === 'cv'
                  ? 'bg-white dark:bg-earth-600 text-earth-900 dark:text-earth-100 shadow-sm'
                  : 'text-earth-600 dark:text-earth-400 hover:text-earth-800 dark:hover:text-earth-200'
              }`}
            >
              Paste CV
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div
            className="p-6 space-y-5"
            role="tabpanel"
            id="panel-manual"
            aria-labelledby="tab-manual"
            hidden={activeTab !== 'manual'}
          >
            {/* Target Roles */}
            <div className="space-y-1.5">
              <label htmlFor="target-roles" className="block text-sm font-semibold text-earth-700 dark:text-earth-300">
                Target Roles
              </label>
              <input
                type="text"
                id="target-roles"
                value={targetRoles}
                onChange={(e) => setTargetRoles(e.target.value)}
                placeholder="e.g., Software Engineer, Backend Developer, Data Scientist"
                aria-label="Target Roles"
                className="w-full px-3 py-2 border border-earth-300 dark:border-earth-600 rounded-lg bg-white dark:bg-earth-900 text-earth-900 dark:text-earth-100 text-sm focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none transition"
              />
              <p className="text-xs text-earth-500 dark:text-earth-400">
                Comma-separated list of job titles you are targeting
              </p>
            </div>

            {/* Seniority */}
            <div className="space-y-1.5">
              <label htmlFor="seniority" className="block text-sm font-semibold text-earth-700 dark:text-earth-300">
                Seniority Level
              </label>
              <select
                id="seniority"
                value={seniority}
                onChange={(e) => setSeniority(e.target.value as SeniorityLevel | '')}
                aria-label="Seniority Level"
                className="w-full px-3 py-2 border border-earth-300 dark:border-earth-600 rounded-lg bg-white dark:bg-earth-900 text-earth-900 dark:text-earth-100 text-sm focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none transition"
              >
                <option value="">Select</option>
                {SENIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Skills */}
            <div className="space-y-1.5">
              <label htmlFor="top-skills" className="block text-sm font-semibold text-earth-700 dark:text-earth-300">
                Top Skills
              </label>
              <input
                type="text"
                id="top-skills"
                value={topSkills}
                onChange={(e) => setTopSkills(e.target.value)}
                placeholder="e.g., React, Node.js, Python, Kubernetes"
                aria-label="Top Skills"
                className="w-full px-3 py-2 border border-earth-300 dark:border-earth-600 rounded-lg bg-white dark:bg-earth-900 text-earth-900 dark:text-earth-100 text-sm focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none transition"
              />
              <p className="text-xs text-earth-500 dark:text-earth-400">
                Comma-separated list of your strongest skills
              </p>
            </div>

            {/* Work Types */}
            <div className="space-y-1.5">
              <span className="block text-sm font-semibold text-earth-700 dark:text-earth-300">
                Preferred Work Arrangement
              </span>
              <div className="flex gap-3">
                {WORK_TYPE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    htmlFor={`work-type-${opt.value}`}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition ${
                      selectedWorkTypes.includes(opt.value)
                        ? 'border-sage-600 bg-sage-50 dark:bg-sage-900/20 text-sage-700 dark:text-sage-300'
                        : 'border-earth-200 dark:border-earth-700 hover:border-earth-300 dark:hover:border-earth-600 text-earth-600 dark:text-earth-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      id={`work-type-${opt.value}`}
                      checked={selectedWorkTypes.includes(opt.value)}
                      onChange={() => handleToggleWorkType(opt.value)}
                      className="sr-only"
                      aria-label={opt.label}
                    />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Locations */}
            <div className="space-y-1.5">
              <label htmlFor="preferred-locations" className="block text-sm font-semibold text-earth-700 dark:text-earth-300">
                Preferred Locations
              </label>
              <input
                type="text"
                id="preferred-locations"
                value={preferredLocations}
                onChange={(e) => setPreferredLocations(e.target.value)}
                placeholder="e.g., Remote, San Francisco, Berlin"
                aria-label="Preferred Locations"
                className="w-full px-3 py-2 border border-earth-300 dark:border-earth-600 rounded-lg bg-white dark:bg-earth-900 text-earth-900 dark:text-earth-100 text-sm focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none transition"
              />
            </div>

            {/* Salary */}
            <div className="space-y-1.5">
              <label htmlFor="salary-min" className="block text-sm font-semibold text-earth-700 dark:text-earth-300">
                Salary Expectations
              </label>
              <div className="flex gap-3">                  <div className="flex-1">
                    <input
                      type="number"
                      id="salary-min"
                      value={salaryMin}
                      onChange={(e) => setSalaryMin(e.target.value)}
                      placeholder="Min"
                      aria-label="Minimum Salary"
                    className="w-full px-3 py-2 border border-earth-300 dark:border-earth-600 rounded-lg bg-white dark:bg-earth-900 text-earth-900 dark:text-earth-100 text-sm focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none transition"
                  />
                </div>                  <div className="flex-1">
                    <input
                      type="number"
                      id="salary-max"
                      value={salaryMax}
                      onChange={(e) => setSalaryMax(e.target.value)}
                      placeholder="Max"
                      aria-label="Maximum Salary"
                    className="w-full px-3 py-2 border border-earth-300 dark:border-earth-600 rounded-lg bg-white dark:bg-earth-900 text-earth-900 dark:text-earth-100 text-sm focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none transition"
                  />
                </div>
                <select
                  value={salaryCurrency}
                  onChange={(e) => setSalaryCurrency(e.target.value)}
                  aria-label="Salary Currency"
                  className="px-3 py-2 border border-earth-300 dark:border-earth-600 rounded-lg bg-white dark:bg-earth-900 text-earth-900 dark:text-earth-100 text-sm focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none transition"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                </select>
              </div>
            </div>
          </div>

          <div
            className="p-6 space-y-5"
            role="tabpanel"
            id="panel-cv"
            aria-labelledby="tab-cv"
            hidden={activeTab !== 'cv'}
          >
            <div className="space-y-1.5">
              <label htmlFor="cv-text" className="block text-sm font-semibold text-earth-700 dark:text-earth-300">
                CV / Resume Text
              </label>
              <textarea
                id="cv-text"
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
                rows={12}
                placeholder="Paste your CV or resume text here. Our AI will analyze it to extract your skills, experience, and preferences..."
                aria-label="CV / Resume Text"
                className="w-full px-3 py-2 border border-earth-300 dark:border-earth-600 rounded-lg bg-white dark:bg-earth-900 text-earth-900 dark:text-earth-100 text-sm focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none transition resize-none font-mono"
              />
              <p className="text-xs text-earth-500 dark:text-earth-400">
                Your CV text is stored locally and used to enhance matching. You can also fill in the Manual Input tab for explicit control.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-earth-200 dark:border-earth-700 bg-earth-50 dark:bg-earth-800/50 flex justify-between items-center flex-shrink-0">
          <p className="text-xs text-earth-500 dark:text-earth-400">
            {activeTab === 'manual'
              ? 'Tip: You can also paste your CV in the other tab for AI-powered extraction.'
              : 'Tip: Fill manual fields for explicit control over your profile.'}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-earth-700 dark:text-earth-300 hover:bg-earth-100 dark:hover:bg-earth-700 rounded-lg transition border border-earth-300 dark:border-earth-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 text-sm font-medium bg-sage-600 text-white hover:bg-sage-700 rounded-lg transition"
            >
              Save Profile
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
};

