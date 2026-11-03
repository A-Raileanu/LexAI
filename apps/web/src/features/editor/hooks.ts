"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

/** `matchMedia` ca stare React (spațiul de lucru e randat doar în browser). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * Lățimea și înălțimea unui element, prin ResizeObserver, cu un callback ref
 * (fără efecte: măsurarea se face la atașare și la fiecare redimensionare).
 */
export function useElementSize<T extends HTMLElement>(): [(el: T | null) => (() => void) | void, { width: number; height: number }] {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const ref = useCallback((el: T | null) => {
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize((s) => (Math.abs(s.width - r.width) < 0.5 && Math.abs(s.height - r.height) < 0.5 ? s : { width: r.width, height: r.height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

/** Citire/scriere în localStorage, tolerantă la erori (mod privat, stocare blocată). */
export function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignorăm
  }
}
