import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { type JobOpportunity } from '../types/opportunities';
import { sanitizeUrl } from '../utils/url';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface OpportunitiesTableProps {
  opportunities: JobOpportunity[];
  filteredOpportunities: JobOpportunity[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onApply: (opportunity: JobOpportunity) => void;
  onDelete: (opportunity: JobOpportunity) => void;
  formatDate: (dateString?: string) => string;
}

const OpportunitiesTable: React.FC<OpportunitiesTableProps> = ({
  opportunities,
  filteredOpportunities,
  searchTerm,
  onSearchChange,
  onApply,
  onDelete,
  formatDate,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div className='mb-4'>
        <Input
          type='text'
          placeholder={t('opportunities.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label={t('opportunities.searchPlaceholder')}
          className='w-full sm:w-64'
        />
        <p className='text-xs text-muted-foreground mt-2'>
          <Trans
            i18nKey='opportunities.showing'
            values={{ count: filteredOpportunities.length, total: opportunities.length }}
            components={{ bold: <span className='font-semibold text-foreground' /> }}
          />
        </p>
      </div>

      <div className='bg-card rounded overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-border'>
            <thead className='bg-muted'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                  {t('opportunities.table.position')}
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                  {t('opportunities.table.company')}
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                  {t('opportunities.table.location')}
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                  {t('opportunities.table.jobType')}
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                  {t('opportunities.table.posted')}
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                  {t('opportunities.table.captured')}
                </th>
                <th className='px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                  {t('opportunities.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody className='bg-card divide-y divide-border'>
              {filteredOpportunities.map((opp) => (
                <tr key={opp.id} className='hover:bg-accent/50'>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div className='text-sm font-medium text-foreground'>{opp.position}</div>
                    {opp.salary && (
                      <div className='text-xs text-muted-foreground'>{opp.salary}</div>
                    )}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div className='text-sm text-foreground'>{opp.company}</div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div className='text-sm text-muted-foreground'>{opp.location || 'N/A'}</div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <Badge variant='secondary'>
                      {opp.jobType || 'N/A'}
                    </Badge>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-muted-foreground'>
                    {formatDate(opp.postedDate)}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-muted-foreground'>
                    {formatDate(opp.capturedDate)}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                    <div className='flex justify-end gap-2'>
                      <a
                        href={sanitizeUrl(opp.link)}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-primary hover:text-primary/80'
                        title={t('opportunities.actions.view')}
                      >
                        {t('opportunities.actions.view')}
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onApply(opp)}
                        className='text-green-600 hover:text-green-700 font-semibold'
                      >
                        {t('opportunities.actions.apply')}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(opp)}
                        className='text-destructive hover:text-destructive/80'
                      >
                        {t('common.delete')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default OpportunitiesTable;