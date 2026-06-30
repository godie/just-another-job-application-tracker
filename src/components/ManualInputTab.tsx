
import React from 'react';
import type { SeniorityLevel } from '../types/matching';
import type { ProfileSetupAction } from './profileSetupReducer';

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

interface ManualInputTabProps {
  targetRoles: string;
  seniority: SeniorityLevel | '';
  topSkills: string;
  preferredLocations: string;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  selectedWorkTypes: ('remote' | 'on-site' | 'hybrid')[];
  dispatch: React.Dispatch<ProfileSetupAction>;
}

export const ManualInputTab: React.FC<ManualInputTabProps> = ({
  targetRoles,
  seniority,
  topSkills,
  preferredLocations,
  salaryMin,
  salaryMax,
  salaryCurrency,
  selectedWorkTypes,
  dispatch,
}) => {
  return (
    <div className="space-y-5">
      {/* Target Roles */}
      <div className="space-y-1.5">
        <label htmlFor="target-roles" className="block text-sm font-semibold text-foreground">
          Target Roles
        </label>
        <input
          type="text"
          id="target-roles"
          value={targetRoles}
          onChange={(e) => dispatch({ type: 'SET_TARGET_ROLES', value: e.target.value })}
          placeholder="e.g., Software Engineer, Backend Developer, Data Scientist"
          className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:border-ring outline-none transition"
        />
        <p className="text-xs text-muted-foreground">
          Comma-separated list of job titles you are targeting
        </p>
      </div>

      {/* Seniority */}
      <div className="space-y-1.5">
        <label htmlFor="seniority" className="block text-sm font-semibold text-foreground">
          Seniority Level
        </label>
        <select
          id="seniority"
          value={seniority}
          onChange={(e) => dispatch({ type: 'SET_SENIORITY', value: e.target.value as SeniorityLevel | '' })}
          className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:border-ring outline-none transition"
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
        <label htmlFor="top-skills" className="block text-sm font-semibold text-foreground">
          Top Skills
        </label>
        <input
          type="text"
          id="top-skills"
          value={topSkills}
          onChange={(e) => dispatch({ type: 'SET_TOP_SKILLS', value: e.target.value })}
          placeholder="e.g., React, Node.js, Python, Kubernetes"
          className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:border-ring outline-none transition"
        />
        <p className="text-xs text-muted-foreground">
          Comma-separated list of your strongest skills
        </p>
      </div>

      {/* Work Types */}
      <div className="space-y-1.5">
        <span className="block text-sm font-semibold text-foreground">
          Preferred Work Arrangement
        </span>
        <div className="flex gap-3">
          {WORK_TYPE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              htmlFor={`work-type-${opt.value}`}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition ${
                selectedWorkTypes.includes(opt.value)
                  ? 'border-primary bg-primary/5 dark:bg-primary/10 text-primary'
                  : 'border-border hover:border-border text-muted-foreground'
              }`}
            >
              <input
                type="checkbox"
                id={`work-type-${opt.value}`}
                checked={selectedWorkTypes.includes(opt.value)}
                onChange={() => dispatch({ type: 'TOGGLE_WORK_TYPE', value: opt.value })}
                className="sr-only"
              />
              <span className="text-sm font-medium">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Locations */}
      <div className="space-y-1.5">
        <label htmlFor="preferred-locations" className="block text-sm font-semibold text-foreground">
          Preferred Locations
        </label>
        <input
          type="text"
          id="preferred-locations"
          value={preferredLocations}
          onChange={(e) => dispatch({ type: 'SET_PREFERRED_LOCATIONS', value: e.target.value })}
          placeholder="e.g., Remote, San Francisco, Berlin"
          className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:border-ring outline-none transition"
        />
      </div>

      {/* Salary */}
      <div className="space-y-1.5">
        <label htmlFor="salary-min" className="block text-sm font-semibold text-foreground">
          Salary Expectations
        </label>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="number"
              id="salary-min"
              value={salaryMin}
              onChange={(e) => dispatch({ type: 'SET_SALARY_MIN', value: e.target.value })}
              placeholder="Min"
              aria-label="Minimum salary"
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:border-ring outline-none transition"
            />
          </div>
          <div className="flex-1">
            <input
              type="number"
              id="salary-max"
              value={salaryMax}
              onChange={(e) => dispatch({ type: 'SET_SALARY_MAX', value: e.target.value })}
              placeholder="Max"
              aria-label="Maximum salary"
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:border-ring outline-none transition"
            />
          </div>
          <select
            value={salaryCurrency}
            onChange={(e) => dispatch({ type: 'SET_SALARY_CURRENCY', value: e.target.value })}
            aria-label="Currency"
            className="px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:border-ring outline-none transition"
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
  );
};
