import React, { useState, type KeyboardEvent } from 'react';
import { Badge } from './Badge';

const EMPTY_TAGS: string[] = [];

interface TagInputProps {
  label?: string;
  placeholder?: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  className?: string;
}

export const TagInput: React.FC<TagInputProps> = ({
  label,
  placeholder,
  tags = EMPTY_TAGS,
  onChange,
  className = '',
}) => {
  const [inputValue, setInputValue] = useState('');

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().replace(/^"(.*)"$/, '').replace(/^'(.*)'$/, '');
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onChange([...tags, trimmedTag]);
    }
    setInputValue('');
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.endsWith(',')) {
      addTag(value.slice(0, -1));
    } else {
      setInputValue(value);
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label className='block text-sm font-bold text-earth-700 dark:text-earth-300'>
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={label || placeholder || 'Tag input'}
          className='w-full px-4 py-3 border border-earth-300 dark:border-earth-600 rounded focus:ring-2 focus:ring-sage-500 focus:border-sage-500 bg-white dark:bg-earth-800 text-earth-900 dark:text-earth-100 transition-all'
        />
      </div>
      <div className="flex flex-wrap gap-2 min-h-[32px]">
        {tags.map((tag, index) => (
          <Badge
            key={tag}
            variant='default'
            className='flex items-center gap-1.5 px-3 py-1.5 text-sm group cursor-default animate-in fade-in zoom-in duration-200 relative overflow-hidden bg-sage-100 text-sage-700 dark:bg-sage-900/40 dark:text-sage-300'
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="opacity-0 group-hover:opacity-100 ml-1 hover:bg-sage-200 dark:hover:bg-sage-800 rounded-full p-0.5 transition-all focus:outline-none focus:opacity-100"
              aria-label={`Remove ${tag}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
};
