import { useEffect, type RefObject } from 'react';

const useFocusTrap = (ref: RefObject<HTMLElement | null>, isActive: boolean = true) => {
  useEffect(() => {
    if (!isActive || !ref.current) return;

    const container = ref.current;
    const focusable = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const previous = document.activeElement as HTMLElement;
    const previousTabIndex = container.getAttribute('tabindex');

    const getFocusableElements = () => Array.from(
      container.querySelectorAll<HTMLElement>(focusable),
    ).filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');

    const focusContainer = () => {
      if (previousTabIndex === null) container.setAttribute('tabindex', '-1');
      container.focus();
    };

    const frameId = requestAnimationFrame(() => {
      const elements = getFocusableElements();
      if (elements[0]) {
        if (document.activeElement !== elements[0]) elements[0].focus();
      } else {
        focusContainer();
      }
    });

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const elements = getFocusableElements();
      if (elements.length === 0) {
        e.preventDefault();
        focusContainer();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', handleTab);
    return () => {
      cancelAnimationFrame(frameId);
      container.removeEventListener('keydown', handleTab);
      if (previousTabIndex === null) {
        container.removeAttribute('tabindex');
      } else {
        container.setAttribute('tabindex', previousTabIndex);
      }
      try {
        if (previous && document.contains(previous)) {
          previous.focus();
        } else {
          const body = document.body;
          const previousBodyTabIndex = body.getAttribute('tabindex');
          if (previousBodyTabIndex === null) body.setAttribute('tabindex', '-1');
          body.focus();
          if (previousBodyTabIndex === null) {
            body.removeAttribute('tabindex');
          } else {
            body.setAttribute('tabindex', previousBodyTabIndex);
          }
        }
      } catch { /* ignore */ }
    };
  }, [isActive, ref]);
};

export default useFocusTrap;
