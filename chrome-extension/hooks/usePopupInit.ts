import { useEffect, useCallback } from 'react';
import { Action } from '../reducer';
import { JobOpportunity } from '../components/PopupForm';

interface UsePopupInitProps {
  dispatch: React.Dispatch<Action>;
  isJobBoardDomain: (url: string | undefined) => boolean;
  isWebAppDomain: (url: string | undefined) => boolean;
}

export function usePopupInit({ dispatch, isJobBoardDomain, isWebAppDomain }: UsePopupInitProps) {
  const handleExtractedData = useCallback((data: Partial<JobOpportunity>) => {
    dispatch({ type: 'SET_DATA_EXTRACTED', payload: data });
    if (data.position || data.company) {
      setTimeout(() => dispatch({ type: 'SET_MESSAGE', payload: null }), 3000);
    }
  }, [dispatch]);

  const init = useCallback(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      const url = currentTab?.url || '';

      const isJobBoard = isJobBoardDomain(url);
      const isWebApp = isWebAppDomain(url);

      if (currentTab?.id && isJobBoard && !isWebApp) {
        dispatch({ type: 'INIT_TAB_DATA', payload: { link: url } });

        chrome.tabs.sendMessage(currentTab.id, { action: 'getJobData' }, (response) => {
          if (chrome.runtime.lastError) {
            if (chrome.runtime.lastError.message?.includes('Could not establish connection')) {
              setTimeout(() => {
                chrome.tabs.sendMessage(currentTab.id!, { action: 'getJobData' }, (retryResponse) => {
                  if (!chrome.runtime.lastError && retryResponse?.data) {
                    handleExtractedData(retryResponse.data);
                  } else {
                    dispatch({ type: 'SET_LOADING', payload: false });
                  }
                });
              }, 500);
              return;
            }
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
          }

          if (response && response.data) {
            handleExtractedData(response.data);
          } else {
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        });
      } else {
        if (isWebApp && currentTab?.id) {
          dispatch({ type: 'INIT_TAB_DATA', payload: { link: url, isLoading: false } });
          chrome.tabs.sendMessage(currentTab.id, {
            action: 'syncFromChromeStorage',
          }).catch(() => {});
        } else if (!isJobBoard && url) {
          dispatch({
            type: 'INIT_TAB_DATA',
            payload: {
              link: url,
              isLoading: false,
              message: { type: 'info', text: 'Navigate to a job posting page (LinkedIn, Greenhouse, etc.) to auto-fill the form.' }
            }
          });
          setTimeout(() => dispatch({ type: 'SET_MESSAGE', payload: null }), 3000);
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      }
    });
  }, [dispatch, isJobBoardDomain, isWebAppDomain, handleExtractedData]);

  useEffect(() => {
    init();
  }, [init]);
}
