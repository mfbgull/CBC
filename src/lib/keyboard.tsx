/**
 * Keyboard shortcuts hook
 * Global keyboard navigation for the app
 */

import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

/**
 * BOQ keyboard shortcuts placeholder
 */
export function useBoqKeyboardShortcuts() {
  // Grid handles its own keyboard shortcuts via AG Grid
  return null;
}

/**
 * Keyboard shortcuts help modal
 */
export function KeyboardShortcutsHelp({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const shortcuts = [
    { key: 'Ctrl + N', description: 'Add new item' },
    { key: 'Ctrl + S', description: 'Save/Manual export' },
    { key: 'Delete', description: 'Delete selected' },
    { key: 'Ctrl + A', description: 'Select all' },
    { key: 'Escape', description: 'Close/Cancel' },
    { key: 'Enter', description: 'Confirm action' },
    { key: 'Tab', description: 'Next field' },
    { key: '↑/↓', description: 'Navigate rows' },
  ];

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-80 max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
        <div className="p-4 max-h-80 overflow-y-auto">
          <table className="w-full">
            <tbody>
              {shortcuts.map((shortcut, i) => (
                <tr key={i} className={i > 0 ? 'border-t border-gray-100' : ''}>
                  <td className="py-2 pr-4">
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                      {shortcut.key}
                    </kbd>
                  </td>
                  <td className="py-2 text-sm text-gray-600">{shortcut.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}