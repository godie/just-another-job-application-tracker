import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { type JobOpportunity, sanitizeUrl } from '../utils/localStorage';

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
      <div className="mb-4">
        <input
          type="text"
          placeholder={t('opportunities.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full sm:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          <Trans
            i18nKey="opportunities.showing"
            values={{ count: filteredOpportunities.length, total: opportunities.length }}
            components={{ bold: <span className="font-semibold text-gray-700 dark:text-gray-300" /> }}
          />
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('opportunities.table.position')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('opportunities.table.company')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('opportunities.table.location')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('opportunities.table.jobType')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('opportunities.table.posted')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('opportunities.table.captured')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('opportunities.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredOpportunities.map((opp) => (
                <tr key={opp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{opp.position}</div>
                    {opp.salary && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">{opp.salary}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{opp.company}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 dark:text-gray-400">{opp.location || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {opp.jobType || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(opp.postedDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(opp.capturedDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <a
                        href={sanitizeUrl(opp.link)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                        title={t('opportunities.actions.view')}
                      >
                        {t('opportunities.actions.view')}
                      </a>
                      <button
                        onClick={() => onApply(opp)}
                        className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 font-semibold"
                      >
                        {t('opportunities.actions.apply')}
                      </button>
                      <button
                        onClick={() => onDelete(opp)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      >
                        {t('common.delete')}
                      </button>
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
