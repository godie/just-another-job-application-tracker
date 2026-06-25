import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';

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
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onSetSheet}
          disabled={isSettingSheet || !sheetIdInput.trim()}
        >
          {isSettingSheet ? t('sheets.setting') : t('sheets.set')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSettingSheet}
        >
          {t('common.cancel')}
        </Button>
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
