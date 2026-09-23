import { watchOrder } from "@/data/watchOrder";

const V1_KEY = "sw-watch-v1";
const V2_KEY = "sw-watch-v2";

// --- Types ---

// "movie:{slug}" | "series:{slug}" | "tv:{tmdbId}:S{n}:E{n}"
export type Watched = Record<string, boolean>;

export type StorageState = {
  watched: Watched;
};

// --- Actions (for useReducer) ---

export type StorageAction =
  | { type: "TOGGLE_WATCHED"; key: string }
  // Mark a whole series complete (flag + every known episode) or clear it
  // (flag + every stored episode under the prefix, known or not).
  | { type: "SET_SERIES"; seriesKey: string; prefix: string; episodeKeys: string[]; checked: boolean }
  // Toggle one episode and keep the series flag in sync with the episode set.
  | { type: "TOGGLE_EPISODE"; key: string; seriesKey: string; episodeKeys: string[] }
  | { type: "HYDRATE"; state: StorageState }
  | { type: "RESET" };

// --- Reducer ---

export function storageReducer(state: StorageState, action: StorageAction): StorageState {
  switch (action.type) {
    case "TOGGLE_WATCHED": {
      const watched = { ...state.watched };
      if (watched[action.key]) {
        delete watched[action.key];
      } else {
        watched[action.key] = true;
      }
      return { ...state, watched };
    }
    case "SET_SERIES": {
      const watched = { ...state.watched };
      if (action.checked) {
        watched[action.seriesKey] = true;
        for (const key of action.episodeKeys) watched[key] = true;
      } else {
        delete watched[action.seriesKey];
        for (const key of Object.keys(watched)) {
          if (key.startsWith(action.prefix)) delete watched[key];
        }
      }
      return { ...state, watched };
    }
    case "TOGGLE_EPISODE": {
      const watched = { ...state.watched };
      if (watched[action.key]) {
        delete watched[action.key];
      } else {
        watched[action.key] = true;
      }
      if (action.episodeKeys.length > 0 && action.episodeKeys.every((k) => watched[k])) {
        watched[action.seriesKey] = true;
      } else {
        delete watched[action.seriesKey];
      }
      return { ...state, watched };
    }
    case "HYDRATE":
      return action.state;
    case "RESET":
      return emptyState();
  }
}

// --- Empty state ---

export function emptyState(): StorageState {
  return { watched: {} };
}

// Accepts current and legacy (movieMeta/seriesMeta) shapes; keeps only true flags.
function sanitize(parsed: unknown): StorageState | null {
  if (!parsed || typeof parsed !== "object") return null;
  const raw = (parsed as { watched?: unknown }).watched;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const watched: Watched = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === true) watched[key] = true;
  }
  return { watched };
}

// --- Persistence ---

export function saveState(state: StorageState): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(V2_KEY, JSON.stringify(state));
    }
  } catch {
    // quota exceeded or unavailable
  }
}

export function loadState(): StorageState {
  try {
    if (typeof window === "undefined") return emptyState();

    // Try v2 first
    const v2 = localStorage.getItem(V2_KEY);
    if (v2) {
      const state = sanitize(JSON.parse(v2));
      if (state) return state;
    }

    // Fall back to v1 migration. Drop the v1 key afterwards so a later reset
    // can't resurrect it.
    const v1 = localStorage.getItem(V1_KEY);
    if (v1) {
      const migrated = migrateV1(JSON.parse(v1) as Record<string, boolean>);
      saveState(migrated);
      localStorage.removeItem(V1_KEY);
      return migrated;
    }
  } catch {
    // corrupt data
  }
  return emptyState();
}

export function resetState(): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem(V2_KEY);
      localStorage.removeItem(V1_KEY);
    }
  } catch {}
}

// --- Migration from v1 ---

function migrateV1(old: Record<string, boolean>): StorageState {
  const state = emptyState();

  // Build a set of series slugs for detecting series vs movie items
  const seriesSlugs = new Set(
    watchOrder.filter((i) => i.type === "series").map((i) => i.id)
  );

  for (const key of Object.keys(old)) {
    // Episode keys: tv:{tmdbId}:S{n}:E{n}
    if (key.startsWith("tv:")) {
      state.watched[key] = true;
      continue;
    }

    // Movie/series completion keys: movie:{slug}
    if (key.startsWith("movie:")) {
      const slug = key.slice("movie:".length);
      // Series completion → use series:{slug} key
      state.watched[seriesSlugs.has(slug) ? `series:${slug}` : key] = true;
    }
    // movie-meta:/series-meta: keys are dropped — metadata now comes from the server
  }

  return state;
}

// --- Export / Import ---

export function exportState(): string {
  const state = loadState();
  return JSON.stringify(state, null, 2);
}

export function importState(json: string): StorageState {
  const state = sanitize(JSON.parse(json));
  if (!state) {
    throw new Error("Invalid import data: missing watched map");
  }
  saveState(state);
  return state;
}

// --- Auto-persist middleware for useReducer ---

export function persistingReducer(
  state: StorageState,
  action: StorageAction
): StorageState {
  const next = storageReducer(state, action);
  if (action.type === "RESET") {
    resetState();
  } else if (action.type !== "HYDRATE") {
    saveState(next);
  }
  return next;
}
