// chrome-extension/popup.tsx
/* eslint-disable react-refresh/only-export-components */
import React, { useReducer, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import './popup.css';
import PopupHeader from './components/PopupHeader';
import PopupMessage from './components/PopupMessage';
import PopupLoader from './components/PopupLoader';
import PopupForm, { type JobOpportunity } from './components/PopupForm';
import { reducer, initialState } from './reducer';
import { usePopupInit } from './hooks/usePopupInit';

const Popup: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { opportunity, saveAsApplication, isLoading, isSaving, message } = state;

  // Helper function to check if we're on a job board domain
  const isJobBoardDomain = useCallback((url: string | undefined): boolean => {
    if (!url) return false;
    const jobBoardPatterns = [
      'linkedin.com/jobs',
      'greenhouse.io',
      'ashbyhq.com',
      'lever.co',
      'workable.com',
      'indeed.com',
      'glassdoor.com',
      'monster.com',
      'ziprecruiter.com',
      'dice.com',
      'stackoverflow.com/jobs',
      'angel.co/jobs',
      'builtin.com',
    ];
    return jobBoardPatterns.some(pattern => url.includes(pattern));
  }, []);

  // Helper function to check if we're on the web app domain
  const isWebAppDomain = useCallback((url: string | undefined): boolean => {
    if (!url) return false;
    return url.includes('localhost') || 
           url.includes('jajat.godieboy.com') || 
           url.includes('127.0.0.1') ||
           url.includes('job-application-tracker');
  }, []);

  usePopupInit({ dispatch, isJobBoardDomain, isWebAppDomain });

  const handleInputChange = (field: keyof JobOpportunity, value: string) => {
    dispatch({ type: 'SET_OPPORTUNITY', payload: { [field]: value } });
    dispatch({ type: 'SET_MESSAGE', payload: null });
  };

  const handleSave = async () => {
    if (!opportunity.position.trim() || !opportunity.company.trim() || !opportunity.link.trim()) {
      dispatch({ type: 'SET_MESSAGE', payload: { type: 'error', text: 'Please fill in Position, Company, and Link fields' } });
      return;
    }

    dispatch({ type: 'SET_SAVING', payload: true });
    dispatch({ type: 'SET_MESSAGE', payload: null });

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const capturedDate = new Date().toISOString();

    try {
      if (saveAsApplication) {
        const applicationPayload = {
          id,
          ...opportunity,
          capturedDate,
        };

        const result = await chrome.storage.local.get(['pendingApplications']);
        const pending = result.pendingApplications || [];
        pending.push(applicationPayload);
        await chrome.storage.local.set({ pendingApplications: pending });

        let syncedToTab = false;
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
          if (tab.url && isWebAppDomain(tab.url) && tab.id) {
            try {
              await chrome.tabs.sendMessage(tab.id, {
                action: 'syncApplication',
                data: applicationPayload,
              });
              syncedToTab = true;
            } catch {
              // Content script may not be ready
            }
          }
        }

        if (syncedToTab && pending.length > 0) {
          const remaining = pending.filter((p: { id: string }) => p.id !== id);
          await chrome.storage.local.set({ pendingApplications: remaining });
        }

        dispatch({ type: 'SET_MESSAGE', payload: { type: 'success', text: 'Application saved! It will appear in Applications.' } });
      } else {
        const result = await chrome.storage.local.get(['jobOpportunities']);
        const existing = result.jobOpportunities || [];

        const newOpportunity = {
          ...opportunity,
          id,
          capturedDate,
        };
        existing.push(newOpportunity);
        await chrome.storage.local.set({ jobOpportunities: existing });

        try {
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
              if (tab.url && isWebAppDomain(tab.url) && tab.id) {
                chrome.tabs.sendMessage(tab.id, {
                  action: 'syncOpportunity',
                  data: newOpportunity,
                }).then(() => {
                  chrome.tabs.sendMessage(tab.id!, { action: 'syncFromChromeStorage' }).catch(() => {});
                }).catch(() => {
                  chrome.tabs.sendMessage(tab.id!, { action: 'syncFromChromeStorage' }).catch(() => {});
                });
              }
            });
          });
        } catch (error) {
          console.error('Error syncing to web app:', error);
        }

        dispatch({ type: 'SET_MESSAGE', payload: { type: 'success', text: 'Opportunity saved successfully!' } });
      }

      setTimeout(() => {
        dispatch({ type: 'RESET_FORM' });
      }, 1500);
    } catch (error) {
      console.error('Error saving:', error);
      dispatch({ type: 'SET_MESSAGE', payload: { type: 'error', text: 'Failed to save. Please try again.' } });
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  };

  const handleOpenApp = () => {
    chrome.tabs.create({ url: 'http://jajat.godieboy.com' });
  };

  if (isLoading) {
    return <PopupLoader />;
  }

  return (
    <div className="p-4 bg-gray-50 min-h-[400px]">
      <PopupHeader />
      <PopupMessage message={message} />
      <PopupForm
        opportunity={opportunity}
        saveAsApplication={saveAsApplication}
        isSaving={isSaving}
        onInputChange={handleInputChange}
        onSaveAsApplicationChange={(checked) => dispatch({ type: 'SET_SAVE_AS_APPLICATION', payload: checked })}
        onSave={handleSave}
        onOpenApp={handleOpenApp}
      />
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <Popup />
    </React.StrictMode>
  );
}
