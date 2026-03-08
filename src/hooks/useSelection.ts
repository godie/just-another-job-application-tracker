import { useState, useCallback } from 'react';

/**
 * A generic hook to manage a selection of items using a Set.
 * Useful for checkboxes, multi-select lists, and expanded states.
 */
export function useSelection<T>(initialSelection: T[] = []) {
  const [selected, setSelected] = useState<Set<T>>(new Set(initialSelection));

  const toggle = useCallback((item: T) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
      return next;
    });
  }, []);

  const select = useCallback((item: T) => {
    setSelected((prev) => {
      if (prev.has(item)) return prev;
      const next = new Set(prev);
      next.add(item);
      return next;
    });
  }, []);

  const deselect = useCallback((item: T) => {
    setSelected((prev) => {
      if (!prev.has(item)) return prev;
      const next = new Set(prev);
      next.delete(item);
      return next;
    });
  }, []);

  const selectAll = useCallback((items: T[]) => {
    setSelected(new Set(items));
  }, []);

  const clear = useCallback(() => {
    setSelected(new Set());
  }, []);

  const isSelected = useCallback((item: T) => selected.has(item), [selected]);

  const removeMultiple = useCallback((items: T[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      items.forEach((item) => next.delete(item));
      return next;
    });
  }, []);

  return {
    selected,
    setSelected,
    toggle,
    select,
    deselect,
    selectAll,
    clear,
    isSelected,
    removeMultiple,
    size: selected.size,
  };
}
