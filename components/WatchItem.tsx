"use client";
import React, { useMemo, useState } from "react";
import type { WatchItem as WatchItemType, TVSeriesData } from "@/data/watchOrder";
import type { StorageAction, StorageState } from "@/lib/storage";
import { EpisodeListSkeleton } from "./Skeleton";
import { formatRuntime, formatRating } from "@/lib/runtime";

const TMDB_IMG = "https://image.tmdb.org/t/p/w154";

type Props = {
  item: WatchItemType;
  state: StorageState;
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
  if (raw.includes("No TMDB id")) return "Could not find this title on TMDB.";
  return raw;
}

export default function WatchItem({ item, state, dispatch, isNextUp, onUndoToast }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [tvData, setTvData] = useState<TVSeriesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isMovie = item.type === "movie";

  const watchedKey = isMovie ? `movie:${item.id}` : `series:${item.id}`;
  const isChecked = !!state.watched[watchedKey];

  const movieMeta = state.movieMeta[item.id];
  const seriesMeta = state.seriesMeta[item.id];
  const resolvedTmdbId = isMovie ? movieMeta?.tmdbId ?? null : seriesMeta?.tmdbId ?? null;
  const lastFetched = isMovie ? movieMeta?.fetchedAt ?? null : seriesMeta?.fetchedAt ?? null;

  // Poster URL from meta or tvData
  const posterUrl = useMemo(() => {
    if (isMovie && movieMeta?.poster) return `${TMDB_IMG}${movieMeta.poster}`;
    if (!isMovie && seriesMeta?.poster) return `${TMDB_IMG}${seriesMeta.poster}`;
    if (!isMovie && tvData?.poster_path) return `${TMDB_IMG}${tvData.poster_path}`;
    return null;
  }, [isMovie, movieMeta, seriesMeta, tvData]);

  const totalEpisodesKnown = useMemo(() => {
    if (!tvData) return 0;
    return tvData.seasons.reduce((sum, s) => sum + (s.episodes?.length ?? 0), 0);
  }, [tvData]);

  const checkedEpisodesCount = useMemo(() => {
    if (!resolvedTmdbId) return 0;
    const prefix = `tv:${resolvedTmdbId}:`;
    return Object.keys(state.watched).filter((k) => k.startsWith(prefix)).length;
  }, [state.watched, resolvedTmdbId]);

  const isDataStale = useMemo(() => {
    if (!lastFetched) return false;
    return lastFetched < Date.now() - 30 * 24 * 60 * 60 * 1000;
  }, [lastFetched]);

  // Season-level progress
  const seasonProgress = useMemo(() => {
    if (!tvData || !resolvedTmdbId) return null;
    return tvData.seasons.map((s) => {
      const total = s.episodes?.length ?? 0;
      const checked = s.episodes.filter(
        (e) => !!state.watched[`tv:${resolvedTmdbId}:S${s.season_number}:E${e.episode_number}`]
      ).length;
      return { season: s.season_number, total, checked };
    });
  }, [tvData, resolvedTmdbId, state.watched]);

  const fetchMovieData = async () => {
    if (!isMovie || movieMeta || resolving) return;
    try {
      setResolving(true);
      setError(null);
      const resp = await fetch(
        `/api/tmdb/resolve?title=${encodeURIComponent(item.title)}&year=${item.year}&type=movie`
      );
      if (!resp.ok) throw new Error(`TMDB resolve failed: ${resp.status} ${resp.statusText}`);
      const data = await resp.json();
      if (data.error) throw new Error(data.message || data.error);
      if (!data?.id) throw new Error("No TMDB id found for this movie");
      dispatch({
        type: "UPDATE_MOVIE_META",
        slug: item.id,
        meta: {
          tmdbId: data.id,
          runtime: data.runtime || 0,
          rating: data.rating || 0,
          poster: data.poster_path || undefined,
          fetchedAt: Date.now(),
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Error fetching movie data:", msg);
      setError(friendlyError(msg));
    } finally {
      setResolving(false);
    }
  };

  const toggleWatched = async () => {
    if (isMovie) {
      if (!movieMeta && !resolving) await fetchMovieData();
      onUndoToast?.(isChecked ? `Unmarked "${item.title}"` : `Marked "${item.title}" as watched`);
      dispatch({ type: "TOGGLE_WATCHED", key: watchedKey });
    } else {
      const wasChecked = isChecked;
      onUndoToast?.(wasChecked ? `Unmarked "${item.title}"` : `Marked "${item.title}" as complete`);
      dispatch({ type: "TOGGLE_WATCHED", key: watchedKey });
      if (tvData && resolvedTmdbId) {
        const episodeKeys: string[] = [];
        for (const s of tvData.seasons) {
          for (const e of s.episodes) {
            episodeKeys.push(`tv:${resolvedTmdbId}:S${s.season_number}:E${e.episode_number}`);
          }
        }
        dispatch({ type: "BULK_SET_EPISODES", keys: episodeKeys, checked: !wasChecked });
        dispatch({
          type: "UPDATE_SERIES_META",
          slug: item.id,
          meta: {
            tmdbId: resolvedTmdbId,
            totalEpisodes: episodeKeys.length,
            checkedEpisodes: wasChecked ? 0 : episodeKeys.length,
            totalRuntime: tvData.runtime || 0,
            poster: tvData.poster_path || seriesMeta?.poster,
            fetchedAt: Date.now(),
          },
        });
      }
    }
  };

  const handleExpand = async (forceRefresh = false) => {
    if (isMovie) return;
    setExpanded((s) => !s);
    if ((tvData && !forceRefresh) || resolving) return;
    if (!item.title?.trim()) { setError("Invalid series title"); return; }
    if (!item.year || item.year < 1900 || item.year > 2100) { setError("Invalid release year"); return; }

    try {
      setResolving(true);
      setError(null);
      const resolveResp = await fetch(
        `/api/tmdb/resolve?title=${encodeURIComponent(item.title)}&year=${item.year}&type=series`
      );
      if (!resolveResp.ok) throw new Error(`TMDB resolve failed: ${resolveResp.status} ${resolveResp.statusText}`);
      const resolveData = await resolveResp.json();
      if (resolveData.error) throw new Error(resolveData.message || resolveData.error);
      if (!resolveData?.id) throw new Error("No TMDB id found for this series");

      const idToFetch = resolveData.id;
      const tvResp = await fetch(`/api/tmdb/tv/${idToFetch}`);
      if (!tvResp.ok) throw new Error(`TMDB tv fetch failed: ${tvResp.status} ${tvResp.statusText}`);
      const tvjson = await tvResp.json() as TVSeriesData;
      if (!tvjson?.seasons) throw new Error("Invalid TV data received from TMDB");

      setTvData(tvjson);

      const total = tvjson.seasons.reduce((acc, s) => acc + (s.episodes?.length ?? 0), 0);
      const prefix = `tv:${idToFetch}:`;
      const checked = Object.keys(state.watched).filter((k) => k.startsWith(prefix)).length;
      const poster = tvjson.poster_path || resolveData.poster_path || undefined;

      if (isChecked && checked < total) {
        const episodeKeys: string[] = [];
        for (const s of tvjson.seasons) {
          for (const e of s.episodes) {
            episodeKeys.push(`tv:${idToFetch}:S${s.season_number}:E${e.episode_number}`);
          }
        }
        dispatch({ type: "BULK_SET_EPISODES", keys: episodeKeys, checked: true });
        dispatch({
          type: "UPDATE_SERIES_META",
          slug: item.id,
          meta: { tmdbId: idToFetch, totalEpisodes: total, checkedEpisodes: total, totalRuntime: tvjson.runtime || 0, poster, fetchedAt: Date.now() },
        });
        return;
      }

      dispatch({
        type: "UPDATE_SERIES_META",
        slug: item.id,
        meta: { tmdbId: idToFetch, totalEpisodes: total, checkedEpisodes: checked, totalRuntime: tvjson.runtime || 0, poster, fetchedAt: Date.now() },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(msg);
      setError(friendlyError(msg));
    } finally {
      setResolving(false);
    }
  };

  const refreshEpisodes = async () => {
    if (isMovie) return;
    setTvData(null);
    setError(null);
    await handleExpand(true);
  };

  const toggleEpisode = (seasonNumber: number, episodeNumber: number) => {
    if (!resolvedTmdbId) return;
    const key = `tv:${resolvedTmdbId}:S${seasonNumber}:E${episodeNumber}`;
    const wasChecked = !!state.watched[key];
    dispatch({ type: "TOGGLE_WATCHED", key });

    const prefix = `tv:${resolvedTmdbId}:`;
    const currentChecked = Object.keys(state.watched).filter((k) => k.startsWith(prefix)).length;
    const newChecked = wasChecked ? currentChecked - 1 : currentChecked + 1;
    const total = totalEpisodesKnown || 0;

    if (newChecked === total && total > 0) {
      dispatch({ type: "SET_WATCHED", key: `series:${item.id}`, checked: true });
    } else {
      dispatch({ type: "SET_WATCHED", key: `series:${item.id}`, checked: false });
    }

    dispatch({
      type: "UPDATE_SERIES_META",
      slug: item.id,
      meta: {
        tmdbId: resolvedTmdbId,
        totalEpisodes: total,
        checkedEpisodes: newChecked,
        totalRuntime: tvData?.runtime || 0,
        poster: seriesMeta?.poster,
        fetchedAt: Date.now(),
      },
    });
  };

  const markAllEpisodes = (watched: boolean) => {
    if (!tvData || !resolvedTmdbId) return;
    const episodeKeys: string[] = [];
    for (const s of tvData.seasons) {
      for (const e of s.episodes) {
        episodeKeys.push(`tv:${resolvedTmdbId}:S${s.season_number}:E${e.episode_number}`);
      }
    }
    dispatch({ type: "BULK_SET_EPISODES", keys: episodeKeys, checked: watched });
    dispatch({ type: "SET_WATCHED", key: `series:${item.id}`, checked: watched });
    dispatch({
      type: "UPDATE_SERIES_META",
      slug: item.id,
      meta: {
        tmdbId: resolvedTmdbId,
        totalEpisodes: episodeKeys.length,
        checkedEpisodes: watched ? episodeKeys.length : 0,
        totalRuntime: tvData.runtime || 0,
        poster: seriesMeta?.poster,
        fetchedAt: Date.now(),
      },
    });
  };

  const asteriskLabels: Record<number, string> = {
    1: "Optional anthology — can be skipped",
    2: "Supplementary — enriches the main story",
    3: "Skippable — not essential viewing",
  };

  const renderBadges = () => {
    if (!item.asterisks) return null;
    const text = "*".repeat(item.asterisks);
    const label = asteriskLabels[item.asterisks] ?? "";
    return <span className="badge badge--asterisk" title={label} aria-label={label}>{text}</span>;
  };

  return (
    <div className={`list-item card list-item-card${isNextUp ? " list-item--next-up" : ""}`}>
      {isNextUp && <span className="next-up-badge" aria-label="Next up to watch">NEXT UP</span>}
      {/* Poster + checkbox column */}
      <div className="watch-item-row">
        <button
          className={`check ${isChecked ? "checked" : ""}`}
          onClick={toggleWatched}
          aria-pressed={isChecked}
          aria-label={isMovie ? `Mark "${item.title}" as ${isChecked ? "unwatched" : "watched"}` : `Mark "${item.title}" as ${isChecked ? "not started" : "started"}`}
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
              {renderBadges()}
            </div>
          </div>
          <div className="meta-text">
            {isMovie ? "Movie" : "Series"} {!isMovie && tvData ? formatEpisodeCount(tvData) : ""}
            {isMovie && movieMeta?.runtime ? <span className="meta-text--inline">• {formatRuntime(movieMeta.runtime)}</span> : null}
            {!isMovie && tvData?.runtime ? <span className="meta-text--inline">• {formatRuntime(tvData.runtime)}</span> : null}
            {isMovie && movieMeta?.rating ? <span className="meta-text--inline">• ⭐ {formatRating(movieMeta.rating)}</span> : null}
            {!isMovie && tvData?.rating ? <span className="meta-text--inline">• ⭐ {formatRating(tvData.rating)}</span> : null}
            {!isMovie && isChecked && <span className="meta-text--inline meta-text--success">✓ Complete</span>}
            {!isMovie && !isChecked && tvData && checkedEpisodesCount > 0 && (
              <span className="meta-text--inline meta-text--accent">{Math.round((checkedEpisodesCount / totalEpisodesKnown) * 100)}% watched</span>
            )}
            {!isMovie && isDataStale && <span className="meta-text--inline meta-text--warning">⚠️ Data may be outdated</span>}
          </div>
          {/* Series progress preview (collapsed state) */}
          {!isMovie && !isChecked && seriesMeta && seriesMeta.totalEpisodes > 0 && (
            <div className="series-preview">
              <div className="series-preview__bar">
                <div
                  className="series-preview__fill"
                  style={{ width: `${Math.round((seriesMeta.checkedEpisodes / seriesMeta.totalEpisodes) * 100)}%` }}
                />
              </div>
              <span className="series-preview__label">
                {seriesMeta.checkedEpisodes}/{seriesMeta.totalEpisodes} episodes
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
              onClick={() => handleExpand()}
              aria-expanded={expanded}
              aria-label={`${expanded ? "Collapse" : "Expand"} episode list for ${item.title}`}
              disabled={resolving}
            >
              {expanded ? "Collapse" : resolving ? "Loading…" : "Expand"}
            </button>
            {tvData && (
              <button
                className="button button--ghost refresh-btn"
                onClick={refreshEpisodes}
                aria-label={`Refresh episode data for ${item.title}`}
                disabled={resolving}
                title={isDataStale ? "Data is over 30 days old - refresh recommended" : "Refresh to check for new episodes"}
              >
                🔄 {isDataStale ? "⚠️" : ""} Refresh
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
          <button className="button button--ghost error-panel__retry" onClick={() => { setError(null); handleExpand(); }}>
            Try Again
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {!isMovie && expanded && resolving && <EpisodeListSkeleton />}

      {/* Episode list with smooth expand */}
      <div className={`episodes-collapsible ${!isMovie && expanded && tvData ? "episodes-collapsible--open" : ""}`}>
        <div className="episodes-collapsible__inner">
        {!isMovie && tvData && (
          <div className="episodes episodes-panel">
            <div className="episode-actions">
              <button className="button button--ghost episode-btn" onClick={() => markAllEpisodes(true)} aria-label={`Mark all episodes of ${item.title} as watched`}>
                Mark All Watched
              </button>
              <button className="button button--ghost episode-btn" onClick={() => markAllEpisodes(false)} aria-label={`Mark all episodes of ${item.title} as unwatched`}>
                Mark All Unwatched
              </button>
              <div className="episode-actions__count">{checkedEpisodesCount} of {totalEpisodesKnown} episodes watched</div>
            </div>
            {tvData.seasons.map((s, idx) => {
              const sp = seasonProgress?.[idx];
              const pct = sp && sp.total > 0 ? Math.round((sp.checked / sp.total) * 100) : 0;
              return (
                <div key={s.season_number} style={{ display: "grid", gap: 6 }}>
                  <div className="season-header">
                    <div className="season-heading">Season {s.season_number}</div>
                    <div className="season-progress">
                      <div className="season-progress__bar">
                        <div className="season-progress__fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="season-progress__label">{sp?.checked ?? 0}/{sp?.total ?? 0}</span>
                    </div>
                  </div>
                  {s.episodes.map((e) => {
                    const key = `tv:${resolvedTmdbId}:S${s.season_number}:E${e.episode_number}`;
                    const epChecked = !!state.watched[key];
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

function formatEpisodeCount(tvData: TVSeriesData): string {
  const total = tvData.seasons.reduce((acc, s) => acc + (s.episodes?.length ?? 0), 0);
  return `· ${total} episodes`;
}
