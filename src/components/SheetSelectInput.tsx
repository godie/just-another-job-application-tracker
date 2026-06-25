import React from 'react';
import { useTranslation } from 'react-i18next';

interface SheetSelectInputProps {
  sheetIdInput: string;
  onSheetIdInputChange: (value: string) => void;
  isSettingSheet: boolean;
  onSetSheet: () => void;
  onCancel: () => void;
}

export const SheetSelectInput: React.FC<SheetSelectInputProps> = ({
  sheetIdInput,
  onSheetIdInputChange,
  isSettingSheet,
  onSetSheet,
  onCancel,
}) => {
  const { t } = useTranslation();

  return (
    <div className="mt-4 p-4 bg-muted rounded-lg">
      <h4 className="text-sm font-semibold text-foreground mb-2">
        {t('sheets.selectTitle')}
      </h4>
      <p className="text-xs text-muted-foreground mb-3">
        {t('sheets.selectDesc')}
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={sheetIdInput}
          onChange={(e) => onSheetIdInputChange(e.target.value)}
          placeholder={t('sheets.placeholder')}
          aria-label={t('sheets.placeholder')}
          className="flex-1 px-3 py-2 border border-border rounded text-sm focus:ring-2 focus:ring-ring focus:border-ring bg-card text-foreground"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSetSheet();
            } else if (e.key === 'Escape') {
              onCancel();
            }
          }}
        />
        <button
          onClick={onSetSheet}
          disabled={isSettingSheet || !sheetIdInput.trim()}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            isSettingSheet || !sheetIdInput.trim()
              ? 'bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground cursor-not-allowed'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground'
          }`}
          type="button"
        >
          {isSettingSheet ? t('sheets.setting') : t('sheets.set')}
        </button>
        <button
          onClick={onCancel}
          disabled={isSettingSheet}
          className="px-4 py-2 rounded font-medium text-sm bg-card hover:bg-muted text-foreground border border-border transition-colors"
          type="button"
        >
          {t('common.cancel')}
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Example:{' '}
        <code className="bg-muted px-1 rounded">1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms</code>
        <br />
        Or:{' '}
        <code className="bg-muted px-1 rounded">https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms</code>
      </p>
    </div>
  );
};

export default SheetSelectInput;
