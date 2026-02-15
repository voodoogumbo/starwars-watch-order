import { watchOrder } from "@/data/watchOrder";

const V1_KEY = "sw-watch-v1";
const V2_KEY = "sw-watch-v2";

// --- Types ---

export type MovieMeta = {
  tmdbId: number;
  runtime: number;   // minutes
  rating: number;    // 0-10
  poster?: string;   // TMDB poster_path
  fetchedAt: number; // timestamp
};

export type SeriesMeta = {
  tmdbId: number;
  totalEpisodes: number;
  checkedEpisodes: number;
  totalRuntime: number; // minutes
  poster?: string;      // TMDB poster_path
  fetchedAt: number;    // timestamp
};

export type StorageState = {
  watched: Record<string, boolean>;     // "movie:{slug}" | "tv:{tmdbId}:S{n}:E{n}" | "series:{slug}"
  movieMeta: Record<string, MovieMeta>; // keyed by item slug
  seriesMeta: Record<string, SeriesMeta>; // keyed by item slug
};

// --- Actions (for useReducer) ---

export type StorageAction =
  | { type: "TOGGLE_WATCHED"; key: string }
  | { type: "BULK_SET_EPISODES"; keys: string[]; checked: boolean }
  | { type: "UPDATE_MOVIE_META"; slug: string; meta: MovieMeta }
  | { type: "UPDATE_SERIES_META"; slug: string; meta: SeriesMeta }
  | { type: "SET_WATCHED"; key: string; checked: boolean }
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
    case "SET_WATCHED": {
      const watched = { ...state.watched };
      if (action.checked) {
        watched[action.key] = true;
      } else {
        delete watched[action.key];
      }
      return { ...state, watched };
    }
    case "BULK_SET_EPISODES": {
      const watched = { ...state.watched };
      for (const key of action.keys) {
        if (action.checked) {
          watched[key] = true;
        } else {
          delete watched[key];
        }
      }
      return { ...state, watched };
    }
    case "UPDATE_MOVIE_META": {
      return {
        ...state,
        movieMeta: { ...state.movieMeta, [action.slug]: action.meta },
      };
    }
    case "UPDATE_SERIES_META": {
      return {
        ...state,
        seriesMeta: { ...state.seriesMeta, [action.slug]: action.meta },
      };
    }
    case "HYDRATE":
      return action.state;
    case "RESET":
      return emptyState();
  }
}

// --- Empty state ---

export function emptyState(): StorageState {
  return { watched: {}, movieMeta: {}, seriesMeta: {} };
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
      const parsed = JSON.parse(v2);
      // Basic shape validation
      if (parsed && typeof parsed.watched === "object") {
        return {
          watched: parsed.watched ?? {},
          movieMeta: parsed.movieMeta ?? {},
          seriesMeta: parsed.seriesMeta ?? {},
        };
      }
    }

    // Fall back to v1 migration
    const v1 = localStorage.getItem(V1_KEY);
    if (v1) {
      const old = JSON.parse(v1) as Record<string, boolean>;
      const migrated = migrateV1(old);
      saveState(migrated);
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
    if (key.startsWith("movie:") && !key.startsWith("movie-meta:")) {
      const slug = key.slice("movie:".length);
      if (seriesSlugs.has(slug)) {
        // Series completion → use series:{slug} key
        state.watched[`series:${slug}`] = true;
      } else {
        state.watched[key] = true;
      }
      continue;
    }

    // Movie metadata: movie-meta:{slug}:{tmdbId}:{runtime}:{rating}:{timestamp}
    if (key.startsWith("movie-meta:")) {
      const parts = key.split(":");
      const slug = parts[1];
      const tmdbId = Number(parts[2]) || 0;
      const runtime = Number(parts[3]) || 0;
      const rating = Number(parts[4]) || 0;
      const fetchedAt = Number(parts[5]) || 0;
      if (slug) {
        state.movieMeta[slug] = { tmdbId, runtime, rating, fetchedAt };
      }
      continue;
    }

    // Series metadata: series-meta:{slug}:{tmdbId}:{total}:{checked}:{totalRuntime}:{timestamp}
    // Also handle old format: series-meta:{slug}:{tmdbId}:{total}:{checked}:{timestamp}
    if (key.startsWith("series-meta:")) {
      const parts = key.split(":");
      const slug = parts[1];
      const tmdbId = Number(parts[2]) || 0;
      const totalEpisodes = Number(parts[3]) || 0;
      const checkedEpisodes = Number(parts[4]) || 0;

      let totalRuntime = 0;
      let fetchedAt = 0;

      if (parts.length >= 7) {
        // New v1 format with runtime
        const rt = Number(parts[5]);
        if (rt > 0 && rt < 100000) totalRuntime = rt;
        fetchedAt = Number(parts[6]) || 0;
      } else {
        // Old v1 format without runtime
        fetchedAt = Number(parts[5]) || 0;
      }

      if (slug) {
        state.seriesMeta[slug] = { tmdbId, totalEpisodes, checkedEpisodes, totalRuntime, fetchedAt };
      }
      continue;
    }
  }

  return state;
}

// --- Export / Import ---

export function exportState(): string {
  const state = loadState();
  return JSON.stringify(state, null, 2);
}

export function importState(json: string): StorageState {
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed.watched !== "object") {
    throw new Error("Invalid import data: missing watched map");
  }
  const state: StorageState = {
    watched: parsed.watched ?? {},
    movieMeta: parsed.movieMeta ?? {},
    seriesMeta: parsed.seriesMeta ?? {},
  };
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
