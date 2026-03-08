import { useEffect, useRef } from 'react';

export interface KeyboardShortcutCallbacks {
  onUndo: () => void;
  onRedo: () => void;
  onTogglePlay: () => void | Promise<void>;
  onDelete?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onSelectAll?: () => void;
  onToggleHelp?: () => void;
}

export function useKeyboardShortcuts(
  callbacks: KeyboardShortcutCallbacks,
  enabled: boolean = true
): void {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      const cb = callbacksRef.current;

      // Spacebar for play/stop
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        await cb.onTogglePlay();
        return;
      }

      // Delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && cb.onDelete) {
        e.preventDefault();
        cb.onDelete();
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            cb.onRedo();
          } else {
            cb.onUndo();
          }
          return;
        }
        // Also support Ctrl+Y for redo
        if (e.key === 'y') {
          e.preventDefault();
          cb.onRedo();
          return;
        }
        if (e.key === 'c' && cb.onCopy) {
          e.preventDefault();
          cb.onCopy();
          return;
        }
        if (e.key === 'v' && cb.onPaste) {
          e.preventDefault();
          cb.onPaste();
          return;
        }
        if (e.key === 'a' && cb.onSelectAll) {
          e.preventDefault();
          cb.onSelectAll();
          return;
        }
      }

      // ? for keyboard shortcuts help
      if ((e.key === '?' || (e.shiftKey && e.key === '/')) && cb.onToggleHelp) {
        e.preventDefault();
        cb.onToggleHelp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
