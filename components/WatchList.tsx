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

const WELCOME_DISMISSED_KEY = "sw-welcome-dismissed";

export default function WatchList({ items }: { items: WatchItemType[] }) {
  const [query, setQuery] = useState("");
  const [showRemaining, setShowRemaining] = useState(false);
  const [state, dispatch] = useReducer(persistingReducer, emptyState());
  const [showWelcome, setShowWelcome] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch({ type: "HYDRATE", state: loadState() });
    // Show welcome banner if never dismissed
    if (typeof window !== "undefined" && !localStorage.getItem(WELCOME_DISMISSED_KEY)) {
      setShowWelcome(true);
    }
  }, []);

  // Close "More" menu when clicking outside
  useEffect(() => {
    if (!moreOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [moreOpen]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    localStorage.setItem(WELCOME_DISMISSED_KEY, "1");
  }, []);

  // --- Progress computation (title-based) ---
  const computeProgress = useMemo(() => {
    let sumContrib = 0;
    for (const it of items) {
      if (it.type === "movie") {
        sumContrib += state.watched[`movie:${it.id}`] ? 1 : 0;
      } else {
        if (state.watched[`series:${it.id}`]) {
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
          if (state.watched[`series:${item.id}`]) {
            watchedMinutes += seriesRuntime;
          } else if (meta.totalEpisodes > 0 && seriesRuntime > 0) {
            watchedMinutes += (meta.checkedEpisodes * seriesRuntime) / meta.totalEpisodes;
          }
        }
      }
    }
    return { totalMinutes: Math.round(totalMinutes), watchedMinutes: Math.round(watchedMinutes) };
  }, [state, items]);

  // --- Quick count ---
  const watchedCount = useMemo(() => {
    return Object.keys(state.watched).filter(
      (key) => key.startsWith("movie:") || key.startsWith("tv:") || key.startsWith("series:")
    ).length;
  }, [state.watched]);

  // --- Remaining count ---
  const remainingCount = useMemo(() => {
    return items.filter((it) => {
      if (it.type === "movie") return !state.watched[`movie:${it.id}`];
      if (state.watched[`series:${it.id}`]) return false;
      const meta = state.seriesMeta[it.id];
      if (meta) return meta.checkedEpisodes < meta.totalEpisodes;
      return true;
    }).length;
  }, [state, items]);

  // --- Filter ---
  const filtered = items.filter((it) => {
    if (query.trim()) {
      if (!it.title.toLowerCase().includes(query.toLowerCase())) return false;
    }
    if (showRemaining) {
      if (it.type === "movie") return !state.watched[`movie:${it.id}`];
      if (state.watched[`series:${it.id}`]) return false;
      const meta = state.seriesMeta[it.id];
      if (meta) return meta.checkedEpisodes < meta.totalEpisodes;
      return true;
    }
    return true;
  });

  // --- Reset with confirmation ---
  const handleReset = useCallback(() => {
    if (window.confirm("Reset all progress? This cannot be undone.")) {
      dispatch({ type: "RESET" });
      setMoreOpen(false);
      setToast("Progress reset");
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
    setMoreOpen(false);
    setToast("Progress exported");
  }, []);

  // --- Import ---
  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
    setMoreOpen(false);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = importState(reader.result as string);
        dispatch({ type: "HYDRATE", state: imported });
        setToast("Progress imported successfully");
      } catch (err) {
        setToast(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  return (
    <div className="card main-card" role="main" aria-label="Star Wars watch order tracker">
      {/* Welcome banner — shown once for new users */}
      {showWelcome && (
        <div className="welcome-banner" role="status">
          <div className="welcome-banner__content">
            <strong>Welcome!</strong> Track your Star Wars progress in chronological order.
            Check off movies and expand series to track individual episodes.
            Your progress is saved locally in your browser.
          </div>
          <button className="button button--ghost welcome-banner__close" onClick={dismissWelcome} aria-label="Dismiss welcome message">
            Got it
          </button>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}

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
            {showRemaining ? "Show All" : `Remaining (${remainingCount})`}
          </button>

          {/* "More" dropdown for Export / Import / Reset */}
          <div className="more-menu" ref={moreRef}>
            <button
              className="button button--ghost"
              onClick={() => setMoreOpen((s) => !s)}
              aria-expanded={moreOpen}
              aria-haspopup="true"
              aria-label="More actions"
            >
              More ▾
            </button>
            {moreOpen && (
              <div className="more-menu__dropdown" role="menu">
                <button className="more-menu__item" role="menuitem" onClick={handleExport}>
                  Export Progress
                </button>
                <button className="more-menu__item" role="menuitem" onClick={handleImport}>
                  Import Progress
                </button>
                <button className="more-menu__item more-menu__item--danger" role="menuitem" onClick={handleReset}>
                  Reset All
                </button>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </nav>

        {/* Legend for asterisk badges */}
        <div className="legend" aria-label="Badge legend">
          <span className="legend__item"><span className="badge">*</span> Optional anthology</span>
          <span className="legend__item"><span className="badge">**</span> Supplementary</span>
          <span className="legend__item"><span className="badge">***</span> Skippable</span>
        </div>
      </header>

      <ul
        className="list main-list"
        role="list"
        aria-label={`${filtered.length} ${showRemaining ? "remaining" : ""} Star Wars titles`}
      >
        {filtered.length === 0 ? (
          <li className="empty-state" role="listitem">
            <div className="empty-state__icon">🔍</div>
            <div className="empty-state__text">
              {query.trim()
                ? `No titles matching "${query}"`
                : showRemaining
                  ? "All caught up — nothing remaining!"
                  : "No titles to show."}
            </div>
            {(query.trim() || showRemaining) && (
              <button
                className="button button--ghost"
                onClick={() => { setQuery(""); setShowRemaining(false); }}
              >
                Clear Filters
              </button>
            )}
          </li>
        ) : (
          filtered.map((it) => (
            <li key={it.id} role="listitem">
              <ErrorBoundary>
                <WatchItem item={it} state={state} dispatch={dispatch} />
              </ErrorBoundary>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
