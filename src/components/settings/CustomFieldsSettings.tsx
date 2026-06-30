import React from 'react';
import { useTranslation } from 'react-i18next';
import { type FieldDefinition } from '../../types/preferences';
import { Button } from '../ui/Button';

interface CustomFieldsSettingsProps {
  customFields: FieldDefinition[];
  editingCustomField: FieldDefinition | null;
  customFieldForm: Partial<FieldDefinition>;
  setCustomFieldForm: (form: Partial<FieldDefinition>) => void;
  onAddCustomField: () => void;
  onEditCustomField: (field: FieldDefinition) => void;
  onUpdateCustomField: () => void;
  onDeleteCustomField: (fieldId: string) => void;
  onCancelEdit: () => void;
}

const CustomFieldsSettings: React.FC<CustomFieldsSettingsProps> = ({
  customFields,
  editingCustomField,
  customFieldForm,
  setCustomFieldForm,
  onAddCustomField,
  onEditCustomField,
  onUpdateCustomField,
  onDeleteCustomField,
  onCancelEdit,
}) => {
  const { t } = useTranslation();

  return (
    <div className='space-y-8'>
      {/* Form Section */}
      <div className='bg-muted/50 rounded p-6 border border-border'>
        <h3 className='text-lg font-semibold text-foreground mb-6 flex items-center gap-2'>
          <span className='p-1.5 bg-primary/5 dark:bg-primary/10 text-primary rounded'>
            <svg xmlns='http://www.w3.org/2000/svg' className='size-5' viewBox='0 0 20 20' fill='currentColor'>
              <path fillRule='evenodd' d='M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z' clipRule='evenodd' />
            </svg>
          </span>
          {editingCustomField ? t('settings.custom.edit') : t('settings.custom.add')}
        </h3>

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
          <div className='sm:col-span-1'>
            <label htmlFor='custom-field-label' className='block text-sm font-bold text-muted-foreground mb-2'>
              {t('settings.custom.label')}
            </label>
            <input
              id='custom-field-label'
              type='text'
              value={customFieldForm.label || ''}
              onChange={(e) => setCustomFieldForm({ ...customFieldForm, label: e.target.value })}
              placeholder='e.g., Recruiter Phone'
              aria-label={t('settings.custom.label')}
              className='w-full px-4 py-3 border border-input rounded focus:ring-2 focus:ring-ring focus:border-ring bg-background text-foreground transition-all'
            />
          </div>

          <div className='sm:col-span-1'>
            <label htmlFor='custom-field-type' className='block text-sm font-bold text-muted-foreground mb-2'>
              {t('settings.custom.type')}
            </label>
            <select
              id='custom-field-type'
              value={customFieldForm.type || 'text'}
              onChange={(e) =>
                setCustomFieldForm({
                  ...customFieldForm,
                  type: e.target.value as FieldDefinition['type'],
                  options: e.target.value === 'select' ? [] : undefined,
                })
              }
              aria-label={t('settings.custom.type')}
              className='w-full px-4 py-3 border border-input rounded focus:ring-2 focus:ring-ring focus:border-ring bg-background text-foreground transition-all'
            >
              <option value='text'>{t('settings.custom.types.text')}</option>
              <option value='date'>{t('settings.custom.types.date')}</option>
              <option value='number'>{t('settings.custom.types.number')}</option>
              <option value='select'>{t('settings.custom.types.select')}</option>
              <option value='checkbox'>{t('settings.custom.types.checkbox')}</option>
              <option value='url'>{t('settings.custom.types.url')}</option>
            </select>
          </div>

          {customFieldForm.type === 'select' && (
            <div className='sm:col-span-2'>
              <label htmlFor='custom-field-options' className='block text-sm font-bold text-muted-foreground mb-2'>
                {t('settings.custom.options')}
              </label>
              <textarea
                id='custom-field-options'
                value={(customFieldForm.options || []).join('\n')}
                onChange={(e) =>
                  setCustomFieldForm({
                    ...customFieldForm,
                    options: e.target.value.split('\n').filter((opt) => opt.trim()),
                  })
                }
                placeholder='Remote&#10;Hybrid&#10;On-site'
                rows={4}
                aria-label={t('settings.custom.options')}
                className='w-full px-4 py-3 border border-input rounded focus:ring-2 focus:ring-ring focus:border-ring bg-background text-foreground transition-all'
              />
              <p className='text-xs text-muted-foreground mt-2 italic'>
                {t('settings.custom.optionsDesc')}
              </p>
            </div>
          )}

          <div className='sm:col-span-2'>
            <label htmlFor='required-field' className='flex items-center gap-3 cursor-pointer group'>
              <input
                type='checkbox'
                id='required-field'
                name='required-field'
                checked={customFieldForm.required || false}
                onChange={(e) =>
                  setCustomFieldForm({ ...customFieldForm, required: e.target.checked })
                }
                aria-label={t('settings.custom.required')}
                className='size-5 text-primary border-input rounded focus:ring-ring transition-all cursor-pointer'
              />
              <span className='text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors'>
                {t('settings.custom.required')}
              </span>
            </label>
          </div>
        </div>

        <div className='mt-8 flex gap-3'>
          {editingCustomField ? (
            <>
              <Button
                variant='primary'
                size='md'
                onClick={onUpdateCustomField}
                disabled={!customFieldForm.label}
                className='px-6 py-2.5 font-bold'
              >
                {t('settings.custom.update')}
              </Button>
              <Button
                variant='outline'
                size='md'
                onClick={onCancelEdit}
                className='px-6 py-2.5 font-bold text-muted-foreground hover:text-foreground'
              >
                {t('common.cancel')}
              </Button>
            </>
          ) : (
            <Button
              variant='primary'
              size='md'
              onClick={onAddCustomField}
              disabled={!customFieldForm.label || (customFieldForm.type === 'select' && (!customFieldForm.options || customFieldForm.options.length === 0))}
              className='px-6 py-2.5 font-bold'
            >
              {t('settings.custom.addField')}
            </Button>
          )}
        </div>
      </div>

      {/* List Section */}
      <div className='space-y-4'>
        <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1'>
          {t('settings.custom.title')}
        </h3>

        {customFields && customFields.length > 0 ? (
          <div className='grid grid-cols-1 gap-4'>
            {customFields.map((field) => (
              <div
                key={field.id}
                className='flex items-center justify-between p-5 bg-card border border-border rounded hover:border-primary/30 transition-all group'
              >
                <div className='flex flex-col'>
                  <div className='flex items-center gap-2'>
                    <span className='font-bold text-foreground'>{field.label}</span>
                    <span className='inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/5 text-primary dark:bg-primary/10 dark:text-primary/80 border border-primary/20'>
                      {field.type}
                    </span>
                    {field.required && (
                      <span className='inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-destructive/5 text-destructive dark:bg-destructive/10 dark:text-destructive/80 border border-destructive/20'>
                        {t('settings.custom.required')}
                      </span>
                    )}
                  </div>
                  {field.options && field.options.length > 0 && (
                    <div className='text-xs text-muted-foreground mt-2 flex gap-1 flex-wrap'>
                      {field.options.map((opt, i) => (
                        <span key={`${opt}-${i}`} className='px-1.5 py-0.5 bg-muted/30 rounded border border-border'>
                          {opt}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className='flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => onEditCustomField(field)}
                    aria-label={t('common.edit')}
                    className='text-primary hover:bg-primary/5 dark:hover:bg-primary/10'
                  >
                    <svg xmlns='http://www.w3.org/2000/svg' className='size-5' viewBox='0 0 20 20' fill='currentColor'>
                      <path d='M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z' />
                    </svg>
                  </Button>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => onDeleteCustomField(field.id)}
                    aria-label={t('common.delete')}
                    className='text-destructive hover:bg-destructive/5 dark:hover:bg-destructive/10'
                  >
                    <svg xmlns='http://www.w3.org/2000/svg' className='size-5' viewBox='0 0 20 20' fill='currentColor'>
                      <path fillRule='evenodd' d='M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z' clipRule='evenodd' />
                    </svg>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='text-center py-12 bg-muted/50 rounded border-2 border-dashed border-border'>
            <p className='text-sm text-muted-foreground'>{t('settings.custom.noCustom')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomFieldsSettings;