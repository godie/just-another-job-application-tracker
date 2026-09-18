import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ScanAuditRow } from '../mails/types';
import { EMAIL_EVENT_TYPES, type EmailEventType } from '../utils/emailClassification';
import {
  REJECTION_KINDS,
  type AuditLabel,
  type RejectionKind,
} from '../utils/scanAudit';

interface EmailScanAuditLabelCellProps {
  subject: string;
  label: AuditLabel;
  effectiveType: string;
  extraction: ScanAuditRow['extraction'];
  onLabel: (patch: Partial<AuditLabel>) => void;
  onCorrectField: (patch: Partial<AuditLabel>) => void;
}

/**
 * The reviewer's correction form for one email. A field edit is a correction;
 * a note or a rejection kind is not. It never finishes the row: only the
 * Correct/Wrong buttons do, otherwise the row would jump to the reviewed tab
 * in the middle of an edit.
 */
export const EmailScanAuditLabelCell: React.FC<EmailScanAuditLabelCellProps> = ({
  subject,
  label,
  effectiveType,
  extraction,
  onLabel,
  onCorrectField,
}) => {
  const { t } = useTranslation();
  const field = 'mt-1 w-full text-xs rounded border border-border bg-background text-foreground p-1.5';

  return (
    <td className="p-2">
      <div className="flex flex-col gap-2 min-w-48">
        <label className="text-xs text-muted-foreground">
          {t('settings.emailScan.audit.fields.eventType')}
          <select
            value={effectiveType}
            aria-label={`${t('settings.emailScan.audit.fields.eventType')} — ${subject}`}
            onChange={(event) =>
              onCorrectField({
                eventType: (event.target.value || undefined) as EmailEventType | undefined,
              })
            }
            className={field}
          >
            <option value="">{t('settings.emailScan.audit.fields.unset')}</option>
            {EMAIL_EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`settings.emailScan.audit.eventTypes.${type}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          {t('settings.emailScan.audit.fields.position')}
          <input
            type="text"
            value={label.position ?? ''}
            placeholder={extraction.position ?? ''}
            aria-label={`${t('settings.emailScan.audit.fields.position')} — ${subject}`}
            onChange={(event) => onCorrectField({ position: event.target.value })}
            className={field}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          {t('settings.emailScan.audit.fields.company')}
          <input
            type="text"
            value={label.company ?? ''}
            placeholder={extraction.company ?? ''}
            aria-label={`${t('settings.emailScan.audit.fields.company')} — ${subject}`}
            onChange={(event) => onCorrectField({ company: event.target.value })}
            className={field}
          />
        </label>
        {effectiveType === 'rejected' && (
          <label className="text-xs text-muted-foreground">
            {t('settings.emailScan.audit.fields.rejectionKind')}
            <select
              value={label.rejectionKind ?? ''}
              aria-label={`${t('settings.emailScan.audit.fields.rejectionKind')} — ${subject}`}
              onChange={(event) =>
                onLabel({
                  rejectionKind: (event.target.value || undefined) as RejectionKind | undefined,
                })
              }
              className={field}
            >
              <option value="">{t('settings.emailScan.audit.fields.unset')}</option>
              {REJECTION_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {t(`settings.emailScan.audit.rejectionKinds.${kind}`)}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-xs text-muted-foreground">
          {t('settings.emailScan.audit.fields.note')}
          <input
            type="text"
            value={label.note ?? ''}
            aria-label={`${t('settings.emailScan.audit.fields.note')} — ${subject}`}
            onChange={(event) => onLabel({ note: event.target.value })}
            className={field}
          />
        </label>
      </div>
    </td>
  );
};
