export type WatchType = "movie" | "series";

export type WatchItem = {
  id: string;          // stable slug id
  title: string;
  year: number;
  type: WatchType;
  asterisks?: number;  // 1,2,3 = *, **, ***
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const watchOrder: WatchItem[] = [
  { id: slug("The Acolyte 2024"), title: "The Acolyte", year: 2024, type: "series" },
  { id: slug("Star Wars The Phantom Menace 1999"), title: "Star Wars: The Phantom Menace (Episode I)", year: 1999, type: "movie" },
  { id: slug("Star Wars Attack of the Clones 2002"), title: "Star Wars: Attack of the Clones (Episode II)", year: 2002, type: "movie" },
  { id: slug("Star Wars The Clone Wars movie 2008"), title: "Star Wars: The Clone Wars (movie)", year: 2008, type: "movie" },
  { id: slug("Star Wars The Clone Wars series 2008"), title: "Star Wars: The Clone Wars (series)", year: 2008, type: "series" },
  { id: slug("Star Wars Tales of the Jedi 2022"), title: "Star Wars: Tales of the Jedi", year: 2022, type: "series", asterisks: 1 },
  { id: slug("Star Wars Revenge of the Sith 2005"), title: "Star Wars: Revenge of the Sith (Episode III)", year: 2005, type: "movie" },
  { id: slug("Star Wars Tales of the Empire 2024"), title: "Star Wars: Tales of the Empire", year: 2024, type: "series", asterisks: 1 },
  { id: slug("Star Wars Tales of the Underworld 2025"), title: "Star Wars: Tales of the Underworld", year: 2025, type: "series", asterisks: 1 },
  { id: slug("Star Wars The Bad Batch 2021"), title: "Star Wars: The Bad Batch", year: 2021, type: "series" },
  { id: slug("Solo A Star Wars Story 2018"), title: "Solo: A Star Wars Story", year: 2018, type: "movie" },
  { id: slug("Obi-Wan Kenobi 2022"), title: "Obi-Wan Kenobi", year: 2022, type: "series" },
  { id: slug("Andor 2022"), title: "Andor", year: 2022, type: "series", asterisks: 2 },
  { id: slug("Star Wars Rebels 2014"), title: "Star Wars Rebels", year: 2014, type: "series", asterisks: 2 },
  { id: slug("Rogue One A Star Wars Story 2016"), title: "Rogue One: A Star Wars Story", year: 2016, type: "movie" },
  { id: slug("Star Wars A New Hope 1977"), title: "Star Wars: A New Hope (Episode IV)", year: 1977, type: "movie" },
  { id: slug("Star Wars The Empire Strikes Back 1980"), title: "Star Wars: The Empire Strikes Back (Episode V)", year: 1980, type: "movie" },
  { id: slug("Star Wars Return of the Jedi 1983"), title: "Star Wars: Return of the Jedi (Episode VI)", year: 1983, type: "movie" },
  { id: slug("The Mandalorian 2019"), title: "The Mandalorian", year: 2019, type: "series" },
  { id: slug("The Book of Boba Fett 2021"), title: "The Book of Boba Fett", year: 2021, type: "series" },
  { id: slug("Ahsoka 2023"), title: "Ahsoka", year: 2023, type: "series" },
  { id: slug("Skeleton Crew 2024"), title: "Skeleton Crew", year: 2024, type: "series" },
  { id: slug("Star Wars Resistance 2018"), title: "Star Wars Resistance", year: 2018, type: "series", asterisks: 3 },
  { id: slug("Star Wars The Force Awakens 2015"), title: "Star Wars: The Force Awakens (Episode VII)", year: 2015, type: "movie" },
  { id: slug("Star Wars The Last Jedi 2017"), title: "Star Wars: The Last Jedi (Episode VIII)", year: 2017, type: "movie" },
  { id: slug("Star Wars The Rise of Skywalker 2019"), title: "Star Wars: The Rise of Skywalker (Episode IX)", year: 2019, type: "movie" }
];
