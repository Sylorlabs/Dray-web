'use client';

import { useState, useCallback, useRef } from 'react';

interface HistoryState<T> {
    past: T[];
    present: T;
    future: T[];
}

interface UseHistoryReturn<T> {
    state: T;
    setState: (
        newState: T | ((prev: T) => T),
        actionName?: string,
        options?: { recordHistory?: boolean }
    ) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    lastAction: string | null;
    historyLength: number;
}

const MAX_HISTORY = 50;

export function useHistory<T>(initialState: T): UseHistoryReturn<T> {
    const [history, setHistory] = useState<HistoryState<T>>({
        past: [],
        present: initialState,
        future: []
    });

    const lastActionRef = useRef<string | null>(null);

    const setState = useCallback((
        newState: T | ((prev: T) => T),
        actionName?: string,
        options?: { recordHistory?: boolean }
    ) => {
        const recordHistory = options?.recordHistory ?? true;
        setHistory(prev => {
            const resolvedState = typeof newState === 'function'
                ? (newState as (prev: T) => T)(prev.present)
                : newState;

            // Skip if same reference (shallow check only for performance)
            if (resolvedState === prev.present) {
                return prev;
            }

            lastActionRef.current = actionName || 'Change';

            // High-frequency interactions (sliders, drag, knobs) can skip history
            // to avoid undo stack spam and expensive past-array churn.
            if (!recordHistory) {
                return {
                    ...prev,
                    present: resolvedState,
                    future: []
                };
            }

            return {
                past: [...prev.past, prev.present].slice(-MAX_HISTORY),
                present: resolvedState,
                future: [] // Clear redo stack on new action
            };
        });
    }, []);

    const undo = useCallback(() => {
        setHistory(prev => {
            if (prev.past.length === 0) return prev;

            const newPast = [...prev.past];
            const previousState = newPast.pop()!;

            lastActionRef.current = 'Undo';

            return {
                past: newPast,
                present: previousState,
                future: [prev.present, ...prev.future].slice(0, MAX_HISTORY)
            };
        });
    }, []);

    const redo = useCallback(() => {
        setHistory(prev => {
            if (prev.future.length === 0) return prev;

            const newFuture = [...prev.future];
            const nextState = newFuture.shift()!;

            lastActionRef.current = 'Redo';

            return {
                past: [...prev.past, prev.present].slice(-MAX_HISTORY),
                present: nextState,
                future: newFuture
            };
        });
    }, []);

    return {
        state: history.present,
        setState,
        undo,
        redo,
        canUndo: history.past.length > 0,
        canRedo: history.future.length > 0,
        lastAction: lastActionRef.current,
        historyLength: history.past.length
    };
}
