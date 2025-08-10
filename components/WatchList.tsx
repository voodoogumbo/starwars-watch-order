"use client";
import React, { useEffect, useMemo, useState } from "react";
import { WatchItem as WatchItemType } from "@/data/watchOrder";
import ProgressBar from "./ProgressBar";
import { loadState, resetState, setKey, toggleKey, StorageState } from "@/lib/storage";
import WatchItem from "./WatchItem";
import ErrorBoundary from "./ErrorBoundary";

export default function WatchList({ items }: { items: WatchItemType[] }) {
  const [query, setQuery] = useState("");
  const [showRemaining, setShowRemaining] = useState(false);
  const [state, setState] = useState<StorageState>({});
  const [ignoreMotion, setIgnoreMotion] = useState(false);

  useEffect(() => {
    setState(loadState());
  }, []);

  // Handler wrappers to update local state + storage helpers
  const onToggle = (key: string) => {
    const next = toggleKey(state, key);
    setState(next);
  };
  const onSet = (key: string, checked: boolean) => {
    const next = setKey(state, key, checked);
    setState(next);
  };
  const onReset = () => {
    resetState();
    setState({});
  };

  // Compute title-based progress:
  // For movies: 1 or 0. For series: fraction determined by number of episodes checked vs total episodes (we store per-episode keys).
  // To compute, we need metadata from items + rough denominator. For series with no episode data known yet, treat as 0 until expanded/resolved.
  // We'll compute an approximate percent using local keys: series contribution = (checkedEpisodeKeysForThisSeries / totalEpisodeKeysDiscoveredForThisSeries) if discovered, otherwise 0.
  // This means overall percent will update as series episodes get fetched when the user expands a series.

  // Helper: find keys belonging to a series by pattern `tv:{tmdbId}:S{season}:E{episode}` or by local sentinel `series-unresolved:{slug}` for unresolved.
  // We'll detect tv keys by prefix "tv:" and movie keys by "movie:"

  const totalTitles = items.length;

  const computeProgress = useMemo(() => {
    let sumContrib = 0;
    let countedTitles = 0;

    for (const it of items) {
      countedTitles += 1;
      if (it.type === "movie") {
        const key = `movie:${it.id}`;
        sumContrib += state[key] ? 1 : 0;
      } else {
        // For series, check if the top-level series is marked as complete first
        const seriesKey = `movie:${it.id}`; // Using same pattern as movies for top-level completion
        
        if (state[seriesKey]) {
          // Top-level series is checked = 100% complete
          sumContrib += 1;
        } else {
          // Check episode-level progress
          const metaKeyPrefix = `series-meta:${it.id}:`;
          const metaEntry = Object.keys(state).find((k) => k.startsWith(metaKeyPrefix));
          if (metaEntry) {
            // meta key format: series-meta:{slug}:{tmdbId}:{total}:{checkedCount}:{timestamp}
            const parts = metaEntry.split(":");
            const total = Number(parts[4] ?? 0); // total is at index 4
            const checked = Number(parts[5] ?? 0); // checked is at index 5
            if (total > 0) sumContrib += checked / total;
            else sumContrib += 0;
          } else {
            // No episode data loaded yet
            sumContrib += 0;
          }
        }
      }
    }

    const percent = (sumContrib / countedTitles) * 100;
    return Math.round(percent * 100) / 100;
  }, [state, items]);

  // Quick counts - only count actual watched items, not metadata
  const watchedCount = useMemo(() => {
    return Object.keys(state).filter(key => {
      // Only count movie: and tv: keys, not series-meta: keys
      return key.startsWith('movie:') || key.startsWith('tv:');
    }).length;
  }, [state]);

  // Filtered items by search / remaining
  const filtered = items.filter((it) => {
    if (query.trim()) {
      const q = query.toLowerCase();
      if (!it.title.toLowerCase().includes(q)) return false;
    }
    if (showRemaining) {
      // remaining means at top-level not fully watched: movie unchecked or series not fully completed
      if (it.type === "movie") {
        const key = `movie:${it.id}`;
        if (state[key]) return false;
        return true;
      } else {
        // For series, check if top-level is complete first
        const seriesKey = `movie:${it.id}`;
        if (state[seriesKey]) {
          return false; // Top-level complete, not remaining
        }
        
        // Check episode-level completion
        const metaKeyPrefix = `series-meta:${it.id}:`;
        const metaEntry = Object.keys(state).find((k) => k.startsWith(metaKeyPrefix));
        if (metaEntry) {
          const parts = metaEntry.split(":");
          const total = Number(parts[4] ?? 0); // total is at index 4
          const checked = Number(parts[5] ?? 0); // checked is at index 5
          return checked < total;
        }
        // fallback: if no meta, show it as remaining
        return true;
      }
    }
    return true;
  });

  return (
    <div className="card" style={{ padding: 14, display: "grid", gap: 12 }} role="main" aria-label="Star Wars watch order tracker">
      <header style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0 }}>Your Watch Order</h2>
            <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }} aria-live="polite">
              {watchedCount} items checked · {totalTitles} top-level titles
            </div>
          </div>
          <div style={{ width: 360, maxWidth: "50%" }} role="img" aria-label={`Progress: ${computeProgress}% complete`}>
            <ProgressBar percent={computeProgress} />
          </div>
        </div>

        <nav className="controls" style={{ marginTop: 6 }} aria-label="Watch order controls">
          <input
            className="input"
            placeholder="Search titles..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search Star Wars titles and series"
            type="search"
          />
          <button
            className="button button--ghost"
            onClick={() => setShowRemaining((s) => !s)}
            aria-pressed={showRemaining}
            aria-label={`Show ${showRemaining ? 'all items' : 'only remaining items'}`}
          >
            {showRemaining ? "Show All" : "Show Remaining"}
          </button>
          <button
            className="button button--danger"
            onClick={onReset}
            aria-label="Reset all progress and clear all checkboxes"
          >
            Reset
          </button>
        </nav>
      </header>

      <ul className="list" style={{ marginTop: 6, listStyle: "none", padding: 0, margin: 0 }} role="list" aria-label={`${filtered.length} ${showRemaining ? 'remaining' : ''} Star Wars titles`}>
        {filtered.map((it) => (
          <li key={it.id} role="listitem">
            <ErrorBoundary>
              <WatchItem
                item={it}
                storageState={state}
                onToggleKey={onToggle}
                onSetKey={onSet}
                onSaveState={(s) => setState(s)}
              />
            </ErrorBoundary>
          </li>
        ))}
      </ul>

    </div>
  );
}
