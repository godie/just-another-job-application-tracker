import { useEffect, type RefObject } from 'react';

/**
 * Custom hook to trap focus within a container element.
 * Useful for modals and dialogs to ensure accessibility.
 */
const useFocusTrap = (ref: RefObject<HTMLElement | null>, isActive: boolean = true) => {
  useEffect(() => {
    if (!isActive || !ref.current) return;

    const container = ref.current;
    const focusable = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const elements = container.querySelectorAll<HTMLElement>(focusable);
    const first = elements[0];
    const last = elements[elements.length - 1];
    const previous = document.activeElement as HTMLElement;

    // Focus the first element when active
    const frameId = requestAnimationFrame(() => {
      if (document.activeElement !== first) first?.focus();
    });

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || elements.length === 0) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    container.addEventListener('keydown', handleTab);
    return () => {
      cancelAnimationFrame(frameId);
      container.removeEventListener('keydown', handleTab);
      try { previous?.focus(); } catch { /* ignore */ }
    };
  }, [isActive, ref]);
};

export default useFocusTrap;
