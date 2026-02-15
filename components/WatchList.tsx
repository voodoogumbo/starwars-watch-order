"use client";
import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { WatchItem as WatchItemType } from "@/data/watchOrder";
import ProgressBar from "./ProgressBar";
import {
  emptyState,
  exportState,
  importState,
  loadState,
  persistingReducer,
  StorageAction,
  StorageState,
} from "@/lib/storage";
import WatchItem from "./WatchItem";
import ErrorBoundary from "./ErrorBoundary";

export default function WatchList({ items }: { items: WatchItemType[] }) {
  const [query, setQuery] = useState("");
  const [showRemaining, setShowRemaining] = useState(false);
  const [state, dispatch] = useReducer(persistingReducer, emptyState());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dispatch({ type: "HYDRATE", state: loadState() });
  }, []);

  // --- Progress computation (title-based) ---
  const computeProgress = useMemo(() => {
    let sumContrib = 0;

    for (const it of items) {
      if (it.type === "movie") {
        sumContrib += state.watched[`movie:${it.id}`] ? 1 : 0;
      } else {
        const seriesKey = `series:${it.id}`;
        if (state.watched[seriesKey]) {
          sumContrib += 1;
        } else {
          const meta = state.seriesMeta[it.id];
          if (meta && meta.totalEpisodes > 0) {
            sumContrib += meta.checkedEpisodes / meta.totalEpisodes;
          }
        }
      }
    }

    const percent = (sumContrib / items.length) * 100;
    return Math.round(percent * 100) / 100;
  }, [state, items]);

  // --- Runtime-based progress ---
  const runtimeProgress = useMemo(() => {
    let totalMinutes = 0;
    let watchedMinutes = 0;

    for (const item of items) {
      if (item.type === "movie") {
        const meta = state.movieMeta[item.id];
        const movieRuntime = meta?.runtime ?? 0;
        totalMinutes += movieRuntime;
        if (state.watched[`movie:${item.id}`] && movieRuntime > 0) {
          watchedMinutes += movieRuntime;
        }
      } else {
        const meta = state.seriesMeta[item.id];
        if (meta) {
          const seriesRuntime = meta.totalRuntime > 0 && meta.totalRuntime < 100000 ? meta.totalRuntime : 0;
          totalMinutes += seriesRuntime;

          const seriesKey = `series:${item.id}`;
          if (state.watched[seriesKey]) {
            watchedMinutes += seriesRuntime;
          } else if (meta.totalEpisodes > 0 && seriesRuntime > 0) {
            const avgEpisodeRuntime = seriesRuntime / meta.totalEpisodes;
            watchedMinutes += meta.checkedEpisodes * avgEpisodeRuntime;
          }
        }
      }
    }

    return {
      totalMinutes: Math.round(totalMinutes),
      watchedMinutes: Math.round(watchedMinutes),
    };
  }, [state, items]);

  // --- Quick count ---
  const watchedCount = useMemo(() => {
    return Object.keys(state.watched).filter(
      (key) => key.startsWith("movie:") || key.startsWith("tv:") || key.startsWith("series:")
    ).length;
  }, [state.watched]);

  // --- Filter ---
  const filtered = items.filter((it) => {
    if (query.trim()) {
      if (!it.title.toLowerCase().includes(query.toLowerCase())) return false;
    }
    if (showRemaining) {
      if (it.type === "movie") {
        return !state.watched[`movie:${it.id}`];
      } else {
        if (state.watched[`series:${it.id}`]) return false;
        const meta = state.seriesMeta[it.id];
        if (meta) return meta.checkedEpisodes < meta.totalEpisodes;
        return true;
      }
    }
    return true;
  });

  // --- Reset with confirmation ---
  const handleReset = useCallback(() => {
    if (window.confirm("Reset all progress? This cannot be undone.")) {
      dispatch({ type: "RESET" });
    }
  }, []);

  // --- Export ---
  const handleExport = useCallback(() => {
    const json = exportState();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "star-wars-watch-order.json";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // --- Import ---
  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = importState(reader.result as string);
        dispatch({ type: "HYDRATE", state: imported });
      } catch (err) {
        alert(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  }, []);

  return (
    <div className="card main-card" role="main" aria-label="Star Wars watch order tracker">
      <header style={{ display: "grid", gap: 8 }}>
        <div className="header-row">
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0 }}>Your Watch Order</h2>
            <div className="header-stats" aria-live="polite">
              {watchedCount} items checked · {items.length} top-level titles
            </div>
          </div>
          <div className="header-progress" role="img" aria-label={`Progress: ${computeProgress}% complete`}>
            <ProgressBar
              percent={computeProgress}
              watchedMinutes={runtimeProgress.watchedMinutes}
              totalMinutes={runtimeProgress.totalMinutes}
            />
          </div>
        </div>

        <nav className="controls controls-bar" aria-label="Watch order controls">
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
            aria-label={`Show ${showRemaining ? "all items" : "only remaining items"}`}
          >
            {showRemaining ? "Show All" : "Show Remaining"}
          </button>
          <button className="button button--ghost" onClick={handleExport} aria-label="Export progress as JSON">
            Export
          </button>
          <button className="button button--ghost" onClick={handleImport} aria-label="Import progress from JSON file">
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <button
            className="button button--danger"
            onClick={handleReset}
            aria-label="Reset all progress and clear all checkboxes"
          >
            Reset
          </button>
        </nav>
      </header>

      <ul
        className="list main-list"
        role="list"
        aria-label={`${filtered.length} ${showRemaining ? "remaining" : ""} Star Wars titles`}
      >
        {filtered.map((it) => (
          <li key={it.id} role="listitem">
            <ErrorBoundary>
              <WatchItem item={it} state={state} dispatch={dispatch} />
            </ErrorBoundary>
          </li>
        ))}
      </ul>
    </div>
  );
}
