// chrome-extension/webapp-content.ts
// Content script injected into the web app to sync opportunities from chrome.storage.local to localStorage

/// <reference types="./types.d.ts" />

const OPPORTUNITIES_STORAGE_KEY = 'jobOpportunities';
const APPLICATIONS_STORAGE_KEY = 'jobTrackerData';

// Store timeout/interval IDs to prevent memory leaks
let syncTimeoutId: ReturnType<typeof setTimeout> | null = null;
let syncIntervalId: ReturnType<typeof setInterval> | null = null;

// Listen for messages from popup/background
if (typeof chrome !== 'undefined' && chrome.runtime) {
  console.log('[Job Tracker Extension] Listening for messages from popup/background');
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[Job Tracker Extension] Received message:', request);
    if (request.action === 'syncOpportunity') {
      // Single opportunity sync
      syncOpportunityToLocalStorage(request.data);
      sendResponse({ success: true });
    } else if (request.action === 'syncApplication') {
      // Save directly as Application (already applied)
      syncApplicationToLocalStorage(request.data);
      sendResponse({ success: true });
    } else if (request.action === 'syncOpportunities') {
      // Full sync of all opportunities
      syncAllOpportunitiesToLocalStorage(request.data);
      sendResponse({ success: true });
    } else if (request.action === 'syncFromChromeStorage') {
      // Sync from chrome.storage.local to localStorage
      syncFromChromeStorage();
      sendResponse({ success: true });
    } else if (request.action === 'deleteOpportunity') {
      // Delete opportunity from chrome.storage.local
      deleteOpportunityFromChromeStorage(request.opportunityId);
      sendResponse({ success: true });
    }
    return true; // Keep message channel open for async response
  });
}

interface Opportunity {
  id: string;
  position: string;
  company: string;
  link: string;
  description?: string;
  location?: string;
  jobType?: string;
  salary?: string;
  postedDate?: string;
  capturedDate: string;
}

// Minimal JobApplication shape for localStorage (jobTrackerData)
interface StoredApplication {
  id: string;
  position: string;
  company: string;
  status: string;
  applicationDate: string;
  timeline: { id: string; type: string; date: string; status: string }[];
  notes: string;
  link: string;
  salary: string;
  platform: string;
  contactName: string;
  followUpDate: string;
  interviewDate: string;
  [key: string]: unknown;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function opportunityToApplication(opportunity: Opportunity): StoredApplication {
  const today = new Date().toISOString().split('T')[0];
  return {
    id: opportunity.id,
    position: opportunity.position,
    company: opportunity.company,
    status: 'Applied',
    applicationDate: today,
    interviewDate: '',
    timeline: [
      {
        id: generateId(),
        type: 'application_submitted',
        date: today,
        status: 'completed',
      },
    ],
    notes: opportunity.description || '',
    link: opportunity.link,
    salary: opportunity.salary || '',
    platform: opportunity.jobType || '',
    contactName: '',
    followUpDate: '',
  };
}

function syncApplicationToLocalStorage(opportunity: Opportunity) {
  try {
    const app = opportunityToApplication(opportunity);
    const existing = localStorage.getItem(APPLICATIONS_STORAGE_KEY);
    const applications: StoredApplication[] = existing ? JSON.parse(existing) : [];

    let updated: StoredApplication[];
    if (applications.some((a: StoredApplication) => a.id === app.id)) {
      updated = applications.map((a: StoredApplication) => (a.id === app.id ? app : a));
    } else {
      updated = [...applications, app];
    }
    localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(updated));

    console.log(`[Job Tracker Extension] Synced application "${app.position}" to Applications`);

    window.dispatchEvent(new StorageEvent('storage', {
      key: APPLICATIONS_STORAGE_KEY,
      newValue: JSON.stringify(updated),
      oldValue: existing,
    }));
    window.dispatchEvent(new CustomEvent('jobApplicationsUpdated', {
      detail: updated,
    }));
  } catch (error) {
    console.error('Error syncing application to localStorage:', error);
  }
}

function syncOpportunityToLocalStorage(opportunity: Opportunity) {
  try {
    const existing = localStorage.getItem(OPPORTUNITIES_STORAGE_KEY);
    const opportunities: Opportunity[] = existing ? JSON.parse(existing) : [];
    
    // Check if opportunity already exists (by id)
    const existingIndex = opportunities.findIndex((opp: Opportunity) => opp.id === opportunity.id);
    if (existingIndex >= 0) {
      // Update existing
      opportunities[existingIndex] = opportunity;
    } else {
      // Add new
      opportunities.push(opportunity);
    }
    
    localStorage.setItem(OPPORTUNITIES_STORAGE_KEY, JSON.stringify(opportunities));
    
    // Debug log
    console.log(`[Job Tracker Extension] Synced opportunity "${opportunity.position}" to localStorage`);
    
    // Dispatch storage event to notify other tabs
    window.dispatchEvent(new StorageEvent('storage', {
      key: OPPORTUNITIES_STORAGE_KEY,
      newValue: JSON.stringify(opportunities),
      oldValue: existing,
    }));
    
    // Also dispatch custom event for React components
    window.dispatchEvent(new CustomEvent('jobOpportunitiesUpdated', {
      detail: opportunities,
    }));
  } catch (error) {
    console.error('Error syncing opportunity to localStorage:', error);
  }
}

function syncAllOpportunitiesToLocalStorage(opportunities: Opportunity[]) {
  try {
    localStorage.setItem(OPPORTUNITIES_STORAGE_KEY, JSON.stringify(opportunities));
    
    // Dispatch storage event
    window.dispatchEvent(new StorageEvent('storage', {
      key: OPPORTUNITIES_STORAGE_KEY,
      newValue: JSON.stringify(opportunities),
    }));
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('jobOpportunitiesUpdated', {
      detail: opportunities,
    }));
  } catch (error) {
    console.error('Error syncing all opportunities to localStorage:', error);
  }
}

async function syncFromChromeStorage() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(['jobOpportunities', 'pendingApplications']);
      const opportunities: Opportunity[] = (result.jobOpportunities || []) as Opportunity[];

      // Always sync opportunities, even if empty
      syncAllOpportunitiesToLocalStorage(opportunities);

      // Process pending applications (saved as "Application" while app was closed)
      const pending: Opportunity[] = (result.pendingApplications || []) as Opportunity[];
      if (pending.length > 0) {
        for (const opp of pending) {
          syncApplicationToLocalStorage(opp);
        }
        await chrome.storage.local.set({ pendingApplications: [] });
        console.log(`[Job Tracker Extension] Synced ${pending.length} pending application(s) to localStorage`);
      }

      if (opportunities.length > 0) {
        console.log(`[Job Tracker Extension] Synced ${opportunities.length} opportunities to localStorage`);
      }
    }
  } catch (error) {
    console.error('Error syncing from chrome.storage.local:', error);
  }
}

async function deleteOpportunityFromChromeStorage(opportunityId: string) {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(['jobOpportunities']);
      const opportunities: Opportunity[] = result.jobOpportunities || [];
      const filtered = opportunities.filter((opp: Opportunity) => opp.id !== opportunityId);
      
      await chrome.storage.local.set({ jobOpportunities: filtered });
      
      console.log(`[Job Tracker Extension] Deleted opportunity ${opportunityId} from chrome.storage.local`);
      
      // After deleting, sync back to localStorage to reflect the change
      syncAllOpportunitiesToLocalStorage(filtered);
    }
  } catch (error) {
    console.error('Error deleting opportunity from chrome.storage.local:', error);
  }
}

// Sync opportunity to chrome.storage.local (for manual additions from web app)
async function syncOpportunityToChromeStorage(opportunity: Opportunity) {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(['jobOpportunities']);
      const opportunities: Opportunity[] = result.jobOpportunities || [];
      
      // Check if opportunity already exists (by id)
      const existingIndex = opportunities.findIndex((opp: Opportunity) => opp.id === opportunity.id);
      if (existingIndex >= 0) {
        // Update existing
        opportunities[existingIndex] = opportunity;
      } else {
        // Add new
        opportunities.push(opportunity);
      }
      
      await chrome.storage.local.set({ jobOpportunities: opportunities });
      console.log(`[Job Tracker Extension] Synced opportunity "${opportunity.position}" to chrome.storage.local`);
    }
  } catch (error) {
    console.error('Error syncing opportunity to chrome.storage.local:', error);
  }
}

// Function to clean up timeouts/intervals
function cleanupTimers() {
  if (syncTimeoutId !== null) {
    clearTimeout(syncTimeoutId);
    syncTimeoutId = null;
  }
  if (syncIntervalId !== null) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }
}

// Function to setup sync timers
function setupSyncTimers() {
  // Clean up any existing timers first
  cleanupTimers();
  
  // Sync immediately on load
  syncFromChromeStorage();
  
  // Also wait a bit and sync again (in case chrome.storage wasn't ready)
  syncTimeoutId = setTimeout(() => {
    syncFromChromeStorage();
    syncTimeoutId = null;
  }, 500);
  
  // Also sync periodically (every 3 seconds) to catch any missed updates
  syncIntervalId = setInterval(() => {
    syncFromChromeStorage();
  }, 3000);
}

// Handler for window.postMessage from web app
function handleWindowMessage(event: MessageEvent) {
  // Verify the message is from the same origin (security)
  // Content scripts can receive messages from the page, but we should verify origin
  if (event.data && event.data.type === 'DELETE_OPPORTUNITY') {
    console.log('[Job Tracker Extension] Received DELETE_OPPORTUNITY message:', event.data);
    deleteOpportunityFromChromeStorage(event.data.opportunityId as string);
  } else if (event.data && event.data.type === 'SYNC_OPPORTUNITY') {
    // Handle manual opportunity sync from web app
    console.log('[Job Tracker Extension] Received SYNC_OPPORTUNITY message:', event.data);
    if (event.data.data) {
      syncOpportunityToChromeStorage(event.data.data);
    }
  }
}

// Initialize on page load
if (typeof window !== 'undefined') {
  // Setup sync timers
  setupSyncTimers();
  
  // Listen for storage changes in chrome.storage.local (if available)
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      console.log('[Job Tracker Extension] Chrome storage changed:', changes, areaName);
      if (areaName === 'local' && changes.jobOpportunities) {
        // Chrome storage changed, sync to localStorage
        syncFromChromeStorage();
      }
    });
  }
  
  // Listen for messages from the web app via window.postMessage
  // This is the correct way to receive messages from the web page
  window.addEventListener('message', handleWindowMessage);
  
  // Cleanup on page unload (for SPA navigation)
  window.addEventListener('beforeunload', () => {
    cleanupTimers();
    window.removeEventListener('message', handleWindowMessage);
  });
}
