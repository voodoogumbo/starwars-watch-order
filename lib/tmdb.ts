// Server-only: reads TMDB_BEARER. Import from server components and route handlers only.
import type { EpisodeData, SeasonData, TVSeriesData, WatchItem } from "@/data/watchOrder";
import { episodeKey } from "@/lib/progress";

const API = "https://api.themoviedb.org/3";
const REVALIDATE_SECONDS = 86400;
// TMDB caps append_to_response at 20 items; seasons that don't exist are simply omitted.
const MAX_SEASONS = 20;
const SEASON_APPEND = Array.from({ length: MAX_SEASONS }, (_, i) => `season/${i + 1}`).join(",");

export class TmdbError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type TmdbMovie = { runtime?: number; vote_average?: number; poster_path?: string | null };
type TmdbEpisode = { id: number; episode_number: number; name: string; air_date?: string | null; runtime?: number | null };
type TmdbSeason = { episodes?: TmdbEpisode[] };
type TmdbTv = {
  id: number;
  name?: string;
  original_name?: string;
  vote_average?: number;
  poster_path?: string | null;
} & Record<string, unknown>;

async function tmdb<T>(path: string): Promise<T> {
  const bearer = process.env.TMDB_BEARER;
  if (!bearer) throw new TmdbError(500, "TMDB_BEARER is not configured");
  const resp = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${bearer}` },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!resp.ok) throw new TmdbError(resp.status, `TMDB returned ${resp.status}: ${resp.statusText}`);
  return resp.json() as Promise<T>;
}

/** Full series with every season's aired episodes, in a single TMDB request. */
export async function fetchSeries(id: number): Promise<TVSeriesData> {
  const tv = await tmdb<TmdbTv>(`/tv/${id}?append_to_response=${SEASON_APPEND}`);
  const today = new Date().toISOString().slice(0, 10);

  const seasons: SeasonData[] = [];
  for (let n = 1; n <= MAX_SEASONS; n++) {
    const season = tv[`season/${n}`] as TmdbSeason | undefined;
    // Unaired episodes (no date or a future date) are left out so a series can
    // reach 100% and "Mark All" never ticks episodes nobody has seen yet.
    const episodes: EpisodeData[] = (season?.episodes ?? [])
      .filter((e) => !!e.air_date && e.air_date <= today)
      .map((e) => ({
        id: e.id,
        episode_number: e.episode_number,
        name: e.name,
        air_date: e.air_date ?? null,
        runtime: e.runtime ?? null,
      }))
      .sort((a, b) => a.episode_number - b.episode_number);
    if (!episodes.length) continue;
    const runtime = episodes.reduce((sum, e) => sum + (e.runtime || 0), 0);
    seasons.push({ season_number: n, episodes, runtime: runtime || undefined });
  }

  const totalRuntime = seasons.reduce((sum, s) => sum + (s.runtime || 0), 0);
  return {
    id: tv.id,
    name: tv.name ?? tv.original_name ?? "",
    rating: tv.vote_average || undefined,
    runtime: totalRuntime || undefined,
    poster_path: tv.poster_path ?? undefined,
    seasons,
  };
}

/**
 * Merge live TMDB metadata (runtime, rating, poster, aired episode keys) into
 * the static watch order. Any title that fails keeps its fallback values.
 */
export async function withTmdbData(items: WatchItem[]): Promise<WatchItem[]> {
  if (!process.env.TMDB_BEARER) return items;
  return Promise.all(
    items.map(async (item): Promise<WatchItem> => {
      try {
        if (item.type === "movie") {
          const movie = await tmdb<TmdbMovie>(`/movie/${item.tmdbId}`);
          return {
            ...item,
            runtime: movie.runtime || item.runtime,
            rating: movie.vote_average || undefined,
            poster: movie.poster_path ?? undefined,
          };
        }
        const series = await fetchSeries(item.tmdbId);
        return {
          ...item,
          runtime: series.runtime || item.runtime,
          rating: series.rating,
          poster: series.poster_path,
          episodes: series.seasons.flatMap((s) =>
            s.episodes.map((e) => episodeKey(item.tmdbId, s.season_number, e.episode_number))
          ),
        };
      } catch (err) {
        console.warn(`TMDB metadata unavailable for "${item.title}":`, err);
        return item;
      }
    })
  );
}
