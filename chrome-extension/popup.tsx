// chrome-extension/popup.tsx
/* eslint-disable react-refresh/only-export-components */
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './popup.css';

interface JobOpportunity {
  position: string;
  company: string;
  link: string;
  description?: string;
  location?: string;
  jobType?: string;
  salary?: string;
  postedDate?: string;
}

const Popup: React.FC = () => {
  const [opportunity, setOpportunity] = useState<JobOpportunity>({
    position: '',
    company: '',
    link: '',
    description: '',
    location: '',
    jobType: '',
    salary: '',
    postedDate: '',
  });
  const [saveAsApplication, setSaveAsApplication] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

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
        setOpportunity(prev => ({ ...prev, link: currentTab.url || '' }));
      }

      // Only try to extract data if we're on a job board domain
      const isJobBoard = isJobBoardDomain(currentTab?.url);
      const isWebApp = isWebAppDomain(currentTab?.url);
      
      // Try to extract data from content script only on job board domains
      if (currentTab?.id && isJobBoard && !isWebApp) {
        chrome.tabs.sendMessage(currentTab.id, { action: 'getJobData' }, (response) => {
          if (chrome.runtime.lastError) {
            // Content script might not be ready yet, try again after a short delay
            if (chrome.runtime.lastError.message?.includes('Could not establish connection')) {
              setTimeout(() => {
                chrome.tabs.sendMessage(currentTab.id!, { action: 'getJobData' }, (retryResponse) => {
                  if (!chrome.runtime.lastError && retryResponse?.data) {
                    const hasData = retryResponse.data.position || retryResponse.data.company;
                    setOpportunity(prev => ({
                      ...prev,
                      position: retryResponse.data.position || prev.position,
                      company: retryResponse.data.company || prev.company,
                      description: retryResponse.data.description || prev.description,
                      location: retryResponse.data.location || prev.location,
                      jobType: retryResponse.data.jobType || prev.jobType,
                      salary: retryResponse.data.salary || prev.salary,
                      postedDate: retryResponse.data.postedDate || prev.postedDate,
                    }));
                    
                    // Show success message if data was extracted
                    if (hasData) {
                      setMessage({ type: 'success', text: 'Job data extracted automatically!' });
                      setTimeout(() => setMessage(null), 3000);
                    }
                  }
                  setIsLoading(false);
                });
              }, 500);
              return;
            }
            console.error('Error getting job data:', chrome.runtime.lastError);
            setIsLoading(false);
            return;
          }

          if (response && response.data) {
            const hasData = response.data.position || response.data.company;
            setOpportunity(prev => ({
              ...prev,
              position: response.data.position || prev.position,
              company: response.data.company || prev.company,
              description: response.data.description || prev.description,
              location: response.data.location || prev.location,
              jobType: response.data.jobType || prev.jobType,
              salary: response.data.salary || prev.salary,
              postedDate: response.data.postedDate || prev.postedDate,
            }));
            
            // Show success message if data was extracted
            if (hasData) {
              setMessage({ type: 'success', text: 'Job data extracted automatically!' });
              setTimeout(() => setMessage(null), 3000);
            }
          }
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
        // If we're on the web app, try to sync opportunities from chrome.storage.local
        if (isWebApp && currentTab?.id) {
          // Sync opportunities to the web app
          chrome.tabs.sendMessage(currentTab.id, {
            action: 'syncFromChromeStorage',
          }).catch(() => {
            // Ignore errors if content script not available
          });
        } else if (!isJobBoard && currentTab?.url) {
          setMessage({ 
            type: 'info', 
            text: 'Navigate to a job posting page (LinkedIn, Greenhouse, etc.) to auto-fill the form.' 
          });
          setTimeout(() => setMessage(null), 3000);
        }
      }
    });
  }, []);

  const handleInputChange = (field: keyof JobOpportunity, value: string) => {
    setOpportunity(prev => ({ ...prev, [field]: value }));
    setMessage(null);
  };

  const handleSave = async () => {
    // Validate required fields
    if (!opportunity.position.trim() || !opportunity.company.trim() || !opportunity.link.trim()) {
      setMessage({ type: 'error', text: 'Please fill in Position, Company, and Link fields' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const capturedDate = new Date().toISOString();

    try {
      if (saveAsApplication) {
        // Save directly as Application (already applied)
        const applicationPayload = {
          id,
          ...opportunity,
          capturedDate,
        };

        // Store in pendingApplications so when user opens the app later it will sync
        const result = await chrome.storage.local.get(['pendingApplications']);
        const pending = result.pendingApplications || [];
        pending.push(applicationPayload);
        await chrome.storage.local.set({ pendingApplications: pending });

        // Sync to web app tabs if open
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

        // If we synced to a tab, remove from pending (already in app localStorage)
        if (syncedToTab && pending.length > 0) {
          const remaining = pending.filter((p: { id: string }) => p.id !== id);
          await chrome.storage.local.set({ pendingApplications: remaining });
        }

        setMessage({ type: 'success', text: 'Application saved! It will appear in Applications.' });
      } else {
        // Save as Opportunity (existing flow)
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
                  chrome.tabs.sendMessage(tab.id!, {
                    action: 'syncFromChromeStorage',
                  }).catch(() => {});
                }).catch(() => {
                  chrome.tabs.sendMessage(tab.id!, {
                    action: 'syncFromChromeStorage',
                  }).catch(() => {});
                });
              }
            });
          });
        } catch (error) {
          console.error('Error syncing to web app:', error);
        }

        setMessage({ type: 'success', text: 'Opportunity saved successfully!' });
      }

      // Clear form after a delay
      setTimeout(() => {
        setOpportunity({
          position: '',
          company: '',
          link: '',
          description: '',
          location: '',
          jobType: '',
          salary: '',
          postedDate: '',
        });
        setSaveAsApplication(false);
        setMessage(null);
      }, 1500);
    } catch (error) {
      console.error('Error saving:', error);
      setMessage({ type: 'error', text: 'Failed to save. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenApp = () => {
    chrome.tabs.create({ url: 'http://jajat.godieboy.com' });
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading job data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 min-h-[400px]">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Capture Job Opportunity</h2>
        <p className="text-xs text-gray-500">Fill in the details and save to your tracker</p>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800' 
            : message.type === 'error'
            ? 'bg-red-100 text-red-800'
            : 'bg-blue-100 text-blue-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Position <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={opportunity.position}
            onChange={(e) => handleInputChange('position', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="e.g., Software Engineer"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Company <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={opportunity.company}
            onChange={(e) => handleInputChange('company', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="e.g., Google"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Link <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={opportunity.link}
            onChange={(e) => handleInputChange('link', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="https://linkedin.com/jobs/view/..."
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={opportunity.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g., Remote"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Job Type</label>
            <input
              type="text"
              value={opportunity.jobType}
              onChange={(e) => handleInputChange('jobType', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Remote/Hybrid/On-site"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Salary</label>
          <input
            type="text"
            value={opportunity.salary}
            onChange={(e) => handleInputChange('salary', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="e.g., $120k - $150k"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={opportunity.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            placeholder="Job description or notes..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Posted Date</label>
          <input
            type="date"
            value={opportunity.postedDate}
            onChange={(e) => handleInputChange('postedDate', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer mt-2">
          <input
            type="checkbox"
            checked={saveAsApplication}
            onChange={(e) => setSaveAsApplication(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-700">Ya apliqué — guardar en Applications</span>
        </label>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isSaving ? 'Saving...' : saveAsApplication ? 'Save as Application' : 'Save to Opportunities'}
          </button>
          <button
            onClick={handleOpenApp}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition duration-150 text-sm"
            title="Open Job Application Tracker in new tab"
          >
            Open App
          </button>
        </div>
        <p className="text-xs text-gray-500 text-center">
          💡 Tip: Right-click the extension icon and select "Inspect popup" to keep it open while copying/pasting
        </p>
      </div>
    </div>
  );
};

// Initialize React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <Popup />
    </React.StrictMode>
  );
}

