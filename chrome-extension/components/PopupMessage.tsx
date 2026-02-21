import React from 'react';

interface PopupMessageProps {
  message: { type: 'success' | 'error' | 'info'; text: string } | null;
}

const PopupMessage: React.FC<PopupMessageProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className={`mb-4 p-3 rounded-lg text-sm ${
      message.type === 'success'
        ? 'bg-green-100 text-green-800'
        : message.type === 'error'
        ? 'bg-red-100 text-red-800'
        : 'bg-blue-100 text-blue-800'
    }`}>
      {message.text}
    </div>
  );
};

export default PopupMessage;
