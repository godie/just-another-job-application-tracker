import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft, FaSync } from 'react-icons/fa';
import { Card, Button } from '../components/ui';
import { useAlert } from '../components/AlertProvider';
import { type PageType } from '../App';

const API_BASE_URL =
  import.meta.env.VITE_SUPPORT_API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  '/api';

interface Suggestion {
  id: number;
  types: string[];
  explanation: string;
  created_at: string;
  ip_address: string;
}

interface SuggestionsViewerPageProps {
  onNavigate: (page: PageType) => void;
}

const SuggestionsViewerPage: React.FC<SuggestionsViewerPageProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { showError } = useAlert();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/suggestions`, {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch suggestions');
      }

      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      showError(error instanceof Error ? error.message : 'Error fetching suggestions');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void fetchSuggestions();
  }, [fetchSuggestions]);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 pb-24">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => onNavigate('support')}
            className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline mb-2 cursor-pointer"
          >
            <FaArrowLeft size={14} />
            <span>{t('support.suggestionsViewer.back')}</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{t('support.suggestionsViewer.title')}</h1>
        </div>
        <Button
          onClick={() => void fetchSuggestions()}
          variant="outline"
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <FaSync className={isLoading ? 'animate-spin' : ''} />
          {t('common.refresh')}
        </Button>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : suggestions.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">{t('support.suggestionsViewer.noSuggestions')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id} className="p-6">
              <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                <div className="flex flex-wrap gap-2">
                  {suggestion.types.map((type) => (
                    <span
                      key={type}
                      className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-full"
                    >
                      {t(`support.types.${type}`, { defaultValue: type })}
                    </span>
                  ))}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-col items-end">
                  <span>{new Date(suggestion.created_at).toLocaleString()}</span>
                  <span>{suggestion.ip_address}</span>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{suggestion.explanation}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuggestionsViewerPage;
