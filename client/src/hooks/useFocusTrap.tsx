import { useEffect, useRef, type RefObject } from 'react';

export const useFocusTrap = (isOpen: boolean, triggerRef: RefObject<HTMLElement | null> | null = null): RefObject<HTMLDivElement | null> => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (triggerRef && triggerRef.current) {
        triggerRef.current.focus();
      }
      return undefined;
    }

    const container = containerRef.current;
    if (!container) return undefined;

    const getFocusableElements = (): HTMLElement[] => {
      return Array.from(
        container.querySelectorAll<HTMLElement>(
          'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]'
        )
      ).filter((el) => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
    };

    const focusable = getFocusableElements();
    if (focusable.length === 0) return undefined;

    const firstElement = focusable[0]!;
    const lastElement = focusable[focusable.length - 1]!;

    firstElement.focus();

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') return;

      const currentFocusable = getFocusableElements();
      if (currentFocusable.length === 0) return;

      const first = currentFocusable[0]!;
      const last = currentFocusable[currentFocusable.length - 1]!;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, triggerRef]);

  return containerRef;
};

export default useFocusTrap;
