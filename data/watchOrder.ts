export type WatchType = "movie" | "series";

export type WatchItem = {
  id: string;          // stable slug id
  title: string;
  year: number;
  type: WatchType;
  tmdbId: number;      // TMDB movie or tv id
  animated?: boolean;  // true = animated; omitted/false = live-action
  runtime?: number;    // total runtime in minutes (aired episodes only for series)
  // Filled in server-side from TMDB (see lib/tmdb.ts)
  rating?: number;     // TMDB vote_average (0-10)
  poster?: string;     // TMDB poster_path
  episodes?: string[]; // aired episode keys, "tv:{tmdbId}:S{n}:E{n}"
};

// TV series episode data structure
export type EpisodeData = {
  id: number;
  episode_number: number;
  name: string;
  air_date: string | null;
  runtime: number | null;
};

export type SeasonData = {
  season_number: number;
  episodes: EpisodeData[];
  runtime?: number;    // total season runtime in minutes
};

export type TVSeriesData = {
  id: number;
  name: string;
  rating?: number;      // TMDB vote_average (0-10)
  runtime?: number;     // total series runtime in minutes
  poster_path?: string; // TMDB poster path
  seasons: SeasonData[];
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// Runtimes (minutes) are fallbacks for when TMDB is unavailable at render time;
// lib/tmdb.ts overrides them with live values.
export const watchOrder: WatchItem[] = [
  { id: slug("Star Wars Young Jedi Adventures 2023"), title: "Star Wars: Young Jedi Adventures", year: 2023, type: "series", tmdbId: 202998, animated: true, runtime: 1465 },
  { id: slug("The Acolyte 2024"), title: "The Acolyte", year: 2024, type: "series", tmdbId: 114479, runtime: 329 },
  { id: slug("Star Wars The Phantom Menace 1999"), title: "Star Wars: The Phantom Menace (Episode I)", year: 1999, type: "movie", tmdbId: 1893, runtime: 136 },
  { id: slug("Star Wars Attack of the Clones 2002"), title: "Star Wars: Attack of the Clones (Episode II)", year: 2002, type: "movie", tmdbId: 1894, runtime: 142 },
  { id: slug("Star Wars The Clone Wars movie 2008"), title: "Star Wars: The Clone Wars (movie)", year: 2008, type: "movie", tmdbId: 12180, animated: true, runtime: 98 },
  { id: slug("Star Wars The Clone Wars series 2008"), title: "Star Wars: The Clone Wars (series)", year: 2008, type: "series", tmdbId: 4194, animated: true, runtime: 3009 },
  { id: slug("Star Wars Tales of the Jedi 2022"), title: "Star Wars: Tales of the Jedi", year: 2022, type: "series", tmdbId: 203085, animated: true, runtime: 99 },
  { id: slug("Star Wars Revenge of the Sith 2005"), title: "Star Wars: Revenge of the Sith (Episode III)", year: 2005, type: "movie", tmdbId: 1895, runtime: 140 },
  { id: slug("Star Wars Tales of the Empire 2024"), title: "Star Wars: Tales of the Empire", year: 2024, type: "series", tmdbId: 251091, animated: true, runtime: 93 },
  { id: slug("Star Wars Tales of the Underworld 2025"), title: "Star Wars: Tales of the Underworld", year: 2025, type: "series", tmdbId: 288055, animated: true, runtime: 98 },
  { id: slug("Star Wars The Bad Batch 2021"), title: "Star Wars: The Bad Batch", year: 2021, type: "series", tmdbId: 105971, animated: true, runtime: 1397 },
  { id: slug("Star Wars Maul Shadow Lord 2026"), title: "Star Wars: Maul - Shadow Lord", year: 2026, type: "series", tmdbId: 289219, animated: true, runtime: 260 },
  { id: slug("Solo A Star Wars Story 2018"), title: "Solo: A Star Wars Story", year: 2018, type: "movie", tmdbId: 348350, runtime: 135 },
  { id: slug("Obi-Wan Kenobi 2022"), title: "Obi-Wan Kenobi", year: 2022, type: "series", tmdbId: 92830, runtime: 280 },
  { id: slug("Andor 2022"), title: "Andor", year: 2022, type: "series", tmdbId: 83867, runtime: 1212 },
  { id: slug("Star Wars Rebels 2014"), title: "Star Wars Rebels", year: 2014, type: "series", tmdbId: 60554, animated: true, runtime: 1696 },
  { id: slug("Rogue One A Star Wars Story 2016"), title: "Rogue One: A Star Wars Story", year: 2016, type: "movie", tmdbId: 330459, runtime: 133 },
  { id: slug("Star Wars A New Hope 1977"), title: "Star Wars: A New Hope (Episode IV)", year: 1977, type: "movie", tmdbId: 11, runtime: 121 },
  { id: slug("Star Wars The Empire Strikes Back 1980"), title: "Star Wars: The Empire Strikes Back (Episode V)", year: 1980, type: "movie", tmdbId: 1891, runtime: 124 },
  { id: slug("Star Wars Return of the Jedi 1983"), title: "Star Wars: Return of the Jedi (Episode VI)", year: 1983, type: "movie", tmdbId: 1892, runtime: 132 },
  { id: slug("The Mandalorian 2019"), title: "The Mandalorian", year: 2019, type: "series", tmdbId: 82856, runtime: 1041 },
  { id: slug("The Book of Boba Fett 2021"), title: "The Book of Boba Fett", year: 2021, type: "series", tmdbId: 115036, runtime: 347 },
  { id: slug("Ahsoka 2023"), title: "Ahsoka", year: 2023, type: "series", tmdbId: 114461, runtime: 375 },
  { id: slug("The Mandalorian and Grogu 2026"), title: "The Mandalorian & Grogu", year: 2026, type: "movie", tmdbId: 1228710, runtime: 132 },
  { id: slug("Skeleton Crew 2024"), title: "Skeleton Crew", year: 2024, type: "series", tmdbId: 202879, runtime: 316 },
  { id: slug("Star Wars Resistance 2018"), title: "Star Wars Resistance", year: 2018, type: "series", tmdbId: 79093, animated: true, runtime: 995 },
  { id: slug("Star Wars The Force Awakens 2015"), title: "Star Wars: The Force Awakens (Episode VII)", year: 2015, type: "movie", tmdbId: 140607, runtime: 136 },
  { id: slug("Star Wars The Last Jedi 2017"), title: "Star Wars: The Last Jedi (Episode VIII)", year: 2017, type: "movie", tmdbId: 181808, runtime: 152 },
  { id: slug("Star Wars The Rise of Skywalker 2019"), title: "Star Wars: The Rise of Skywalker (Episode IX)", year: 2019, type: "movie", tmdbId: 181812, runtime: 142 },
];
