import { useEffect, useRef, useState, useCallback } from "react";

interface UseInactivityTimeoutOptions {
  timeoutMs?: number;        // Time before auto-logout (default 15 min)
  warningMs?: number;        // Time before showing warning (default 13 min)
  onTimeout: () => void;     // Called on actual timeout
  enabled?: boolean;
}

export function useInactivityTimeout({
  timeoutMs = 15 * 60 * 1000,
  warningMs = 13 * 60 * 1000,
  onTimeout,
  enabled = true,
}: UseInactivityTimeoutOptions) {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef(Date.now());

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const resetTimers = useCallback(() => {
    if (!enabled) return;
    clearAllTimers();
    setShowWarning(false);
    lastActivityRef.current = Date.now();

    warningRef.current = setTimeout(() => {
      const remaining = Math.ceil((timeoutMs - warningMs) / 1000);
      setRemainingSeconds(remaining);
      setShowWarning(true);

      countdownRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, warningMs);

    timeoutRef.current = setTimeout(() => {
      setShowWarning(false);
      onTimeout();
    }, timeoutMs);
  }, [enabled, timeoutMs, warningMs, onTimeout, clearAllTimers]);

  const stayActive = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  useEffect(() => {
    if (!enabled) return;

    const activityEvents = ["mousedown", "keydown", "touchstart", "scroll"];
    const handleActivity = () => {
      if (!showWarning) {
        resetTimers();
      }
    };

    activityEvents.forEach((event) =>
      document.addEventListener(event, handleActivity, { passive: true })
    );

    resetTimers();

    return () => {
      activityEvents.forEach((event) =>
        document.removeEventListener(event, handleActivity)
      );
      clearAllTimers();
    };
  }, [enabled, resetTimers, clearAllTimers, showWarning]);

  return { showWarning, remainingSeconds, stayActive };
}
