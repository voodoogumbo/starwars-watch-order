export type WatchType = "movie" | "series";

export type WatchItem = {
  id: string;          // stable slug id
  title: string;
  year: number;
  type: WatchType;
  asterisks?: number;  // 1,2,3 = *, **, ***
  // Runtime and rating data (fetched from TMDB)
  runtime?: number;    // total runtime in minutes
  rating?: number;     // TMDB vote_average (0-10)
};

// Extended type for resolved TMDB data
export type ResolvedMediaData = {
  id: number;
  media_type: "movie" | "tv";
  name: string;
  year?: number;
  runtime?: number;    // in minutes
  rating?: number;     // TMDB vote_average (0-10)
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

// Estimated runtimes (minutes) — used as fallback before TMDB data is fetched.
// TMDB values override these once a title is expanded or checked.
export const watchOrder: WatchItem[] = [
  { id: slug("The Acolyte 2024"), title: "The Acolyte", year: 2024, type: "series", runtime: 329 },
  { id: slug("Star Wars The Phantom Menace 1999"), title: "Star Wars: The Phantom Menace (Episode I)", year: 1999, type: "movie", runtime: 136 },
  { id: slug("Star Wars Attack of the Clones 2002"), title: "Star Wars: Attack of the Clones (Episode II)", year: 2002, type: "movie", runtime: 142 },
  { id: slug("Star Wars The Clone Wars movie 2008"), title: "Star Wars: The Clone Wars (movie)", year: 2008, type: "movie", runtime: 98 },
  { id: slug("Star Wars The Clone Wars series 2008"), title: "Star Wars: The Clone Wars (series)", year: 2008, type: "series", runtime: 2952 },
  { id: slug("Star Wars Tales of the Jedi 2022"), title: "Star Wars: Tales of the Jedi", year: 2022, type: "series", asterisks: 1, runtime: 93 },
  { id: slug("Star Wars Revenge of the Sith 2005"), title: "Star Wars: Revenge of the Sith (Episode III)", year: 2005, type: "movie", runtime: 140 },
  { id: slug("Star Wars Tales of the Empire 2024"), title: "Star Wars: Tales of the Empire", year: 2024, type: "series", asterisks: 1, runtime: 90 },
  { id: slug("Star Wars Maul Shadow Lord 2026"), title: "Star Wars: Maul - Shadow Lord", year: 2026, type: "series", runtime: 320 },
  { id: slug("Star Wars Tales of the Underworld 2025"), title: "Star Wars: Tales of the Underworld", year: 2025, type: "series", asterisks: 1, runtime: 90 },
  { id: slug("Star Wars The Bad Batch 2021"), title: "Star Wars: The Bad Batch", year: 2021, type: "series", runtime: 1178 },
  { id: slug("Solo A Star Wars Story 2018"), title: "Solo: A Star Wars Story", year: 2018, type: "movie", runtime: 135 },
  { id: slug("Obi-Wan Kenobi 2022"), title: "Obi-Wan Kenobi", year: 2022, type: "series", runtime: 270 },
  { id: slug("Andor 2022"), title: "Andor", year: 2022, type: "series", asterisks: 2, runtime: 720 },
  { id: slug("Star Wars Rebels 2014"), title: "Star Wars Rebels", year: 2014, type: "series", asterisks: 2, runtime: 1650 },
  { id: slug("Rogue One A Star Wars Story 2016"), title: "Rogue One: A Star Wars Story", year: 2016, type: "movie", runtime: 133 },
  { id: slug("Star Wars A New Hope 1977"), title: "Star Wars: A New Hope (Episode IV)", year: 1977, type: "movie", runtime: 121 },
  { id: slug("Star Wars The Empire Strikes Back 1980"), title: "Star Wars: The Empire Strikes Back (Episode V)", year: 1980, type: "movie", runtime: 124 },
  { id: slug("Star Wars Return of the Jedi 1983"), title: "Star Wars: Return of the Jedi (Episode VI)", year: 1983, type: "movie", runtime: 131 },
  { id: slug("The Mandalorian 2019"), title: "The Mandalorian", year: 2019, type: "series", runtime: 912 },
  { id: slug("The Book of Boba Fett 2021"), title: "The Book of Boba Fett", year: 2021, type: "series", runtime: 294 },
  { id: slug("Ahsoka 2023"), title: "Ahsoka", year: 2023, type: "series", runtime: 360 },
  { id: slug("Skeleton Crew 2024"), title: "Skeleton Crew", year: 2024, type: "series", runtime: 320 },
  { id: slug("Star Wars Resistance 2018"), title: "Star Wars Resistance", year: 2018, type: "series", asterisks: 3, runtime: 880 },
  { id: slug("Star Wars The Force Awakens 2015"), title: "Star Wars: The Force Awakens (Episode VII)", year: 2015, type: "movie", runtime: 138 },
  { id: slug("Star Wars The Last Jedi 2017"), title: "Star Wars: The Last Jedi (Episode VIII)", year: 2017, type: "movie", runtime: 152 },
  { id: slug("Star Wars The Rise of Skywalker 2019"), title: "Star Wars: The Rise of Skywalker (Episode IX)", year: 2019, type: "movie", runtime: 142 },
];
