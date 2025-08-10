"use client";
import React, { useEffect, useMemo, useState } from "react";
import type { WatchItem as WatchItemType } from "@/data/watchOrder";
import { loadState, saveState, setKey as storageSetKey, toggleKey as storageToggleKey, StorageState } from "@/lib/storage";
import { EpisodeListSkeleton } from "./Skeleton";

type Props = {
  item: WatchItemType;
  storageState: StorageState;
  onToggleKey: (key: string) => void;
  onSetKey: (key: string, checked: boolean) => void;
  onSaveState: (s: StorageState) => void;
};

export default function WatchItem({ item, storageState, onToggleKey, onSetKey, onSaveState }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [tmdbId, setTmdbId] = useState<number | null>(null);
  const [tvData, setTvData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const isMovie = item.type === "movie";

  const movieKey = `movie:${item.id}`;

  // meta key prefix used by WatchList to compute progress
  const metaKeyPrefix = `series-meta:${item.id}:`;

  useEffect(() => {
    // attempt to find any existing meta key for this series in storageState and parse tmdbId if present
    if (!isMovie) {
      const meta = Object.keys(storageState).find((k) => k.startsWith(metaKeyPrefix));
      if (meta) {
        const parts = meta.split(":");
        // format: series-meta:{slug}:{tmdbId}:{total}:{checked}:{timestamp}
        const idPart = parts[2];
        const timestampPart = parts[6];
        const idNum = Number(idPart);
        const timestamp = Number(timestampPart);
        if (!Number.isNaN(idNum)) {
          setTmdbId(idNum);
        }
        if (!Number.isNaN(timestamp)) {
          setLastFetched(timestamp);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkedMovie = !!storageState[movieKey];

  const totalEpisodesKnown = useMemo(() => {
    if (!tvData) return 0;
    return tvData.seasons.reduce((sum: number, s: any) => sum + (s.episodes?.length ?? 0), 0);
  }, [tvData]);

  const checkedEpisodesCount = useMemo(() => {
    if (!tmdbId) return 0;
    return Object.keys(storageState).filter((k) => k.startsWith(`tv:${tmdbId}:`)).length;
  }, [storageState, tmdbId]);

  // Check if data is stale (>30 days old)
  const isDataStale = useMemo(() => {
    if (!lastFetched) return false;
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    return lastFetched < thirtyDaysAgo;
  }, [lastFetched]);

  // Toggle movie/series checked
  const toggleMovie = () => {
    if (isMovie) {
      onToggleKey(movieKey);
    } else {
      // For series: toggle top-level completion and handle bulk episode actions
      const wasChecked = !!storageState[movieKey];
      onToggleKey(movieKey);
      
      // If we have episode data loaded, bulk toggle all episodes
      if (tvData && tmdbId) {
        const allEpisodes: { season: number; episode: number }[] = [];
        tvData.seasons.forEach((s: any) => {
          s.episodes.forEach((e: any) => {
            allEpisodes.push({ season: s.season_number, episode: e.episode_number });
          });
        });
        
        // Toggle all episodes to match the new series state
        setTimeout(() => {
          const currentState = loadState();
          const newState = { ...currentState };
          
          allEpisodes.forEach(({ season, episode }) => {
            const episodeKey = `tv:${tmdbId}:S${season}:E${episode}`;
            if (wasChecked) {
              // Was checked, now unchecking - remove all episodes
              delete newState[episodeKey];
            } else {
              // Was unchecked, now checking - add all episodes
              newState[episodeKey] = true;
            }
          });
          
          // Update metadata
          const metaKeyPrefix = `series-meta:${item.id}:`;
          Object.keys(newState).forEach(k => {
            if (k.startsWith(metaKeyPrefix)) delete newState[k];
          });
          
          const totalEpisodes = allEpisodes.length;
          const checkedEpisodes = wasChecked ? 0 : totalEpisodes;
          const timestamp = Date.now();
          const metaKey = `series-meta:${item.id}:${tmdbId}:${totalEpisodes}:${checkedEpisodes}:${timestamp}`;
          newState[metaKey] = true;
          
          saveState(newState);
          onSaveState(newState);
        }, 50);
      }
    }
  };

  // Refresh episode data (force refetch)
  const refreshEpisodes = async () => {
    if (isMovie) return;
    setTvData(null);
    setError(null);
    await handleExpand(true);
  };

  // Expand series: resolve TMDB id and fetch episode lists if not already loaded
  const handleExpand = async (forceRefresh = false) => {
    if (isMovie) return;
    setExpanded((s) => !s);

    if ((tvData && !forceRefresh) || resolving) return;

    // Basic validation
    if (!item.title?.trim()) {
      setError("Invalid series title");
      return;
    }
    if (!item.year || item.year < 1900 || item.year > 2100) {
      setError("Invalid release year");
      return;
    }

    try {
      setResolving(true);
      setError(null);

      // resolve TMDB id
      const resolveResp = await fetch(`/api/tmdb/resolve?title=${encodeURIComponent(item.title)}&year=${item.year}&type=series`);
      if (!resolveResp.ok) {
        throw new Error(`TMDB resolve failed: ${resolveResp.status} ${resolveResp.statusText}`);
      }
      
      const resolveData = await resolveResp.json();
      if (resolveData.error) {
        throw new Error(resolveData.message || resolveData.error);
      }
      if (!resolveData || !resolveData.id) {
        throw new Error("No TMDB id found for this series");
      }
      
      const idToFetch = resolveData.id;
      setTmdbId(idToFetch);

      // fetch tv episode lists
      const tvResp = await fetch(`/api/tmdb/tv/${idToFetch}`);
      if (!tvResp.ok) {
        throw new Error(`TMDB tv fetch failed: ${tvResp.status} ${tvResp.statusText}`);
      }
      
      const tvjson = await tvResp.json();
      if (tvjson.error) {
        throw new Error(tvjson.message || tvjson.error);
      }
      if (!tvjson || !tvjson.seasons) {
        throw new Error("Invalid TV data received from TMDB");
      }

      setTvData(tvjson);

      // compute totals and checked counts from local storage
      const total = tvjson.seasons.reduce((acc: number, s: any) => acc + (s.episodes?.length ?? 0), 0);
      const current = loadState();
      const checked = Object.keys(current).filter((k) => k.startsWith(`tv:${idToFetch}:`)).length;
      
      // Check if top-level series is already marked as complete
      const seriesKey = `movie:${item.id}`;
      const isTopLevelComplete = !!current[seriesKey];
      
      // If top-level is complete but episodes aren't all checked, sync them
      if (isTopLevelComplete && checked < total) {
        // Mark all episodes as watched
        const newState = { ...current };
        tvjson.seasons.forEach((s: any) => {
          s.episodes.forEach((e: any) => {
            const episodeKey = `tv:${idToFetch}:S${s.season_number}:E${e.episode_number}`;
            newState[episodeKey] = true;
          });
        });
        saveState(newState);
        onSaveState(newState);
        // Update checked count for metadata
        const checkedAfterSync = total;
        const timestamp = Date.now();
        const metaKey = `series-meta:${item.id}:${idToFetch}:${total}:${checkedAfterSync}:${timestamp}`;
        newState[metaKey] = true;
        saveState(newState);
        onSaveState(newState);
        setLastFetched(timestamp);
        return; // Skip the normal metadata update below
      }

      // remove any previous meta keys with this prefix
      const nextState: StorageState = { ...current };
      for (const k of Object.keys(nextState)) {
        if (k.startsWith(metaKeyPrefix)) {
          delete nextState[k];
        }
      }

      // add new meta key with timestamp: series-meta:{slug}:{tmdbId}:{total}:{checked}:{timestamp}
      const timestamp = Date.now();
      const metaKey = `series-meta:${item.id}:${idToFetch}:${total}:${checked}:${timestamp}`;
      nextState[metaKey] = true;
      saveState(nextState);
      onSaveState(nextState);
      setTmdbId(idToFetch);
      setLastFetched(timestamp);
    } catch (err: any) {
      console.error(err);
      setError(String(err?.message ?? err));
    } finally {
      setResolving(false);
    }
  };

  // Toggle an episode checked state
  const toggleEpisode = (seasonNumber: number, episodeNumber: number) => {
    if (!tmdbId) return;
    const key = `tv:${tmdbId}:S${seasonNumber}:E${episodeNumber}`;
    onToggleKey(key);

    // after toggling, recompute meta info and persist
    setTimeout(() => {
      const cur = loadState();
      // compute checked episodes for this series
      const checked = Object.keys(cur).filter((k) => k.startsWith(`tv:${tmdbId}:`)).length;
      const total = totalEpisodesKnown || 0;
      
      // If all episodes are checked, also mark top-level series as complete
      // If not all episodes are checked, unmark top-level series completion
      const next: StorageState = { ...cur };
      const seriesKey = `movie:${item.id}`;
      if (checked === total && total > 0) {
        next[seriesKey] = true;
      } else {
        delete next[seriesKey];
      }
      
      // remove old meta keys
      for (const k of Object.keys(next)) {
        if (k.startsWith(metaKeyPrefix)) delete next[k];
      }
      const timestamp = Date.now();
      const metaKey = `series-meta:${item.id}:${tmdbId}:${total}:${checked}:${timestamp}`;
      next[metaKey] = true;
      saveState(next);
      onSaveState(next);
    }, 40);
  };

  // Bulk episode actions
  const markAllEpisodes = (watched: boolean) => {
    if (!tvData || !tmdbId) return;
    
    const allEpisodes: { season: number; episode: number }[] = [];
    tvData.seasons.forEach((s: any) => {
      s.episodes.forEach((e: any) => {
        allEpisodes.push({ season: s.season_number, episode: e.episode_number });
      });
    });
    
    const currentState = loadState();
    const newState = { ...currentState };
    
    allEpisodes.forEach(({ season, episode }) => {
      const episodeKey = `tv:${tmdbId}:S${season}:E${episode}`;
      if (watched) {
        newState[episodeKey] = true;
      } else {
        delete newState[episodeKey];
      }
    });
    
    // Update top-level series completion
    const seriesKey = `movie:${item.id}`;
    if (watched) {
      newState[seriesKey] = true;
    } else {
      delete newState[seriesKey];
    }
    
    // Update metadata
    const metaKeyPrefix = `series-meta:${item.id}:`;
    Object.keys(newState).forEach(k => {
      if (k.startsWith(metaKeyPrefix)) delete newState[k];
    });
    
    const totalEpisodes = allEpisodes.length;
    const checkedEpisodes = watched ? totalEpisodes : 0;
    const timestamp = Date.now();
    const metaKey = `series-meta:${item.id}:${tmdbId}:${totalEpisodes}:${checkedEpisodes}:${timestamp}`;
    newState[metaKey] = true;
    
    saveState(newState);
    onSaveState(newState);
  };

  // Click handler for expand button
  const handleExpandClick = () => {
    handleExpand();
  };

  // Render helpers
  const renderBadges = () => {
    if (!item.asterisks) return null;
    const text = "*".repeat(item.asterisks);
    return <span className="badge" aria-hidden>{text}</span>;
  };

  return (
    <div className="list-item card" style={{ padding: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          className={`check ${checkedMovie ? "checked" : ""}`}
          onClick={toggleMovie}
          aria-pressed={checkedMovie}
          aria-label={isMovie ? `Mark "${item.title}" as ${checkedMovie ? 'unwatched' : 'watched'}` : `Mark "${item.title}" as ${checkedMovie ? 'not started' : 'started'}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
            <div className="badges">
              <span className="badge">{item.year}</span>
              {renderBadges()}
            </div>
          </div>
          <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>
            {isMovie ? "Movie" : "Series"} {isMovie ? "" : bm(tvData)}
            {!isMovie && checkedMovie && (
              <span style={{ color: "var(--success)", marginLeft: 8 }}>✓ Complete</span>
            )}
            {!isMovie && !checkedMovie && tvData && checkedEpisodesCount > 0 && (
              <span style={{ color: "var(--accent)", marginLeft: 8 }}>
                {Math.round((checkedEpisodesCount / totalEpisodesKnown) * 100)}% watched
              </span>
            )}
            {!isMovie && isDataStale && (
              <span style={{ color: "var(--warning)", marginLeft: 8, fontSize: 11 }}>
                ⚠️ Data may be outdated
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {!isMovie && (
          <>
            <button 
              className="button button--ghost" 
              onClick={handleExpandClick} 
              aria-expanded={expanded}
              aria-label={`${expanded ? 'Collapse' : 'Expand'} episode list for ${item.title}`}
              disabled={resolving}
            >
              {expanded ? "Collapse" : (resolving ? "Loading…" : "Expand")}
            </button>
            {tvData && (
              <button 
                className="button button--ghost" 
                onClick={refreshEpisodes}
                aria-label={`Refresh episode data for ${item.title}`}
                disabled={resolving}
                style={{ fontSize: 12, padding: "6px 8px", minHeight: "32px" }}
                title={isDataStale ? "Data is over 30 days old - refresh recommended" : "Refresh to check for new episodes"}
              >
                🔄 {isDataStale ? "⚠️" : ""} Refresh
              </button>
            )}
          </>
        )}
      </div>

      {error && (
        <div style={{ gridColumn: "1 / -1", marginTop: 8, padding: 12, background: "rgba(255, 59, 59, 0.1)", border: "1px solid rgba(255, 59, 59, 0.3)", borderRadius: 8 }}>
          <div style={{ color: "var(--danger)", marginBottom: 8 }}>
            <strong>Error loading episodes:</strong> {error}
          </div>
          <button 
            className="button button--ghost" 
            onClick={() => {
              setError(null);
              handleExpand();
            }}
            style={{ fontSize: 12, padding: "6px 12px" }}
          >
            Try Again
          </button>
        </div>
      )}

      {!isMovie && expanded && resolving && (
        <EpisodeListSkeleton />
      )}

      {!isMovie && expanded && tvData && (
        <div className="episodes" style={{ gridColumn: "1 / -1", marginTop: 10 }}>
          <div style={{ 
            display: "flex", 
            gap: 8, 
            marginBottom: 12, 
            paddingBottom: 8, 
            borderBottom: "1px solid var(--border)" 
          }}>
            <button 
              className="button button--ghost" 
              onClick={() => markAllEpisodes(true)}
              style={{ fontSize: 12, padding: "4px 8px", minHeight: "32px" }}
              aria-label={`Mark all episodes of ${item.title} as watched`}
            >
              Mark All Watched
            </button>
            <button 
              className="button button--ghost" 
              onClick={() => markAllEpisodes(false)}
              style={{ fontSize: 12, padding: "4px 8px", minHeight: "32px" }}
              aria-label={`Mark all episodes of ${item.title} as unwatched`}
            >
              Mark All Unwatched
            </button>
            <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)", alignSelf: "center" }}>
              {checkedEpisodesCount} of {totalEpisodesKnown} episodes watched
            </div>
          </div>
          {tvData.seasons.map((s: any) => (
            <div key={s.season_number} style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 700 }}>Season {s.season_number}</div>
              {s.episodes.map((e: any) => {
                const key = `tv:${tmdbId}:S${s.season_number}:E${e.episode_number}`;
                const checked = !!storageState[key];
                return (
                  <div key={key} className="episode-item">
                    <button 
                      className={`check ${checked ? "checked" : ""}`} 
                      onClick={() => toggleEpisode(s.season_number, e.episode_number)}
                      aria-pressed={checked}
                      aria-label={`Mark episode ${e.episode_number}, "${e.name}" as ${checked ? 'unwatched' : 'watched'}`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <div style={{ fontWeight: 600 }}>{e.episode_number}. {e.name}</div>
                      <div style={{ color: "var(--muted)", fontSize: 12 }}>{e.air_date ?? "TBA"}</div>
                    </div>
                    <div style={{ color: "var(--muted)", fontSize: 12 }}>{/* placeholder for runtime */}</div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// small helper to show basic meta line when tvData not yet loaded
function bm(tvData: any | null) {
  if (!tvData) return "";
  const total = tvData.seasons.reduce((acc: number, s: any) => acc + (s.episodes?.length ?? 0), 0);
  return `· ${total} episodes`;
}
