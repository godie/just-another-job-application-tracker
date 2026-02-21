import React from 'react';

const PopupLoader: React.FC = () => {
  return (
    <div className="p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Loading job data...</p>
      </div>
    </div>
  );
};

export default PopupLoader;
