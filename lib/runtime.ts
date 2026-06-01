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