import type { WatchItem } from "@/data/watchOrder";
import type { Watched } from "@/lib/storage";

export const episodeKey = (tmdbId: number, season: number, episode: number) =>
  `tv:${tmdbId}:S${season}:E${episode}`;

// Prefix shared by every episode key of a series (trailing colon so tv:1 never matches tv:12)
export const episodePrefix = (tmdbId: number) => `tv:${tmdbId}:`;

// Completion flag key: "movie:{slug}" or "series:{slug}"
export const titleKey = (item: WatchItem) =>
  item.type === "movie" ? `movie:${item.id}` : `series:${item.id}`;

export type TitleProgress = {
  done: boolean;
  fraction: number; // 0-1
  checked: number;  // aired episodes watched
  total: number;    // aired episodes known
};

/**
 * Single source of truth for "how watched is this title".
 * A series is done when its completion flag is set or every known aired
 * episode is checked; otherwise its fraction is checked / total.
 */
export function titleProgress(
  item: WatchItem,
  watched: Watched,
  episodeKeys: string[] = item.episodes ?? []
): TitleProgress {
  const total = episodeKeys.length;
  const checked = episodeKeys.filter((k) => watched[k]).length;
  const done = !!watched[titleKey(item)] || (total > 0 && checked === total);
  const fraction = done ? 1 : total > 0 ? checked / total : 0;
  return { done, fraction, checked, total };
}
