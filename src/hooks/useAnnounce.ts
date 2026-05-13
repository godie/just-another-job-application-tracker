import { useCallback } from 'react';

/**
 * Hook to announce messages to screen readers via ARIA live regions.
 * Useful for form validation, loading states, and dynamic updates.
 */
export const useAnnounce = () => {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    // Create or get the announcer element
    let announcer = document.getElementById('sr-announcer');

    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'sr-announcer';
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      // Position off-screen but keep in DOM
      announcer.className = 'sr-only';
      document.body.appendChild(announcer);
    }

    // Update aria-live based on priority
    announcer.setAttribute('aria-live', priority);

    // Clear previous content and set new message
    // Small delay helps screen readers detect the change
    announcer.textContent = '';
    setTimeout(() => {
      announcer.textContent = message;
    }, 100);
  }, []);

  return { announce };
};

export default useAnnounce;
