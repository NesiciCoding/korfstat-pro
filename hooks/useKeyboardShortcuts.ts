import { useEffect, useRef } from 'react';

type KeyHandler = (e: KeyboardEvent) => void;

interface ShortcutConfig {
    key: string;
    action: () => void;
    description?: string; // For documentation/cheatsheet later if needed
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    preventDefault?: boolean;
}

export const useKeyboardShortcuts = (shortcuts: ShortcutConfig[], enabled: boolean = true) => {
    // specific - use a ref to hold the latest shortcuts so we don't need to unbind/rebind the listener
    // on every render (since shortcuts array is likely recreated every render in parent).
    const shortcutsRef = useRef(shortcuts);

    useEffect(() => {
        shortcutsRef.current = shortcuts;
    }); // Runs on every render to keep ref fresh

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input or textarea
            const target = e.target as HTMLElement;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
                return;
            }

            const currentShortcuts = shortcutsRef.current;
            const match = currentShortcuts.find(
                (s) =>
                    s.key.toLowerCase() === e.key.toLowerCase() &&
                    !!s.ctrlKey === e.ctrlKey &&
                    !!s.shiftKey === e.shiftKey &&
                    !!s.altKey === e.altKey
            );

            if (match) {
                if (match.preventDefault !== false) {
                    e.preventDefault();
                }
                match.action();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [enabled]); // Only re-bind if 'enabled' status changes
};
