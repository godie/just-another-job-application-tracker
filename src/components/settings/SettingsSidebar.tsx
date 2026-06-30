import React from 'react';

export type SettingsSection = 'fields' | 'view' | 'date' | 'custom' | 'interviewing' | 'emailScan' | 'atsSearch' | 'cloud' | 'tools' | 'matching';

interface Section {
  id: SettingsSection;
  label: string;
  icon: string;
  description: string;
}

interface Category {
  id: string;
  label: string;
  sections: string[];
}

interface SettingsSidebarProps {
  categories: Category[];
  sections: Section[];
  activeSection: SettingsSection;
  onSelectSection: (section: SettingsSection) => void;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  categories,
  sections,
  activeSection,
  onSelectSection,
}) => {
  return (
    <aside className="py-6 lg:col-span-3">
      <nav className="space-y-8">
        {categories.map((category) => (
          <div key={category.id}>
            <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {category.label}
            </h3>
            <div className="space-y-1">
              {category.sections.map((sectionId) => {
                const section = sections.find((s) => s.id === sectionId);
                if (!section) return null;
                const isActive = activeSection === sectionId;
                return (
                  <button
                    type="button"
                    key={sectionId}
                    onClick={() => onSelectSection(sectionId as SettingsSection)}
                    className={`group flex items-center px-4 py-3 text-sm font-semibold w-full transition-colors ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:text-muted-foreground'
                    }`}
                  >
                    <span className={`mr-3 text-xl ${isActive ? 'text-white' : 'text-muted-foreground group-hover:text-muted-foreground'}`}>
                      {section.icon}
                    </span>
                    <span className="truncate">{section.label}</span>
                    {isActive && (
                      <span className="ml-auto">
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
};
