import React, { useEffect } from 'react';

interface ManagedSelect {
  button: HTMLButtonElement;
  sync: () => void;
  destroy: () => void;
}

const VIEWPORT_PADDING = 8;
const MENU_GAP = 6;
const MAX_MENU_HEIGHT = 240;
const MIN_MENU_HEIGHT = 96;

export function NativeSelectEnhancer() {
  useEffect(() => {
    const managed = new Map<HTMLSelectElement, ManagedSelect>();
    let activeSelect: HTMLSelectElement | null = null;
    let activeButton: HTMLButtonElement | null = null;
    let activeMenu: HTMLDivElement | null = null;
    let removeActiveListeners: (() => void) | null = null;
    let scanFrame = 0;

    const closeMenu = (restoreFocus = false) => {
      removeActiveListeners?.();
      removeActiveListeners = null;
      activeMenu?.remove();
      activeMenu = null;
      activeSelect = null;
      const button = activeButton;
      activeButton = null;
      if (restoreFocus) {
        window.requestAnimationFrame(() => button?.focus());
      }
    };

    const positionMenu = (button: HTMLButtonElement, menu: HTMLDivElement) => {
      const rect = button.getBoundingClientRect();
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

      menu.style.left = `${Math.min(Math.max(VIEWPORT_PADDING, rect.left), maximumLeft)}px`;
      menu.style.width = `${rect.width}px`;
      menu.style.maxHeight = `${maxHeight}px`;
      menu.style.top = '';
      menu.style.bottom = '';

      if (openAbove) {
        menu.style.bottom = `${window.innerHeight - rect.top + MENU_GAP}px`;
      } else {
        menu.style.top = `${rect.bottom + MENU_GAP}px`;
      }
    };

    const openMenu = (select: HTMLSelectElement, button: HTMLButtonElement) => {
      if (select.disabled || select.options.length === 0) return;

      if (activeSelect === select) {
        closeMenu(false);
        return;
      }

      closeMenu(false);
      activeSelect = select;
      activeButton = button;

      const menu = document.createElement('div');
      menu.setAttribute('role', 'listbox');
      menu.setAttribute('aria-label', select.getAttribute('aria-label') || 'Select option');
      menu.className =
        'fixed z-[10000] overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 py-1 text-sm text-slate-100 shadow-2xl outline-none no-scrollbar';

      Array.from(select.options).forEach((option, index) => {
        const optionButton = document.createElement('button');
        optionButton.type = 'button';
        optionButton.setAttribute('role', 'option');
        optionButton.setAttribute('aria-selected', String(option.selected));
        optionButton.disabled = option.disabled;
        optionButton.textContent = option.textContent || option.label;
        optionButton.className = option.selected
          ? 'flex min-h-10 w-full items-center justify-between gap-3 bg-cyan-950/90 px-3.5 py-2.5 text-left font-medium text-cyan-200 transition-colors'
          : 'flex min-h-10 w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-slate-200 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50';

        if (option.selected) {
          const check = document.createElement('span');
          check.textContent = '✓';
          check.className = 'flex-shrink-0 text-cyan-400';
          optionButton.appendChild(check);
        }

        optionButton.addEventListener('mousedown', (event) => event.preventDefault());
        optionButton.addEventListener('click', () => {
          if (option.disabled) return;
          select.selectedIndex = index;
          select.dispatchEvent(new Event('input', { bubbles: true }));
          select.dispatchEvent(new Event('change', { bubbles: true }));
          managed.get(select)?.sync();
          closeMenu(true);
        });

        menu.appendChild(optionButton);
      });

      document.body.appendChild(menu);
      activeMenu = menu;
      positionMenu(button, menu);

      const handlePointerDown = (event: MouseEvent | TouchEvent) => {
        const target = event.target as Node;
        if (!menu.contains(target) && !button.contains(target)) {
          closeMenu(false);
        }
      };
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeMenu(true);
        }
      };
      const handleViewportChange = () => closeMenu(false);

      document.addEventListener('mousedown', handlePointerDown);
      document.addEventListener('touchstart', handlePointerDown, { passive: true });
      document.addEventListener('keydown', handleEscape);
      window.addEventListener('resize', handleViewportChange);
      window.addEventListener('scroll', handleViewportChange, true);

      removeActiveListeners = () => {
        document.removeEventListener('mousedown', handlePointerDown);
        document.removeEventListener('touchstart', handlePointerDown);
        document.removeEventListener('keydown', handleEscape);
        window.removeEventListener('resize', handleViewportChange);
        window.removeEventListener('scroll', handleViewportChange, true);
      };
    };

    const enhanceSelect = (select: HTMLSelectElement) => {
      if (select.dataset.customSelectIgnore === 'true') return;

      const existing = managed.get(select);
      if (existing?.button.isConnected) {
        existing.sync();
        return;
      }
      existing?.destroy();

      const originalTabIndex = select.tabIndex;
      const originalAriaHidden = select.getAttribute('aria-hidden');
      const originalDisplay = select.style.display;

      select.dataset.customSelectEnhanced = 'true';
      select.style.display = 'none';
      select.tabIndex = -1;
      select.setAttribute('aria-hidden', 'true');

      const button = document.createElement('button');
      button.type = 'button';
      button.className = `${select.className} flex min-w-0 items-center justify-between gap-2 text-left focus:outline-none focus:ring-2 focus:ring-cyan-500/50`;
      button.setAttribute('aria-haspopup', 'listbox');
      button.setAttribute('aria-expanded', 'false');

      const label = document.createElement('span');
      label.className = 'min-w-0 flex-1 truncate';

      const chevron = document.createElement('span');
      chevron.textContent = '⌄';
      chevron.className = 'flex-shrink-0 text-base leading-none text-slate-400';

      button.append(label, chevron);
      select.insertAdjacentElement('afterend', button);

      const sync = () => {
        const selectedOption = select.options[select.selectedIndex];
        label.textContent = selectedOption?.textContent || selectedOption?.label || 'Select option...';
        button.disabled = select.disabled;
        button.setAttribute('aria-disabled', String(select.disabled));
        button.title = selectedOption?.textContent || '';
      };

      const handleClick = () => openMenu(select, button);
      const handleKeyDown = (event: KeyboardEvent) => {
        if (select.disabled) return;

        if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          openMenu(select, button);
        }
      };
      const handleSelectChange = () => sync();

      button.addEventListener('click', handleClick);
      button.addEventListener('keydown', handleKeyDown);
      select.addEventListener('change', handleSelectChange);
      select.addEventListener('input', handleSelectChange);

      const selectObserver = new MutationObserver(sync);
      selectObserver.observe(select, {
        attributes: true,
        childList: true,
        subtree: true,
        characterData: true,
      });

      const destroy = () => {
        if (activeSelect === select) closeMenu(false);
        selectObserver.disconnect();
        button.removeEventListener('click', handleClick);
        button.removeEventListener('keydown', handleKeyDown);
        select.removeEventListener('change', handleSelectChange);
        select.removeEventListener('input', handleSelectChange);
        button.remove();
        select.style.display = originalDisplay;
        select.tabIndex = originalTabIndex;
        if (originalAriaHidden === null) {
          select.removeAttribute('aria-hidden');
        } else {
          select.setAttribute('aria-hidden', originalAriaHidden);
        }
        delete select.dataset.customSelectEnhanced;
        managed.delete(select);
      };

      managed.set(select, { button, sync, destroy });
      sync();
    };

    const scan = () => {
      document
        .querySelectorAll<HTMLSelectElement>('select:not([data-custom-select-ignore="true"])')
        .forEach(enhanceSelect);

      managed.forEach((entry, select) => {
        if (!select.isConnected || !entry.button.isConnected) {
          entry.destroy();
          if (select.isConnected) enhanceSelect(select);
        }
      });
    };

    const scheduleScan = () => {
      window.cancelAnimationFrame(scanFrame);
      scanFrame = window.requestAnimationFrame(scan);
    };

    scan();

    const documentObserver = new MutationObserver(scheduleScan);
    documentObserver.observe(document.body, { childList: true, subtree: true });

    const syncTimer = window.setInterval(() => {
      managed.forEach((entry) => entry.sync());
    }, 250);

    return () => {
      window.cancelAnimationFrame(scanFrame);
      window.clearInterval(syncTimer);
      documentObserver.disconnect();
      closeMenu(false);
      Array.from(managed.values()).forEach((entry) => entry.destroy());
      managed.clear();
    };
  }, []);

  return null;
}
