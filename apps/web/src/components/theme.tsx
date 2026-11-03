"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY as KEY } from "./theme-script";

/** Tema: „sistem”, „luminos” sau „întunecat”, salvată local și aplicată înainte de randare. */
export type ThemeChoice = "sistem" | "luminos" | "intunecat";



const listeners = new Set<() => void>();

function read(): ThemeChoice {
  try {
    return (localStorage.getItem(KEY) as ThemeChoice) || "sistem";
  } catch {
    return "sistem";
  }
}

function apply(choice: ThemeChoice) {
  const dark = choice === "intunecat" || (choice === "sistem" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function setTheme(choice: ThemeChoice) {
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    /* stocare indisponibilă: tema se aplică doar în sesiunea curentă */
  }
  apply(choice);
  listeners.forEach((l) => l());
}

export function useTheme(): ThemeChoice {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      const mq = matchMedia("(prefers-color-scheme: dark)");
      const onChange = () => read() === "sistem" && apply("sistem");
      mq.addEventListener("change", onChange);
      return () => {
        listeners.delete(cb);
        mq.removeEventListener("change", onChange);
      };
    },
    read,
    () => "sistem",
  );
}
