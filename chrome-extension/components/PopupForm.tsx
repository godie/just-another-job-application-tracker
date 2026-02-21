import React, { useId } from 'react';

export interface JobOpportunity {
  position: string;
  company: string;
  link: string;
  description?: string;
  location?: string;
  jobType?: string;
  salary?: string;
  postedDate?: string;
}

interface PopupFormProps {
  opportunity: JobOpportunity;
  saveAsApplication: boolean;
  isSaving: boolean;
  onInputChange: (field: keyof JobOpportunity, value: string) => void;
  onSaveAsApplicationChange: (checked: boolean) => void;
  onSave: () => void;
  onOpenApp: () => void;
}

const PopupForm: React.FC<PopupFormProps> = ({
  opportunity,
  saveAsApplication,
  isSaving,
  onInputChange,
  onSaveAsApplicationChange,
  onSave,
  onOpenApp,
}) => {
  const positionId = useId();
  const companyId = useId();
  const linkId = useId();
  const locationId = useId();
  const jobTypeId = useId();
  const salaryId = useId();
  const descriptionId = useId();
  const postedDateId = useId();
  const saveAsAppId = useId();

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={positionId} className="block text-xs font-medium text-gray-700 mb-1">
          Position <span className="text-red-500">*</span>
        </label>
        <input
          id={positionId}
          type="text"
          value={opportunity.position}
          onChange={(e) => onInputChange('position', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
          placeholder="e.g., Software Engineer"
        />
      </div>

      <div>
        <label htmlFor={companyId} className="block text-xs font-medium text-gray-700 mb-1">
          Company <span className="text-red-500">*</span>
        </label>
        <input
          id={companyId}
          type="text"
          value={opportunity.company}
          onChange={(e) => onInputChange('company', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
          placeholder="e.g., Google"
        />
      </div>

      <div>
        <label htmlFor={linkId} className="block text-xs font-medium text-gray-700 mb-1">
          Link <span className="text-red-500">*</span>
        </label>
        <input
          id={linkId}
          type="url"
          value={opportunity.link}
          onChange={(e) => onInputChange('link', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
          placeholder="https://linkedin.com/jobs/view/..."
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor={locationId} className="block text-xs font-medium text-gray-700 mb-1">Location</label>
          <input
            id={locationId}
            type="text"
            value={opportunity.location}
            onChange={(e) => onInputChange('location', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
            placeholder="e.g., Remote"
          />
        </div>

        <div>
          <label htmlFor={jobTypeId} className="block text-xs font-medium text-gray-700 mb-1">Job Type</label>
          <input
            id={jobTypeId}
            type="text"
            value={opportunity.jobType}
            onChange={(e) => onInputChange('jobType', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
            placeholder="Remote/Hybrid/On-site"
          />
        </div>
      </div>

      <div>
        <label htmlFor={salaryId} className="block text-xs font-medium text-gray-700 mb-1">Salary</label>
        <input
          id={salaryId}
          type="text"
          value={opportunity.salary}
          onChange={(e) => onInputChange('salary', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
          placeholder="e.g., $120k - $150k"
        />
      </div>

      <div>
        <label htmlFor={descriptionId} className="block text-xs font-medium text-gray-700 mb-1">Description</label>
        <textarea
          id={descriptionId}
          value={opportunity.description}
          onChange={(e) => onInputChange('description', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-gray-900"
          placeholder="Job description or notes..."
        />
      </div>

      <div>
        <label htmlFor={postedDateId} className="block text-xs font-medium text-gray-700 mb-1">Posted Date</label>
        <input
          id={postedDateId}
          type="date"
          value={opportunity.postedDate}
          onChange={(e) => onInputChange('postedDate', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
        />
      </div>

      <label htmlFor={saveAsAppId} className="flex items-center gap-2 cursor-pointer mt-2">
        <input
          id={saveAsAppId}
          type="checkbox"
          checked={saveAsApplication}
          onChange={(e) => onSaveAsApplicationChange(e.target.checked)}
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-sm text-gray-700">Ya apliqué — guardar en Applications</span>
      </label>

      <div className="mt-4 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isSaving ? 'Saving...' : saveAsApplication ? 'Save as Application' : 'Save to Opportunities'}
          </button>
          <button
            onClick={onOpenApp}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition duration-150 text-sm"
            title="Open Job Application Tracker in new tab"
          >
            Open App
          </button>
        </div>
        <p className="text-xs text-gray-500 text-center">
          💡 Tip: Right-click the extension icon and select "Inspect popup" to keep it open while copying/pasting
        </p>
      </div>
    </div>
  );
};

export default PopupForm;
