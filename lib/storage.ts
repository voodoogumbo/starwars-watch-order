const STORAGE_KEY = "sw-watch-v1";

export type StorageState = Record<string, boolean>;

export const loadState = (): StorageState => {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return {};
    return JSON.parse(raw) as StorageState;
  } catch {
    return {};
  }
};

export const saveState = (state: StorageState) => {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // ignore
  }
};

export const isChecked = (state: StorageState, key: string) => !!state[key];

export const toggleKey = (state: StorageState, key: string) => {
  const next = { ...state };
  if (next[key]) delete next[key];
  else next[key] = true;
  saveState(next);
  return next;
};

export const setKey = (state: StorageState, key: string, checked: boolean) => {
  const next = { ...state };
  if (checked) next[key] = true;
  else delete next[key];
  saveState(next);
  return next;
};

export const resetState = () => {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
};
