import { useState, useEffect, useRef, useCallback } from 'react';
import { useMatchingStore } from '../stores/matchingStore';
import {
  getMatchThresholdOverride,
  saveMatchThresholdOverride,
  clearMatchThresholdOverride,
} from '../storage/matching';

/**
 * Custom hook to manage the job match threshold state and persistence.
 * Synchronizes between local state, localStorage override, and default preferences.
 */
export const useMatchThreshold = () => {
  const matchingPreferences = useMatchingStore((state) => state.preferences);

  const [matchThreshold, setMatchThreshold] = useState<number>(() => {
    const persisted = getMatchThresholdOverride();
    return persisted !== null ? persisted : matchingPreferences.minMatchThreshold;
  });

  const isThresholdUserModifiedRef = useRef(false);

  // Persist threshold changes to localStorage when modified by user
  useEffect(() => {
    if (isThresholdUserModifiedRef.current) {
      saveMatchThresholdOverride(matchThreshold);
    }
  }, [matchThreshold]);

  // Sync threshold from loaded preferences when no user override exists
  useEffect(() => {
    const persisted = getMatchThresholdOverride();
    if (persisted === null) {
      setMatchThreshold(matchingPreferences.minMatchThreshold);
    }
  }, [matchingPreferences.minMatchThreshold]);

  const handleThresholdChange = useCallback((value: number) => {
    isThresholdUserModifiedRef.current = true;
    setMatchThreshold(value);
  }, []);

  const handleResetThreshold = useCallback(() => {
    clearMatchThresholdOverride();
    isThresholdUserModifiedRef.current = false;
    setMatchThreshold(matchingPreferences.minMatchThreshold);
  }, [matchingPreferences.minMatchThreshold]);

  const hasOverride = getMatchThresholdOverride() !== null;

  return {
    matchThreshold,
    setMatchThreshold: handleThresholdChange,
    resetThreshold: handleResetThreshold,
    hasOverride,
  };
};
