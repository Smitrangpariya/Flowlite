import { useEffect } from 'react';

export const useKeyboardShortcuts = (shortcuts) => {
    useEffect(() => {
        const handleKeyPress = (e) => {
            // Don't trigger shortcuts when typing in inputs/textareas
            const tagName = e.target.tagName.toLowerCase();
            const isEditing = tagName === 'input' || tagName === 'textarea' || tagName === 'select' || e.target.isContentEditable;

            const shortcut = shortcuts.find(s => {
                const modifierMatch =
                    (s.meta ? (e.metaKey || e.ctrlKey) : !(e.metaKey || e.ctrlKey)) &&
                    (s.shift ? e.shiftKey : !e.shiftKey) &&
                    (s.alt ? e.altKey : !e.altKey);

                return modifierMatch && e.key.toLowerCase() === s.key.toLowerCase();
            });

            if (shortcut) {
                // Allow modifier shortcuts (Cmd+K, Cmd+Shift+N) even in inputs
                // but block non-modifier shortcuts (like '/') when editing
                if (!shortcut.meta && !shortcut.alt && isEditing) {
                    return;
                }
                e.preventDefault();
                shortcut.action();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [shortcuts]);
};
