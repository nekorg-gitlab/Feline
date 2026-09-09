import { useEffect, useRef } from 'react';

export type IntervalCallback = () => void;

export const useInterval = (callback: IntervalCallback, ms: number): void => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (ms < 0) return;
    const id = window.setInterval(() => callbackRef.current(), ms);
    return () => window.clearInterval(id);
  }, [ms]);
};
