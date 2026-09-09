import { useCallback, useEffect, useRef, useState } from "react";

export const useTimer = ({ duration, onComplete }) => {
  const [remaining, setRemaining] = useState(duration);
  const [running, setRunning] = useState(false);
  const deadlineRef = useRef(null);
  const remainingRef = useRef(duration);
  const durationRef = useRef(duration);
  const completedRef = useRef(false);
  const callbackRef = useRef(onComplete);
  useEffect(() => {
    callbackRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);
  useEffect(() => {
    if (!running) return undefined;
    const tick = () => {
      const next = Math.max(
        0,
        Math.ceil((deadlineRef.current - Date.now()) / 1000),
      );
      remainingRef.current = next;
      setRemaining(next);
      if (next === 0 && !completedRef.current) {
        completedRef.current = true;
        setRunning(false);
        callbackRef.current?.();
      }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [running]);

  const start = useCallback(() => {
    deadlineRef.current = Date.now() + remainingRef.current * 1000;
    setRunning(true);
  }, []);
  const pause = useCallback(() => {
    remainingRef.current = Math.max(
      0,
      Math.ceil((deadlineRef.current - Date.now()) / 1000),
    );
    setRemaining(remainingRef.current);
    setRunning(false);
  }, []);
  const reset = useCallback((nextDuration = durationRef.current) => {
    remainingRef.current = nextDuration;
    setRemaining(nextDuration);
    setRunning(false);
    completedRef.current = false;
  }, []);
  return {
    remaining,
    running,
    progress: duration ? ((duration - remaining) / duration) * 100 : 0,
    start,
    pause,
    reset,
  };
};
