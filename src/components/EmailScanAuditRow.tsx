import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ScanAuditRow } from '../mails/types';
import type { LocalClassification } from '../mails/services/localReclassify';
import { effectiveEventType, type AuditLabel } from '../utils/scanAudit';
import { Button } from './ui/Button';
import { EmailScanAuditLabelCell } from './EmailScanAuditLabelCell';

interface EmailScanAuditRowProps {
  row: ScanAuditRow;
  label: AuditLabel;
  /** Result of the keyless pass for this row, when it has been run. */
  local: LocalClassification | null;
  hasLocal: boolean;
  onLabel: (patch: Partial<AuditLabel>) => void;
  onCorrectField: (patch: Partial<AuditLabel>) => void;
  onMark: (correct: boolean) => void;
}

const OUTCOME_CLASSES: Record<ScanAuditRow['outcome'], string> = {
  addition: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  update: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  skipped: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
  no_event: 'bg-muted text-muted-foreground',
};

/**
 * One audited email: what the pipeline decided, what the keyless pass reads,
 * and the reviewer's label. Kept in its own file so the table component stays
 * about lists, tabs and exports.
 */
export const EmailScanAuditRow: React.FC<EmailScanAuditRowProps> = ({
  row,
  label,
  local,
  hasLocal,
  onLabel,
  onCorrectField,
  onMark,
}) => {
  const { t } = useTranslation();
  const effectiveType = label.eventType ?? effectiveEventType(row) ?? '';
  const effective = effectiveEventType(row);
  const markedCorrect = Boolean(label.reviewed && label.correct === true);
  const markedWrong = Boolean(label.reviewed && label.correct === false);

  return (
    <tr className="border-t border-border align-top">
      <td className="p-2 max-w-xs">
        <p className="font-medium text-foreground break-words">{row.subject}</p>
        <p className="text-xs text-muted-foreground break-all">{row.from}</p>
        <p className="text-xs text-muted-foreground">{row.date.split('T')[0]}</p>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-3 break-words">
          {row.body.slice(0, 240)}
        </p>
      </td>
      <td className="p-2 whitespace-nowrap">
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            OUTCOME_CLASSES[row.outcome]
          }`}
        >
          {t(`settings.emailScan.audit.outcomes.${row.outcome}`)}
        </span>
        <p
          className="text-xs text-muted-foreground mt-1"
          data-testid={`audit-pipeline-${row.emailId}`}
        >
          {effective
            ? t(`settings.emailScan.audit.eventTypes.${effective}`)
            : t('settings.emailScan.audit.noClassification')}
          {row.effectiveEvent &&
            ` · ${t(`settings.emailScan.audit.sources.${row.effectiveEvent.source}`)}`}
          {row.classification && ` · ${row.classification.confidence.toFixed(2)}`}
        </p>
        <p className="text-xs text-foreground mt-1">
          {row.extraction.position ?? t('settings.emailScan.audit.unknown')}
          <span className="text-muted-foreground"> @ </span>
          {row.extraction.company ?? t('settings.emailScan.audit.unknown')}
        </p>
        {hasLocal && (
          <p className="text-xs mt-1" data-testid={`audit-local-${row.emailId}`}>
            {local
              ? t(
                  local.type === effective
                    ? 'settings.emailScan.audit.localAgrees'
                    : 'settings.emailScan.audit.localDiffers',
                  { type: t(`settings.emailScan.audit.eventTypes.${local.type}`) },
                )
              : t('settings.emailScan.audit.localNone')}
          </p>
        )}
        <div className="flex gap-1 mt-2">
          <Button
            type="button"
            size="sm"
            variant={markedCorrect ? 'primary' : 'outline'}
            onClick={() => onMark(true)}
            aria-pressed={markedCorrect}
            data-testid={`audit-correct-${row.emailId}`}
          >
            {t('settings.emailScan.audit.actions.correct')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={markedWrong ? 'danger' : 'outline'}
            onClick={() => onMark(false)}
            aria-pressed={markedWrong}
            data-testid={`audit-incorrect-${row.emailId}`}
          >
            {t('settings.emailScan.audit.actions.incorrect')}
          </Button>
        </div>
      </td>
      <EmailScanAuditLabelCell
        subject={row.subject}
        label={label}
        effectiveType={effectiveType}
        extraction={row.extraction}
        onLabel={onLabel}
        onCorrectField={onCorrectField}
      />
    </tr>
  );
};
