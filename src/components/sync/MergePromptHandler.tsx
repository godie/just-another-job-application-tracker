// src/components/sync/MergePromptHandler.tsx
import React, { useState, useEffect } from 'react';
import { useMergeStore } from '../../stores/mergeStore';
import MergePromptModal from './MergePromptModal';

/**
 * Global component that monitors the merge store and displays
 * the merge conflict modal when a conflict is detected.
 * Rendered once in App.tsx.
 */
const MergePromptHandler: React.FC = () => {
  const isConflictDetected = useMergeStore((state) => state.isConflictDetected);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (isConflictDetected) {
      setIsModalOpen(true);
    }
  }, [isConflictDetected]);

  const handleClose = () => {
    setIsModalOpen(false);
  };

  if (!isModalOpen) return null;

  return <MergePromptModal onClose={handleClose} />;
};

MergePromptHandler.displayName = 'MergePromptHandler';

export default MergePromptHandler;
