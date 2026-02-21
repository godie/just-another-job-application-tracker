// chrome-extension/popup.tsx
/* eslint-disable react-refresh/only-export-components */
import React, { useEffect, useReducer } from 'react';
import { createRoot } from 'react-dom/client';
import './popup.css';
import PopupHeader from './components/PopupHeader';
import PopupMessage from './components/PopupMessage';
import PopupLoader from './components/PopupLoader';
import PopupForm, { type JobOpportunity } from './components/PopupForm';

interface State {
  opportunity: JobOpportunity;
  saveAsApplication: boolean;
  isLoading: boolean;
  isSaving: boolean;
  message: { type: 'success' | 'error' | 'info'; text: string } | null;
}

type Action =
  | { type: 'SET_OPPORTUNITY'; payload: Partial<JobOpportunity> }
  | { type: 'MERGE_OPPORTUNITY'; payload: Partial<JobOpportunity> }
  | { type: 'SET_SAVE_AS_APPLICATION'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_MESSAGE'; payload: { type: 'success' | 'error' | 'info'; text: string } | null }
  | { type: 'SET_DATA_EXTRACTED'; payload: Partial<JobOpportunity> }
  | { type: 'RESET_FORM' };

const initialState: State = {
  opportunity: {
    position: '',
    company: '',
    link: '',
    description: '',
    location: '',
    jobType: '',
    salary: '',
    postedDate: '',
  },
  saveAsApplication: false,
  isLoading: true,
  isSaving: false,
  message: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_OPPORTUNITY':
      return { ...state, opportunity: { ...state.opportunity, ...action.payload } };
    case 'MERGE_OPPORTUNITY':
      return {
        ...state,
        opportunity: {
          ...state.opportunity,
          position: action.payload.position || state.opportunity.position,
          company: action.payload.company || state.opportunity.company,
          description: action.payload.description || state.opportunity.description,
          location: action.payload.location || state.opportunity.location,
          jobType: action.payload.jobType || state.opportunity.jobType,
          salary: action.payload.salary || state.opportunity.salary,
          postedDate: action.payload.postedDate || state.opportunity.postedDate,
          link: action.payload.link || state.opportunity.link,
        },
      };
    case 'SET_SAVE_AS_APPLICATION':
      return { ...state, saveAsApplication: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };
    case 'SET_MESSAGE':
      return { ...state, message: action.payload };
    case 'SET_DATA_EXTRACTED':
      return {
        ...state,
        isLoading: false,
        opportunity: { ...state.opportunity, ...action.payload },
        message: (action.payload.position || action.payload.company)
          ? { type: 'success', text: 'Job data extracted automatically!' }
          : state.message,
      };
    case 'RESET_FORM':
      return {
        ...state,
        opportunity: initialState.opportunity,
        saveAsApplication: false,
        message: null,
      };
    default:
      return state;
  }
}

const Popup: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { opportunity, saveAsApplication, isLoading, isSaving, message } = state;

  // Helper function to check if we're on a job board domain
  const isJobBoardDomain = (url: string | undefined): boolean => {
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
  };

  // Helper function to check if we're on the web app domain
  const isWebAppDomain = (url: string | undefined): boolean => {
    if (!url) return false;
    return url.includes('localhost') || 
           url.includes('jajat.godieboy.com') || 
           url.includes('127.0.0.1') ||
           url.includes('job-application-tracker');
  };

  useEffect(() => {
    // Get current tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (currentTab?.url) {
        dispatch({ type: 'SET_OPPORTUNITY', payload: { link: currentTab.url || '' } });
      }

      const isJobBoard = isJobBoardDomain(currentTab?.url);
      const isWebApp = isWebAppDomain(currentTab?.url);
      
      if (currentTab?.id && isJobBoard && !isWebApp) {
        chrome.tabs.sendMessage(currentTab.id, { action: 'getJobData' }, (response) => {
          if (chrome.runtime.lastError) {
            if (chrome.runtime.lastError.message?.includes('Could not establish connection')) {
              setTimeout(() => {
                chrome.tabs.sendMessage(currentTab.id!, { action: 'getJobData' }, (retryResponse) => {
                  if (!chrome.runtime.lastError && retryResponse?.data) {
                    const hasData = retryResponse.data.position || retryResponse.data.company;
                    dispatch({
                      type: 'SET_DATA_EXTRACTED',
                      payload: retryResponse.data
                    });
                    
                    if (hasData) {
                      setTimeout(() => dispatch({ type: 'SET_MESSAGE', payload: null }), 3000);
                    }
                  } else {
                    dispatch({ type: 'SET_LOADING', payload: false });
                  }
                });
              }, 500);
              return;
            }
            console.error('Error getting job data:', chrome.runtime.lastError);
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
          }

          if (response && response.data) {
            const hasData = response.data.position || response.data.company;
            dispatch({
              type: 'SET_DATA_EXTRACTED',
              payload: response.data
            });
            
            if (hasData) {
              setTimeout(() => dispatch({ type: 'SET_MESSAGE', payload: null }), 3000);
            }
          } else {
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        });
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
        if (isWebApp && currentTab?.id) {
          chrome.tabs.sendMessage(currentTab.id, {
            action: 'syncFromChromeStorage',
          }).catch(() => {});
        } else if (!isJobBoard && currentTab?.url) {
          dispatch({
            type: 'SET_MESSAGE',
            payload: { type: 'info', text: 'Navigate to a job posting page (LinkedIn, Greenhouse, etc.) to auto-fill the form.' }
          });
          setTimeout(() => dispatch({ type: 'SET_MESSAGE', payload: null }), 3000);
        }
      }
    });
  }, []);

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
