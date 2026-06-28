import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook to manage local drafts for a contest.
 * Saves SQL code for multiple contest questions using debouncing to prevent local storage thrashing.
 * Stored under the key: `lurner_draft_contest_{contestId}_user_{userId}`
 */
export default function useLocalDraft(contestId, userId) {
    const storageKey = `lurner_draft_contest_${contestId}_user_${userId}`;
    
    // Load initial drafts on creation
    const [drafts, setDrafts] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error("Error parsing local drafts:", e);
            return {};
        }
    });

    const debounceTimeout = useRef(null);

    // Save a draft for a specific question
    const saveDraft = useCallback((questionId, code) => {
        setDrafts(prev => {
            const next = { ...prev, [questionId]: code };
            
            // Clear existing timeout
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }

            // Set up a new debounce timer (1.5 seconds)
            debounceTimeout.current = setTimeout(() => {
                try {
                    localStorage.setItem(storageKey, JSON.stringify(next));
                } catch (e) {
                    console.error("Error writing draft to localStorage:", e);
                }
            }, 1500);

            return next;
        });
    }, [storageKey]);

    // Clear all drafts for this contest
    const clearDrafts = useCallback(() => {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
        try {
            localStorage.removeItem(storageKey);
            setDrafts({});
        } catch (e) {
            console.error("Error clearing drafts from localStorage:", e);
        }
    }, [storageKey]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };
    }, []);

    return { drafts, saveDraft, clearDrafts };
}
