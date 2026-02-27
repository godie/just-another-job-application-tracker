import React from 'react';
import { type SettingsPageAction } from '../../../pages/SettingsPage';

interface SettingsNavigationProps {
  sections: { id: string; label: string; icon: string }[];
  activeSection: string;
  dispatch: React.Dispatch<SettingsPageAction>;
}

const SettingsNavigation: React.FC<SettingsNavigationProps> = ({ sections, activeSection, dispatch }) => {
  return (
    <div className="mb-6 flex flex-wrap gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2">
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => dispatch({ type: 'SET_FIELD', field: 'activeSection', value: section.id })}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeSection === section.id
              ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <span>{section.icon}</span>
          <span>{section.label}</span>
        </button>
      ))}
    </div>
  );
};

export default SettingsNavigation;
