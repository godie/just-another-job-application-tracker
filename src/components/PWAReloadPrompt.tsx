import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './ui/Button';

const PWAReloadPrompt: React.FC = () => {
  const sw = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.info('[PWA] Service Worker registered:', r);
    },
    onRegisterError(error: Error) {
      console.error('[PWA] Service Worker registration error:', error);
    },
  });

  if (!sw || !sw.offlineReady || !sw.needUpdate) return null;

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needUpdate: [needUpdate, setNeedUpdate],
    updateServiceWorker,
  } = sw;

  const close = () => {
    setOfflineReady(false);
    setNeedUpdate(false);
  };

  if (!offlineReady && !needUpdate) return null;

  return (
    <div className='fixed bottom-20 right-4 z-50 p-4 bg-card rounded-lg border border-border shadow-lg flex flex-col gap-3 max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300'>
      <div className='flex items-start gap-3'>
        <div className='bg-primary/5 dark:bg-primary/10 p-2 rounded-full'>
          <svg className='size-5 text-primary' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
          </svg>
        </div>
        <div>
          <h4 className='text-sm font-semibold text-foreground'>
            {offlineReady ? 'App ready to work offline' : 'Update available!'}
          </h4>
          <p className='text-xs text-muted-foreground mt-1'>
            {offlineReady ? 'The app has been cached and is ready for offline use.' : 'A new version of JAJAT is available. Update now to get the latest features.'}
          </p>
        </div>
      </div>
      <div className='flex justify-end gap-2'>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={close}
          className='text-muted-foreground'
        >
          Dismiss
        </Button>
        {needUpdate && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => updateServiceWorker(true)}
          >
            Update
          </Button>
        )}
      </div>
    </div>
  );
};

export default PWAReloadPrompt;