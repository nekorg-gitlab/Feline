import { useEffect, useRef, useState } from 'react';

export type OnIntersectionCallback = (entries: IntersectionObserverEntry[]) => void;

export type IntersectionObserverOpts = {
  root?: Element | Document | null;
  rootMargin?: string;
  threshold?: number | number[];
};

export const getIntersectionObserverEntry = (
  target: Element | Document,
  entries: IntersectionObserverEntry[],
): IntersectionObserverEntry | undefined => entries.find((entry) => entry.target === target);

const areThresholdsEqual = (
  a: number | number[] | undefined,
  b: number | number[] | undefined,
): boolean => {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }
  return false;
};

const areOptsEqual = (
  a: IntersectionObserverOpts | undefined,
  b: IntersectionObserverOpts | undefined,
): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.root === b.root &&
    a.rootMargin === b.rootMargin &&
    areThresholdsEqual(a.threshold, b.threshold)
  );
};

export const useIntersectionObserver = (
  onIntersectionCallback: OnIntersectionCallback,
  opts?: IntersectionObserverOpts | (() => IntersectionObserverOpts),
  observeElement?: Element | null | (() => Element | null),
): IntersectionObserver | undefined => {
  const [intersectionObserver, setIntersectionObserver] = useState<IntersectionObserver>();
  const callbackRef = useRef(onIntersectionCallback);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const prevOptsRef = useRef<IntersectionObserverOpts | undefined>(undefined);
  const prevElementRef = useRef<Element | null>(null);

  useEffect(() => {
    callbackRef.current = onIntersectionCallback;
  });

  useEffect(() => {
    const nextOpts = typeof opts === 'function' ? opts() : opts;
    if (areOptsEqual(nextOpts, prevOptsRef.current) && observerRef.current) return;
    prevOptsRef.current = nextOpts;
    observerRef.current?.disconnect();
    const observer = new IntersectionObserver((entries) => callbackRef.current(entries), nextOpts);
    observerRef.current = observer;
    setIntersectionObserver(observer);
    return () => observer.disconnect();
  }, [opts]);

  useEffect(() => {
    const element = typeof observeElement === 'function' ? observeElement() : observeElement;
    const el = element ?? null;
    if (prevElementRef.current === el) return;
    if (prevElementRef.current) {
      intersectionObserver?.unobserve(prevElementRef.current);
    }
    prevElementRef.current = el;
    if (el) intersectionObserver?.observe(el);
    return () => {
      if (el) intersectionObserver?.unobserve(el);
      if (prevElementRef.current === el) prevElementRef.current = null;
    };
  }, [intersectionObserver, observeElement]);

  return intersectionObserver;
};
