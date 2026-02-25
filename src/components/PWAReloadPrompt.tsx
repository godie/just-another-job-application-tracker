import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const PWAReloadPrompt: React.FC = () => {
  const sw = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error: any) {
      console.log('SW registration error', error);
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
    <div className="fixed bottom-20 right-4 z-50 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-indigo-100 dark:border-indigo-900 flex flex-col gap-3 max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-start gap-3">
        <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-full">
          <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
            {offlineReady ? 'App ready to work offline' : 'Update available!'}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {offlineReady ? 'The app has been cached and is ready for offline use.' : 'A new version of JAJAT is available. Update now to get the latest features.'}
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={close}
          className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          Dismiss
        </button>
        {needUpdate && (
          <button
            onClick={() => updateServiceWorker(true)}
            className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm"
          >
            Update
          </button>
        )}
      </div>
    </div>
  );
};

export default PWAReloadPrompt;
