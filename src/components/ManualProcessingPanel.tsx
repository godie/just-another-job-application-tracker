import React from 'react';
import { useTranslation } from 'react-i18next';
import { CHATBOTS } from '../utils/constants';
import type { Email } from '../mails/types';
import { useFormatDate } from '../hooks/useFormatDate';
import { Button } from './ui/Button';

interface ManualProcessingPanelProps {
  preview: { emails: Email[] } | null;
  snippetLength: number;
  setSnippetLength: (length: number) => void;
  processingMode: 'manual' | 'api';
  setProcessingMode: (mode: 'manual' | 'api') => void;
  selectedEmailIds: {
    isSelected: (id: string) => boolean;
    toggle: (id: string) => void;
    selectAll: (ids: string[]) => void;
    size: number;
  };
  enabledChatbots: string[];
  geminiProcessing: boolean;
  pastedJson: string;
  setPastedJson: (json: string) => void;
  onGeneratePrompt: (chatbot?: { id: string; name: string; url: string }) => void;
  onProcessWithGemini: () => void;
  onProcessJson: () => void;
}

const ModeToggle: React.FC<{
  processingMode: 'manual' | 'api';
  setProcessingMode: (mode: 'manual' | 'api') => void;
}> = ({ processingMode, setProcessingMode }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 bg-muted rounded-lg p-1 w-fit">
      <Button
        onClick={() => setProcessingMode('manual')}
        type="button"
        variant={processingMode === 'manual' ? 'outline' : 'ghost'}
        size="sm"
        className="text-sm"
      >
        {t('settings.emailScan.processingModes.manual')}
      </Button>
      <Button
        onClick={() => setProcessingMode('api')}
        type="button"
        variant={processingMode === 'api' ? 'outline' : 'ghost'}
        size="sm"
        className="text-sm"
      >
        {t('settings.emailScan.processingModes.api')}
      </Button>
    </div>
  );
};

const SnippetLengthInput: React.FC<{
  snippetLength: number;
  setSnippetLength: (length: number) => void;
}> = ({ snippetLength, setSnippetLength }) => {
  const { t } = useTranslation();
  return (
    <div>
      <label htmlFor="snippetLength" className="block text-sm font-medium text-foreground mb-1">
        {t('settings.emailScan.snippetLength')}
      </label>
      <input
        type="number"
        id="snippetLength"
        value={snippetLength}
        onChange={(e) => setSnippetLength(parseInt(e.target.value) || 200)}
        aria-label={t('settings.emailScan.snippetLength')}
        className="w-full px-3 py-2 border border-input rounded bg-background text-sm"
      />
    </div>
  );
};

const ManualPromptButtons: React.FC<{
  selectedEmailIdsSize: number;
  enabledChatbots: string[];
  onGeneratePrompt: (chatbot?: { id: string; name: string; url: string }) => void;
}> = ({ selectedEmailIdsSize, enabledChatbots, onGeneratePrompt }) => {
  const { t } = useTranslation();
  const enabledSet = new Set(enabledChatbots);
  const visibleChatbots = CHATBOTS.filter((cb) => enabledSet.has(cb.id));

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        {t('settings.emailScan.generatePrompt')}
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={() => onGeneratePrompt()}
          disabled={selectedEmailIdsSize === 0}
          className="text-primary hover:bg-primary/5 dark:hover:bg-primary/10 border-primary/20"
        >
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          {t('common.copy')}
        </Button>
        {visibleChatbots.map((chatbot) => (
          <Button
            type="button"
            key={chatbot.id}
            variant="primary"
            size="md"
            onClick={() => onGeneratePrompt(chatbot)}
            disabled={selectedEmailIdsSize === 0}
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            {t('settings.emailScan.copyAndOpen', { name: chatbot.name })}
          </Button>
        ))}
      </div>
    </div>
  );
};

const GeminiProcessButton: React.FC<{
  selectedEmailIdsSize: number;
  geminiProcessing: boolean;
  onProcessWithGemini: () => void;
}> = ({ selectedEmailIdsSize, geminiProcessing, onProcessWithGemini }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        {t('settings.emailScan.processWithGemini')}
      </label>
      <Button
        type="button"
        variant="danger"
        size="md"
        onClick={onProcessWithGemini}
        disabled={selectedEmailIdsSize === 0 || geminiProcessing}
      >
        {geminiProcessing ? (
          <>
            <svg className="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {t('settings.emailScan.geminiProcessing')}
          </>
        ) : (
          <>
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {t('settings.emailScan.processWithGeminiAction')}
          </>
        )}
      </Button>
    </div>
  );
};

const EmailList: React.FC<{
  emails: Email[];
  selectedEmailIds: ManualProcessingPanelProps['selectedEmailIds'];
  formatDate: (date: string) => string;
}> = ({ emails, selectedEmailIds, formatDate }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">
          {t('settings.emailScan.emailsFound', { count: emails.length })}
        </h4>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => selectedEmailIds.selectAll(emails.map((e) => e.id))}
          className="text-xs text-primary hover:underline hover:bg-transparent hover:text-primary h-auto px-0 py-0"
        >
          {t('settings.emailScan.selectAll')}
        </Button>
      </div>
      <div className="max-h-60 overflow-y-auto border border-border rounded divide-y divide-border bg-card">
        {emails.map((email) => (
          <div key={email.id} className="flex items-start gap-3 px-3 py-2 hover:bg-muted/50">
            <input
              type="checkbox"
              checked={selectedEmailIds.isSelected(email.id)}
              onChange={() => selectedEmailIds.toggle(email.id)}
              className="mt-1"
              aria-label={`Select email: ${email.subject}`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{email.subject}</p>
              <p className="text-xs text-muted-foreground truncate">{email.from}</p>
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDate(email.date)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const JsonPasteArea: React.FC<{
  pastedJson: string;
  setPastedJson: (json: string) => void;
  onProcessJson: () => void;
}> = ({ pastedJson, setPastedJson, onProcessJson }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-muted/50 rounded p-4 space-y-2 border border-border">
      <label className="block text-sm font-medium text-foreground">
        {t('settings.emailScan.pasteJson')}
      </label>
      <textarea
        value={pastedJson}
        onChange={(e) => setPastedJson(e.target.value)}
        aria-label={t('settings.emailScan.pasteJson')}
        className="w-full h-32 px-3 py-2 border border-border rounded bg-card text-sm font-mono"
        placeholder='{ "additions": [...], "updates": [...] }'
      />
      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={onProcessJson}
        disabled={!pastedJson.trim()}
        className="w-full"
      >
        {t('settings.emailScan.processJson')}
      </Button>
    </div>
  );
};

export const ManualProcessingPanel: React.FC<ManualProcessingPanelProps> = ({
  preview,
  snippetLength,
  setSnippetLength,
  processingMode,
  setProcessingMode,
  selectedEmailIds,
  enabledChatbots,
  geminiProcessing,
  pastedJson,
  setPastedJson,
  onGeneratePrompt,
  onProcessWithGemini,
  onProcessJson,
}) => {
  const { formatShortDate } = useFormatDate();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
      <ModeToggle processingMode={processingMode} setProcessingMode={setProcessingMode} />

      {preview && (
        <div className="bg-muted/50 rounded p-4 space-y-4 border border-border">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <SnippetLengthInput snippetLength={snippetLength} setSnippetLength={setSnippetLength} />
              </div>
            </div>

            {processingMode === 'manual' && (
              <ManualPromptButtons
                selectedEmailIdsSize={selectedEmailIds.size}
                enabledChatbots={enabledChatbots}
                onGeneratePrompt={onGeneratePrompt}
              />
            )}

            {processingMode === 'api' && (
              <GeminiProcessButton
                selectedEmailIdsSize={selectedEmailIds.size}
                geminiProcessing={geminiProcessing}
                onProcessWithGemini={onProcessWithGemini}
              />
            )}
          </div>

          <EmailList
            emails={preview.emails}
            selectedEmailIds={selectedEmailIds}
            formatDate={formatShortDate}
          />
        </div>
      )}

      <JsonPasteArea
        pastedJson={pastedJson}
        setPastedJson={setPastedJson}
        onProcessJson={onProcessJson}
      />
    </div>
  );
};

export default ManualProcessingPanel;
