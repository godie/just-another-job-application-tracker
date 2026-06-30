import React, { memo } from 'react';
import { FaCloud, FaCloudUploadAlt } from 'react-icons/fa';

interface SyncNavIconProps {
  isLoggedIn: boolean;
  className?: string;
}

const SyncNavIcon: React.FC<SyncNavIconProps> = ({ isLoggedIn, className = '' }) => {
  if (isLoggedIn) {
    return <FaCloudUploadAlt className={className} />;
  }
  return <FaCloud className={className} />;
};

SyncNavIcon.displayName = 'SyncNavIcon';

export default memo(SyncNavIcon);
