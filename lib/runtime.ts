/**
 * Runtime calculation utilities for Star Wars Watch Order app
 */

export interface RuntimeData {
  totalMinutes: number;
  watchedMinutes: number;
}

/**
 * Format runtime in minutes to human-readable string
 * @param minutes - Runtime in minutes
 * @returns Formatted string like "2h 15m" or "45m"
 */
export function formatRuntime(minutes?: number): string {
  if (!minutes || minutes <= 0) return "";
  
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Parse TMDB episode runtime data to get total series runtime
 * @param tvData - TV series data from TMDB API
 * @returns Total runtime in minutes
 */
export function calculateSeriesRuntime(tvData: any): number {
  if (!tvData?.seasons) return 0;
  
  let totalRuntime = 0;
  for (const season of tvData.seasons) {
    if (season.episodes) {
      for (const episode of season.episodes) {
        totalRuntime += episode.runtime || 0;
      }
    }
  }
  
  return totalRuntime;
}

/**
 * Calculate watched runtime for a series based on checked episodes
 * @param tvData - TV series data from TMDB API
 * @param storageState - Current storage state with checked episodes
 * @param tmdbId - TMDB ID for this series
 * @returns Watched runtime in minutes
 */
export function calculateWatchedSeriesRuntime(
  tvData: any, 
  storageState: Record<string, boolean>, 
  tmdbId: number
): number {
  if (!tvData?.seasons) return 0;
  
  let watchedRuntime = 0;
  for (const season of tvData.seasons) {
    if (season.episodes) {
      for (const episode of season.episodes) {
        const episodeKey = `tv:${tmdbId}:S${season.season_number}:E${episode.episode_number}`;
        if (storageState[episodeKey] && episode.runtime) {
          watchedRuntime += episode.runtime;
        }
      }
    }
  }
  
  return watchedRuntime;
}

/**
 * Calculate time-based progress percentage
 * @param watchedMinutes - Minutes of content watched
 * @param totalMinutes - Total minutes of content
 * @returns Progress percentage (0-100)
 */
export function calculateTimeProgress(watchedMinutes: number, totalMinutes: number): number {
  if (totalMinutes <= 0) return 0;
  return Math.round((watchedMinutes / totalMinutes) * 100);
}

/**
 * Get runtime display text for progress bar
 * @param watchedMinutes - Minutes watched
 * @param totalMinutes - Total minutes
 * @returns Formatted string like "12h 30m watched / 45h 15m total"
 */
export function getProgressRuntimeText(watchedMinutes: number, totalMinutes: number): string {
  const watchedText = formatRuntime(watchedMinutes);
  const totalText = formatRuntime(totalMinutes);
  
  if (!watchedText && !totalText) return "";
  if (!totalText) return watchedText ? `${watchedText} watched` : "";
  if (!watchedText) return `0m / ${totalText}`;
  
  return `${watchedText} / ${totalText}`;
}

/**
 * Format rating for display
 * @param rating - TMDB vote_average (0-10)
 * @returns Formatted rating string
 */
export function formatRating(rating?: number): string {
  if (!rating || rating <= 0) return "";
  return rating.toFixed(1);
}

/**
 * Get star rating representation
 * @param rating - TMDB vote_average (0-10)
 * @returns Number of filled stars (out of 5)
 */
export function getStarRating(rating?: number): number {
  if (!rating || rating <= 0) return 0;
  return Math.round((rating / 10) * 5);
}

/**
 * Get rating color class based on score
 * @param rating - TMDB vote_average (0-10)
 * @returns CSS class name for rating color
 */
export function getRatingColorClass(rating?: number): string {
  if (!rating || rating <= 0) return "rating-none";
  if (rating >= 8) return "rating-excellent";
  if (rating >= 7) return "rating-good";
  if (rating >= 6) return "rating-decent";
  return "rating-poor";
}