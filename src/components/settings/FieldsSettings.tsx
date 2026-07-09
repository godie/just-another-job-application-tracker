import React from 'react';
import { useTranslation } from 'react-i18next';
import { type FieldDefinition } from '../../types/preferences';
import { Button } from '../ui/Button';

interface FieldsSettingsProps {
  orderedFields: FieldDefinition[];
  enabledFields: string[];
  defaultFields: FieldDefinition[];
  onToggleField: (fieldId: string) => void;
  onMoveField: (dragIndex: number, hoverIndex: number) => void;
}

const FieldsSettings: React.FC<FieldsSettingsProps> = ({
  orderedFields,
  enabledFields,
  defaultFields,
  onToggleField,
  onMoveField,
}) => {
  const { t } = useTranslation();

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const hoverIndex = direction === 'up' ? index - 1 : index + 1;
    onMoveField(index, hoverIndex);
  };

  const enabledSet = new Set(enabledFields);
  const defaultFieldIds = new Set(defaultFields.map((f) => f.id));

  return (
    <div className="space-y-6">
      <div className="border border-border rounded overflow-hidden divide-y divide-border">
        {orderedFields.map((field, index) => {
          const isEnabled = enabledSet.has(field.id);
          const isCustom = !defaultFieldIds.has(field.id);
          return (
            <div
              key={field.id}
              className="flex items-center justify-between p-4 bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="relative flex items-center">
                  <input
                    id={`field-${field.id}`}
                    name={`field-${field.id}`}
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => onToggleField(field.id)}
                    aria-label={!isCustom ? t(`fields.${field.id}`, field.label) : field.label}
                    className='size-5 text-primary border-border rounded focus:ring-ring transition cursor-pointer'
                  />
                </div>
                <div>
                  <label
                    htmlFor={`field-${field.id}`}
                    className='text-sm font-bold text-foreground cursor-pointer'
                  >
                    {!isCustom ? t(`fields.${field.id}`, field.label) : field.label}
                    {isCustom && (
                      <span className='ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary dark:bg-primary/10 dark:text-primary'>
                        {t('settings.custom.title')}
                      </span>
                    )}
                  </label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {field.required ? t('settings.fields.required') : t('settings.fields.optional')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMove(index, 'up')}
                  disabled={index === 0}
                  aria-label="Move Up"
                  title="Move Up"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMove(index, 'down')}
                  disabled={index === orderedFields.length - 1}
                  aria-label="Move Down"
                  title="Move Down"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FieldsSettings;
