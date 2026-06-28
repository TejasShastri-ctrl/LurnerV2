import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook to enforce Timed Contest rules.
 * Monitors Fullscreen exits and Visibility (tab switching) API infractions.
 */
export default function useAntiCheat({ isActive, maxInfractions = 3, onViolation, onLimitExceeded }) {
    const [infractions, setInfractions] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const isActivelyEnforcing = useRef(isActive);
    
    // Hold refs to avoid re-binding event listeners when handler functions change
    const onViolationRef = useRef(onViolation);
    const onLimitExceededRef = useRef(onLimitExceeded);
    
    useEffect(() => {
        isActivelyEnforcing.current = isActive;
    }, [isActive]);

    useEffect(() => {
        onViolationRef.current = onViolation;
        onLimitExceededRef.current = onLimitExceeded;
    }, [onViolation, onLimitExceeded]);

    const incrementInfractions = useCallback((type, message) => {
        if (!isActivelyEnforcing.current) return;
        
        setInfractions(prev => {
            const next = prev + 1;
            if (onViolationRef.current) {
                onViolationRef.current({ type, message, count: next });
            }
            if (next >= maxInfractions) {
                if (onLimitExceededRef.current) {
                    onLimitExceededRef.current();
                }
            }
            return next;
        });
    }, [maxInfractions]);

    // Request fullscreen mode
    const enterFullscreen = useCallback(async () => {
        try {
            const element = document.documentElement;
            if (element.requestFullscreen) {
                await element.requestFullscreen();
            } else if (element.mozRequestFullScreen) {
                await element.mozRequestFullScreen();
            } else if (element.webkitRequestFullscreen) {
                await element.webkitRequestFullscreen();
            } else if (element.msRequestFullscreen) {
                await element.msRequestFullscreen();
            }
            setIsFullscreen(true);
        } catch (e) {
            console.error("Failed to enter fullscreen:", e);
        }
    }, []);

    // Listen for fullscreen change events
    useEffect(() => {
        const handleFullscreenChange = () => {
            const currentFullscreen = !!(
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement
            );
            setIsFullscreen(currentFullscreen);
            
            if (isActivelyEnforcing.current && !currentFullscreen) {
                incrementInfractions('EXIT_FULLSCREEN', 'You exited fullscreen mode! Please return to fullscreen.');
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, [incrementInfractions]);

    // Listen for tab focus/visibility changes
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden' && isActivelyEnforcing.current) {
                incrementInfractions('TAB_SWITCH', 'Tab switch or window minimization detected!');
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [incrementInfractions]);

    return { infractions, isFullscreen, enterFullscreen, setInfractions };
}
