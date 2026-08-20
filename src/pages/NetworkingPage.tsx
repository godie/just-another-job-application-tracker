import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '../components/ui/PageHeader';
import { ContactList } from '../components/networking/ContactList';
import { FollowUpList } from '../components/networking/FollowUpList';
import { useNetworkingStore } from '../stores/networkingStore';
import { type PageType } from '../App';

interface NetworkingPageProps {
  // Kept in the render interface for parity with the rest of `PageType` so
  // future cross-page deep links (e.g. "open contact in applications view") can
  // wire through. Optional — not consumed by the local-only dashboard yet.
  onNavigate?: (page: PageType) => void;
}

const NetworkingPage: React.FC<NetworkingPageProps> = () => {
  const { t } = useTranslation();
  const [now, setNow] = useState<Date>(() => new Date());
  const contacts = useNetworkingStore((s) => s.contacts);
  const followUpTasks = useNetworkingStore((s) => s.followUpTasks);
  const load = useNetworkingStore((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const isEmpty = contacts.length === 0 && followUpTasks.length === 0;

  return (
    <section aria-labelledby='networking-title' data-testid='networking-page'>
      <PageHeader title={t('networking.title')} description={t('networking.intro')} />
      <div className='space-y-6'>
        {isEmpty && (
          <div
            className='rounded-lg border border-dashed border-border p-8 text-center bg-card'
            data-testid='networking-empty-state'
          >
            <h2 className='text-lg font-semibold mb-2'>{t('networking.empty.title')}</h2>
            <p className='text-sm text-muted-foreground mb-4 max-w-prose mx-auto'>
              {t('networking.empty.description')}
            </p>
            <ContactList />
          </div>
        )}
        {followUpTasks.length > 0 && <FollowUpList now={now} />}
        {contacts.length > 0 && (
          <div>
            <h2 className='text-lg font-semibold mb-3'>{t('nav.networking')}</h2>
            <ContactList />
          </div>
        )}
      </div>
    </section>
  );
};

export default NetworkingPage;
