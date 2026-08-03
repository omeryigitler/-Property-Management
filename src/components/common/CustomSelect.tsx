import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
}

interface CustomSelectProps<T extends string | number> {
  id?: string;
  label?: string;
  options: SelectOption<T>[];
  value: T;
  onChange: (val: T) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function CustomSelect<T extends string | number>({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  error,
  disabled = false,
  className = '',
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' && isOpen) {
      e.preventDefault();
      const currentIndex = options.findIndex((o) => o.value === value);
      const nextIndex = (currentIndex + 1) % options.length;
      onChange(options[nextIndex].value);
    } else if (e.key === 'ArrowUp' && isOpen) {
      e.preventDefault();
      const currentIndex = options.findIndex((o) => o.value === value);
      const prevIndex = (currentIndex - 1 + options.length) % options.length;
      onChange(options[prevIndex].value);
    }
  };

  return (
    <div className={`relative flex flex-col gap-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          {label}
        </label>
      )}

      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-900/50 border-slate-800 text-slate-500' : 'cursor-pointer bg-slate-900 border-slate-700/80 text-slate-100 hover:border-slate-600'
        } ${error ? 'border-rose-500 ring-1 ring-rose-500/40' : ''}`}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
          {selectedOption?.badge && <div className="ml-auto flex-shrink-0">{selectedOption.badge}</div>}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          tabIndex={-1}
          className="absolute z-50 top-[100%] left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 text-sm text-slate-100 focus:outline-none scrollbar-thin scrollbar-thumb-slate-700"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <li
                key={String(option.value)}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer transition-colors ${
                  isSelected ? 'bg-cyan-950/80 text-cyan-200 font-medium' : 'hover:bg-slate-800/80 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {option.icon}
                  <span className="truncate">{option.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {option.badge}
                  {isSelected && <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {error && <span className="text-xs text-rose-400 font-medium">{error}</span>}
    </div>
  );
}
