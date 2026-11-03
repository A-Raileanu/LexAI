"use client";

import { useEffect, useState } from "react";

/** Ora curentă, actualizată periodic (cronometre); null până la primul tic, ca randarea să rămână pură. */
export function useNow(intervalMs = 1000, enabled = true): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [intervalMs, enabled]);
  return now;
}
