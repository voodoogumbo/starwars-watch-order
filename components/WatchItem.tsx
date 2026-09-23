"use client";
import React, { useMemo, useState } from "react";
import type { WatchItem as WatchItemType, TVSeriesData } from "@/data/watchOrder";
import type { StorageAction, Watched } from "@/lib/storage";
import { episodeKey, episodePrefix, titleKey, titleProgress } from "@/lib/progress";
import { EpisodeListSkeleton } from "./Skeleton";
import { formatRuntime, formatRating } from "@/lib/runtime";

const TMDB_IMG = "https://image.tmdb.org/t/p/w154";

type Props = {
  item: WatchItemType;
  watched: Watched;
  dispatch: React.Dispatch<StorageAction>;
  isNextUp?: boolean;
  onUndoToast?: (message: string) => void;
};

function friendlyError(raw: string): string {
  if (raw.includes("404")) return "Title not found on TMDB. It may not be listed yet.";
  if (raw.includes("429")) return "Too many requests — please wait a moment and try again.";
  if (raw.includes("500") || raw.includes("502") || raw.includes("503"))
    return "TMDB is temporarily unavailable. Try again shortly.";
  if (raw.includes("fetch") || raw.includes("network") || raw.includes("Failed"))
    return "Network error — check your connection and try again.";
  return raw;
}

export default function WatchItem({ item, watched, dispatch, isNextUp, onUndoToast }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tvData, setTvData] = useState<TVSeriesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isMovie = item.type === "movie";
  const watchedKey = titleKey(item);

  // Prefer a freshly fetched episode list; fall back to the server-rendered one.
  const episodeKeys = useMemo(() => {
    if (!tvData) return item.episodes ?? [];
    return tvData.seasons.flatMap((s) =>
      s.episodes.map((e) => episodeKey(item.tmdbId, s.season_number, e.episode_number))
    );
  }, [tvData, item.episodes, item.tmdbId]);

  const progress = titleProgress(item, watched, episodeKeys);
  const isChecked = progress.done;

  const posterPath = item.poster ?? tvData?.poster_path;
  const posterUrl = posterPath ? `${TMDB_IMG}${posterPath}` : null;
  const runtime = tvData?.runtime ?? item.runtime;
  const rating = tvData?.rating ?? item.rating;

  const toggleWatched = () => {
    onUndoToast?.(
      isChecked
        ? `Unmarked "${item.title}"`
        : `Marked "${item.title}" as ${isMovie ? "watched" : "complete"}`
    );
    if (isMovie) {
      dispatch({ type: "TOGGLE_WATCHED", key: watchedKey });
    } else {
      setAllEpisodes(!isChecked);
    }
  };

  // Checking sets every known episode; unchecking clears every stored episode
  // for this series, so it works even before the episode list has loaded.
  const setAllEpisodes = (checked: boolean) => {
    dispatch({
      type: "SET_SERIES",
      seriesKey: watchedKey,
      prefix: episodePrefix(item.tmdbId),
      episodeKeys,
      checked,
    });
  };

  const loadEpisodes = async () => {
    if (isMovie || loading) return;
    try {
      setLoading(true);
      setError(null);
      const resp = await fetch(`/api/tmdb/tv/${item.tmdbId}`);
      if (!resp.ok) throw new Error(`TMDB tv fetch failed: ${resp.status} ${resp.statusText}`);
      const tvjson = (await resp.json()) as TVSeriesData;
      if (!tvjson?.seasons) throw new Error("Invalid TV data received from TMDB");
      setTvData(tvjson);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(msg);
      setError(friendlyError(msg));
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !tvData) loadEpisodes();
  };

  const retry = () => {
    setExpanded(true);
    loadEpisodes();
  };

  const toggleEpisode = (seasonNumber: number, episodeNumber: number) => {
    dispatch({
      type: "TOGGLE_EPISODE",
      key: episodeKey(item.tmdbId, seasonNumber, episodeNumber),
      seriesKey: watchedKey,
      episodeKeys,
    });
  };

  return (
    <div className={`list-item card list-item-card${isNextUp ? " list-item--next-up" : ""}`}>
      {/* COMPLETE and NEXT UP share the same corner slot — keep them mutually
          exclusive explicitly so they can never overlap, regardless of how
          isChecked / isNextUp are derived upstream. */}
      {isChecked ? (
        <span className="complete-badge" aria-label="Completed">COMPLETE</span>
      ) : isNextUp ? (
        <span className="next-up-badge" aria-label="Next up to watch">NEXT UP</span>
      ) : null}
      {/* Poster + checkbox column */}
      <div className="watch-item-row">
        <button
          className={`check ${isChecked ? "checked" : ""}`}
          onClick={toggleWatched}
          aria-pressed={isChecked}
          aria-label={isMovie ? `Mark "${item.title}" as ${isChecked ? "unwatched" : "watched"}` : `Mark "${item.title}" as ${isChecked ? "incomplete" : "complete"}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>

      {/* Poster + info */}
      <div className="watch-item-row" style={{ minWidth: 0 }}>
        {posterUrl && (
          <img
            className="watch-item-poster"
            src={posterUrl}
            alt=""
            width={66}
            height={99}
            loading="lazy"
          />
        )}
        <div className="watch-item-info">
          <div className="watch-item-title-row">
            <div className="watch-item-title">{item.title}</div>
            <div className="badges">
              <span className="badge">{item.year}</span>
            </div>
          </div>
          <div className="meta-text">
            {isMovie ? "Movie" : "Series"} {!isMovie && progress.total > 0 ? `· ${progress.total} episodes` : ""}
            {runtime ? <span className="meta-text--inline">• {formatRuntime(runtime)}</span> : null}
            {rating ? <span className="meta-text--inline">• ⭐ {formatRating(rating)}</span> : null}
          </div>
          {/* Series progress preview (collapsed state) */}
          {!isMovie && !isChecked && progress.checked > 0 && (
            <div className="series-preview">
              <div className="series-preview__bar">
                <div
                  className="series-preview__fill"
                  style={{ width: `${Math.round(progress.fraction * 100)}%` }}
                />
              </div>
              <span className="series-preview__label">
                {progress.checked}/{progress.total} episodes
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="watch-item-actions">
        {!isMovie && (
          <>
            <button
              className="button button--ghost"
              onClick={toggleExpanded}
              aria-expanded={expanded}
              aria-label={`${expanded ? "Collapse" : "Expand"} episode list for ${item.title}`}
              disabled={loading && !tvData}
            >
              {expanded ? "Collapse" : loading ? "Loading…" : "Expand"}
            </button>
            {tvData && (
              <button
                className="button button--ghost refresh-btn"
                onClick={loadEpisodes}
                aria-label={`Refresh episode data for ${item.title}`}
                disabled={loading}
                title="Refresh to check for new episodes"
              >
                🔄 Refresh
              </button>
            )}
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="error-panel" role="alert">
          <div className="error-panel__message">
            <strong>Error:</strong> {error}
          </div>
          <button className="button button--ghost error-panel__retry" onClick={retry}>
            Try Again
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {!isMovie && expanded && loading && !tvData && <EpisodeListSkeleton />}

      {/* Episode list with smooth expand */}
      <div className={`episodes-collapsible ${!isMovie && expanded && tvData ? "episodes-collapsible--open" : ""}`}>
        <div className="episodes-collapsible__inner">
        {!isMovie && tvData && (
          <div className="episodes episodes-panel">
            <div className="episode-actions">
              <button className="button button--ghost episode-btn" onClick={() => setAllEpisodes(true)} aria-label={`Mark all episodes of ${item.title} as watched`}>
                Mark All Watched
              </button>
              <button className="button button--ghost episode-btn" onClick={() => setAllEpisodes(false)} aria-label={`Mark all episodes of ${item.title} as unwatched`}>
                Mark All Unwatched
              </button>
              <div className="episode-actions__count">{progress.checked} of {progress.total} episodes watched</div>
            </div>
            {tvData.seasons.map((s) => {
              const total = s.episodes.length;
              const checked = s.episodes.filter(
                (e) => watched[episodeKey(item.tmdbId, s.season_number, e.episode_number)]
              ).length;
              const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
              return (
                <div key={s.season_number} style={{ display: "grid", gap: 6 }}>
                  <div className="season-header">
                    <div className="season-heading">Season {s.season_number}</div>
                    <div className="season-progress">
                      <div className="season-progress__bar">
                        <div className="season-progress__fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="season-progress__label">{checked}/{total}</span>
                    </div>
                  </div>
                  {s.episodes.map((e) => {
                    const key = episodeKey(item.tmdbId, s.season_number, e.episode_number);
                    const epChecked = !!watched[key];
                    return (
                      <div key={key} className="episode-item">
                        <button
                          className={`check ${epChecked ? "checked" : ""}`}
                          onClick={() => toggleEpisode(s.season_number, e.episode_number)}
                          aria-pressed={epChecked}
                          aria-label={`Mark episode ${e.episode_number}, "${e.name}" as ${epChecked ? "unwatched" : "watched"}`}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </button>
                        <div className="episode-name">
                          <div className="episode-title">{e.episode_number}. {e.name}</div>
                          <div className="meta-text" style={{ marginTop: 0 }}>
                            {e.air_date ?? "TBA"}
                            {e.runtime ? <span className="meta-text--inline">• {e.runtime}m</span> : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
