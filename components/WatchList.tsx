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
  saveState,
  StorageAction,
  StorageState,
} from "@/lib/storage";
import WatchItem from "./WatchItem";
import ErrorBoundary from "./ErrorBoundary";
import { formatRuntime } from "@/lib/runtime";

const WELCOME_DISMISSED_KEY = "sw-welcome-dismissed";

type ToastData = {
  message: string;
  undoState?: StorageState;
};

export default function WatchList({ items }: { items: WatchItemType[] }) {
  const [query, setQuery] = useState("");
  const [showRemaining, setShowRemaining] = useState(false);
  const [state, dispatch] = useReducer(persistingReducer, emptyState());
  const [showWelcome, setShowWelcome] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

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

  // Auto-dismiss toast (longer for undo toasts)
  useEffect(() => {
    if (!toast) return;
    const delay = toast.undoState ? 5000 : 3000;
    const t = setTimeout(() => setToast(null), delay);
    return () => clearTimeout(t);
  }, [toast]);

  // Show an undo-able toast — snapshots current state before the action
  const showUndoToast = useCallback((message: string) => {
    setToast({ message, undoState: stateRef.current });
  }, []);

  const showSimpleToast = useCallback((message: string) => {
    setToast({ message });
  }, []);

  const handleUndo = useCallback(() => {
    if (toast?.undoState) {
      dispatch({ type: "HYDRATE", state: toast.undoState });
      saveState(toast.undoState);
      setToast({ message: "Undone" });
    }
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
  // Uses TMDB data when available, falls back to estimated runtimes from watchOrder
  const runtimeProgress = useMemo(() => {
    let totalMinutes = 0;
    let watchedMinutes = 0;
    for (const item of items) {
      if (item.type === "movie") {
        const meta = state.movieMeta[item.id];
        const movieRuntime = meta?.runtime ?? item.runtime ?? 0;
        totalMinutes += movieRuntime;
        if (state.watched[`movie:${item.id}`] && movieRuntime > 0) {
          watchedMinutes += movieRuntime;
        }
      } else {
        const meta = state.seriesMeta[item.id];
        const tmdbRuntime = meta && meta.totalRuntime > 0 && meta.totalRuntime < 100000 ? meta.totalRuntime : 0;
        const seriesRuntime = tmdbRuntime || item.runtime || 0;
        totalMinutes += seriesRuntime;
        if (state.watched[`series:${item.id}`]) {
          watchedMinutes += seriesRuntime;
        } else if (meta && meta.totalEpisodes > 0 && seriesRuntime > 0) {
          watchedMinutes += (meta.checkedEpisodes * seriesRuntime) / meta.totalEpisodes;
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

  // --- Next Up: first unwatched/incomplete item ---
  const nextUpId = useMemo(() => {
    for (const it of items) {
      if (it.type === "movie") {
        if (!state.watched[`movie:${it.id}`]) return it.id;
      } else {
        if (state.watched[`series:${it.id}`]) continue;
        const meta = state.seriesMeta[it.id];
        if (meta && meta.checkedEpisodes >= meta.totalEpisodes && meta.totalEpisodes > 0) continue;
        return it.id;
      }
    }
    return null;
  }, [items, state]);

  // --- Stats data ---
  const statsData = useMemo(() => {
    const movieCount = items.filter(i => i.type === "movie").length;
    const seriesCount = items.filter(i => i.type === "series").length;
    const remainingMinutes = runtimeProgress.totalMinutes - runtimeProgress.watchedMinutes;
    return { movieCount, seriesCount, remainingMinutes };
  }, [items, runtimeProgress]);

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
      showSimpleToast("Progress reset");
    }
  }, [showSimpleToast]);

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
    showSimpleToast("Progress exported");
  }, [showSimpleToast]);

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
        showSimpleToast("Progress imported successfully");
      } catch (err) {
        showSimpleToast(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [showSimpleToast]);

  // --- Share progress as image ---
  const handleShare = useCallback(() => {
    setMoreOpen(false);
    const pct = computeProgress;
    const watched = runtimeProgress.watchedMinutes;
    const total = runtimeProgress.totalMinutes;

    const W = 1200, H = 630;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Background
    const bg = ctx.createRadialGradient(W / 2, 0, 100, W / 2, H / 2, 700);
    bg.addColorStop(0, "#0a0d17");
    bg.addColorStop(0.6, "#05060a");
    bg.addColorStop(1, "#020307");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Starfield dots
    const rng = (seed: number) => {
      let s = seed;
      return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    };
    const rand = rng(42);
    for (let i = 0; i < 120; i++) {
      const x = rand() * W, y = rand() * H;
      const r = rand() * 1.5 + 0.3;
      const alpha = rand() * 0.5 + 0.2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
    }

    // Title
    ctx.textAlign = "center";
    ctx.fillStyle = "#e6f1ff";
    ctx.font = "bold 42px system-ui, -apple-system, sans-serif";
    ctx.shadowColor = "rgba(0,229,255,0.5)";
    ctx.shadowBlur = 16;
    ctx.fillText("STAR WARS — WATCH ORDER", W / 2, 80);
    ctx.shadowBlur = 0;

    // Percentage
    ctx.font = "bold 96px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#00e5ff";
    ctx.shadowColor = "rgba(0,229,255,0.6)";
    ctx.shadowBlur = 24;
    ctx.fillText(`${Math.round(pct)}%`, W / 2, 200);
    ctx.shadowBlur = 0;

    ctx.font = "18px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#a7b3c2";
    ctx.fillText("COMPLETE", W / 2, 230);

    // Progress bar
    const barX = 120, barY = 260, barW = W - 240, barH = 20, barR = 10;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, barR);
    ctx.fillStyle = "#0f1423";
    ctx.strokeStyle = "#1e2a3a";
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();

    if (pct > 0) {
      const fillW = Math.max(barH, (pct / 100) * barW);
      const beam = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
      beam.addColorStop(0, "rgba(0,229,255,0.3)");
      beam.addColorStop(0.5, "rgba(0,229,255,0.7)");
      beam.addColorStop(1, "rgba(255,230,0,0.8)");
      ctx.beginPath();
      ctx.roundRect(barX, barY, fillW, barH, barR);
      ctx.fillStyle = beam;
      ctx.fill();
      ctx.shadowColor = "rgba(0,229,255,0.6)";
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Runtime stats
    ctx.textAlign = "center";
    ctx.font = "20px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#a7b3c2";
    const watchedText = formatRuntime(watched) || "0m";
    const totalText = formatRuntime(total) || "0m";
    ctx.fillText(`${watchedText} watched / ${totalText} total`, W / 2, 315);

    // Title list
    const completedItems: string[] = [];
    const incompleteItems: string[] = [];
    for (const it of items) {
      const done = it.type === "movie"
        ? !!state.watched[`movie:${it.id}`]
        : !!state.watched[`series:${it.id}`];
      if (done) completedItems.push(it.title);
      else incompleteItems.push(it.title);
    }

    ctx.textAlign = "left";
    ctx.font = "16px system-ui, -apple-system, sans-serif";
    const listY = 360;
    const maxShow = 8;
    const allShow = [...completedItems.slice(0, maxShow)];
    const remaining = completedItems.length - allShow.length;

    allShow.forEach((title, i) => {
      const y = listY + i * 28;
      ctx.fillStyle = "#41ff7a";
      ctx.fillText("\u2713", 140, y);
      ctx.fillStyle = "#e6f1ff";
      ctx.fillText(title, 165, y);
    });

    if (remaining > 0) {
      const y = listY + allShow.length * 28;
      ctx.fillStyle = "#a7b3c2";
      ctx.fillText(`...and ${remaining} more completed`, 165, y);
    } else if (allShow.length < maxShow && incompleteItems.length > 0) {
      const spotsLeft = maxShow - allShow.length;
      const nextFew = incompleteItems.slice(0, Math.min(spotsLeft, 3));
      nextFew.forEach((title, i) => {
        const y = listY + (allShow.length + i) * 28;
        ctx.fillStyle = "#1e2a3a";
        ctx.fillText("\u25CB", 140, y);
        ctx.fillStyle = "#6b7a8d";
        ctx.fillText(title, 165, y);
      });
    }

    // Watermark
    ctx.textAlign = "center";
    ctx.font = "14px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#4a5568";
    ctx.fillText("Star Wars Watch Order Tracker", W / 2, H - 30);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "star-wars-progress.png";
      a.click();
      URL.revokeObjectURL(url);
      showSimpleToast("Progress image saved");
    }, "image/png");
  }, [computeProgress, runtimeProgress, items, state, showSimpleToast]);

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
          <span>{toast.message}</span>
          {toast.undoState && (
            <button className="toast__undo" onClick={handleUndo}>
              Undo
            </button>
          )}
        </div>
      )}

      <header style={{ display: "grid", gap: 8 }}>
        <div className="stats-bar" aria-label="Watch progress statistics">
          <span className="stat">
            <strong>{items.length}</strong> titles ({statsData.movieCount} movies · {statsData.seriesCount} series)
          </span>
          <span className="stat stat--accent">
            <strong>{formatRuntime(statsData.remainingMinutes)}</strong> remaining
          </span>
          <span className="stat">
            <strong>{watchedCount}</strong> of {items.length} checked
          </span>
        </div>
        <div className="header-row">
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0 }}>Your Watch Order</h2>
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
                <button className="more-menu__item" role="menuitem" onClick={handleShare}>
                  Share Progress
                </button>
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
                <WatchItem item={it} state={state} dispatch={dispatch} isNextUp={it.id === nextUpId} onUndoToast={showUndoToast} />
              </ErrorBoundary>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
