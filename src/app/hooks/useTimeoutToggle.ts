import { useCallback, useEffect, useRef, useState } from 'react';

export function useTimeoutToggle(duration = 1500, initial = false): [boolean, () => void] {
  const [active, setActive] = useState(initial);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  const trigger = useCallback(() => {
    setActive(!initial);
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setActive(initial), duration);
  }, [duration, initial]);

  return [active, trigger];
}
