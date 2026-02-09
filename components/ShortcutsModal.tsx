import React, { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

interface ShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {

    // Close on Escape
    useKeyboardShortcuts([{ key: 'Escape', action: onClose }], isOpen);

    if (!isOpen) return null;

    const sections = [
        {
            title: 'Global Controls (Jury View)',
            shortcuts: [
                { keys: ['Space'], description: 'Start / Stop Game Clock' },
                { keys: ['S'], description: 'Start / Stop Shot Clock' },
                { keys: ['R'], description: 'Reset Shot Clock' },
                { keys: ['Backspace'], description: 'Undo Last Event' },
            ]
        },
        {
            title: 'Match Tagging (Tracker View)',
            shortcuts: [
                { keys: ['H'], description: 'Select Home Team' },
                { keys: ['A'], description: 'Select Away Team' },
                { keys: ['G'], description: 'Goal' },
                { keys: ['M'], description: 'Missed Shot' },
                { keys: ['K'], description: 'Free Throw' },
                { keys: ['P'], description: 'Penalty' },
                { keys: ['T'], description: 'Timeout' },
                { keys: ['S'], description: 'Substitution' },
                { keys: ['S'], description: 'Substitution' },
                { keys: ['O'], description: 'Turnover' },
                { keys: ['F'], description: 'Foul' },
                { keys: ['R'], description: 'Rebound' },
                { keys: ['C'], description: 'Card' },
            ]
        },
        {
            title: 'Context Selection',
            shortcuts: [
                { keys: ['G'], description: 'Goal' },
                { keys: ['M'], description: 'Missed Shot' },
                { keys: ['1', '-', '8'], description: 'Select Player (Top to Bottom)' },
                { keys: ['Esc'], description: 'Close Context Menu / Modal' },
                { keys: ['?'], description: 'Show this Cheatsheet' },
            ]
        }
    ];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <Keyboard size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Keyboard Shortcuts</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-8">
                    {sections.map((section, idx) => (
                        <div key={idx}>
                            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                                {section.title}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {section.shortcuts.map((s, sIdx) => (
                                    <div key={sIdx} className="flex items-center justify-between group">
                                        <span className="text-gray-700 dark:text-gray-300 font-medium">{s.description}</span>
                                        <div className="flex gap-1">
                                            {s.keys.map((k, kIdx) => (
                                                <kbd key={kIdx} className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm font-bold text-gray-800 dark:text-gray-200 font-mono min-w-[2rem] text-center">
                                                    {k}
                                                </kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
                    Press <kbd className="font-bold font-mono">?</kbd> to toggle this screen anytime.
                </div>
            </div>
        </div>
    );
};

export default ShortcutsModal;
