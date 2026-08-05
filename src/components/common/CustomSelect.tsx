import React, {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
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

interface MenuPosition {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
}

const VIEWPORT_PADDING = 8;
const MENU_GAP = 6;
const MAX_MENU_HEIGHT = 240;
const MIN_MENU_HEIGHT = 96;

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
  const generatedId = useId();
  const selectId = id || `custom-select-${generatedId}`;
  const menuId = `${selectId}-menu`;

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);

  const selectedIndex = useMemo(
    () => options.findIndex((option) => option.value === value),
    [options, value]
  );
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const updatePosition = () => {
    const trigger = buttonRef.current;
    if (!trigger || typeof window === 'undefined') return;

    const rect = trigger.getBoundingClientRect();
    const availableBelow = window.innerHeight - rect.bottom - MENU_GAP - VIEWPORT_PADDING;
    const availableAbove = rect.top - MENU_GAP - VIEWPORT_PADDING;
    const openAbove = availableBelow < MIN_MENU_HEIGHT && availableAbove > availableBelow;
    const availableSpace = openAbove ? availableAbove : availableBelow;
    const maxHeight = Math.max(
      MIN_MENU_HEIGHT,
      Math.min(MAX_MENU_HEIGHT, Math.max(0, availableSpace))
    );
    const maximumLeft = Math.max(
      VIEWPORT_PADDING,
      window.innerWidth - rect.width - VIEWPORT_PADDING
    );
    const left = Math.min(Math.max(VIEWPORT_PADDING, rect.left), maximumLeft);

    setMenuPosition({
      left,
      width: rect.width,
      maxHeight,
      ...(openAbove
        ? { bottom: window.innerHeight - rect.top + MENU_GAP }
        : { top: rect.bottom + MENU_GAP }),
    });
  };

  const closeMenu = (returnFocus = false) => {
    setIsOpen(false);
    setMenuPosition(null);
    if (returnFocus) {
      window.requestAnimationFrame(() => buttonRef.current?.focus());
    }
  };

  const openMenu = (preferredIndex?: number) => {
    if (disabled || options.length === 0) return;
    const nextIndex = preferredIndex ?? (selectedIndex >= 0 ? selectedIndex : 0);
    setActiveIndex(nextIndex);
    setIsOpen(true);
    window.requestAnimationFrame(updatePosition);
  };

  const selectOption = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    closeMenu(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const insideTrigger = containerRef.current?.contains(target);
      const insideMenu = menuRef.current?.contains(target);
      if (!insideTrigger && !insideMenu) closeMenu(false);
    };

    const handleViewportChange = () => updatePosition();

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  useEffect(() => {
    if (disabled && isOpen) closeMenu(false);
  }, [disabled, isOpen]);

  const handleButtonKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (isOpen) selectOption(activeIndex >= 0 ? activeIndex : selectedIndex);
      else openMenu();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) openMenu(selectedIndex >= 0 ? selectedIndex : 0);
      else setActiveIndex((current) => (current + 1 + options.length) % options.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) openMenu(selectedIndex >= 0 ? selectedIndex : options.length - 1);
      else setActiveIndex((current) => (current - 1 + options.length) % options.length);
      return;
    }

    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      closeMenu(true);
    }
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1 + options.length) % options.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + options.length) % options.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectOption(activeIndex);
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      closeMenu(event.key === 'Escape');
    }
  };

  const menu =
    isOpen && menuPosition && typeof document !== 'undefined'
      ? createPortal(
          <ul
            id={menuId}
            ref={menuRef}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={selectId}
            onKeyDown={handleMenuKeyDown}
            className="fixed z-[10000] overflow-y-auto rounded-2xl border border-[#ded8d4] bg-white py-1.5 text-sm text-[#222222] shadow-[0_18px_55px_rgba(45,32,28,0.18)] outline-none no-scrollbar"
            style={{
              left: menuPosition.left,
              width: menuPosition.width,
              maxHeight: menuPosition.maxHeight,
              top: menuPosition.top,
              bottom: menuPosition.bottom,
            }}
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;

              return (
                <li
                  key={String(option.value)}
                  ref={(node) => {
                    optionRefs.current[index] = node;
                  }}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOption(index)}
                  className={`mx-1 flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 transition-colors ${
                    isSelected
                      ? 'bg-[#fff0ef] font-semibold text-[#c83f45]'
                      : isActive
                        ? 'bg-[#f8f6f5] text-[#222222]'
                        : 'text-[#4f4f4f] hover:bg-[#f8f6f5]'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {option.icon}
                    <span className="truncate">{option.label}</span>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {option.badge}
                    {isSelected && <Check className="h-4 w-4 text-[#d9474d]" />}
                  </div>
                </li>
              );
            })}
          </ul>,
          document.body
        )
      : null;

  return (
    <div className={`relative flex min-w-0 flex-col gap-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={selectId} className="text-sm font-semibold text-[#4d4744]">
          {label}
        </label>
      )}

      <button
        id={selectId}
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => (isOpen ? closeMenu(false) : openMenu())}
        onKeyDown={handleButtonKeyDown}
        aria-haspopup="listbox"
        aria-controls={menuId}
        aria-expanded={isOpen}
        className={`flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-sm transition-all focus:outline-none focus:ring-4 focus:ring-[#ff5a5f]/10 ${
          disabled
            ? 'cursor-not-allowed border-[#e7e2df] bg-[#f5f2f0] text-[#aaa3a0] opacity-60'
            : 'cursor-pointer border-[#ded8d4] bg-white text-[#222222] hover:border-[#cfc6c1] focus:border-[#ff5a5f]'
        } ${error ? 'border-[#d9474d] ring-1 ring-[#d9474d]/20' : ''}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          {selectedOption?.icon}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
          {selectedOption?.badge && (
            <div className="ml-auto flex-shrink-0">{selectedOption.badge}</div>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-[#8a817d] transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {error && <span className="text-xs font-medium text-[#b13a40]">{error}</span>}
      {menu}
    </div>
  );
}
