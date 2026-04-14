import type { PrefsState } from "@/features/prefs/prefsSlice";

const PREFS_KEY = "cyoa:prefs:v1";

export function loadPrefs(): Partial<PrefsState> | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<PrefsState>;
  } catch {
    return null;
  }
}

export function savePrefs(prefs: PrefsState): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota/serialization errors
  }
}
