import { NextResponse } from "next/server";

type Result = {
  id: number;
  media_type: "movie" | "tv";
  name: string;
  year?: number;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const title = url.searchParams.get("title");
    const year = url.searchParams.get("year");
    const type = url.searchParams.get("type"); // "movie" or "series"

    if (!title) {
      return NextResponse.json({ error: "Missing title" }, { status: 400 });
    }

    const mediaType = type === "movie" ? "movie" : "tv";
    const query = encodeURIComponent(title);
    const yearParam = year ? `&year=${encodeURIComponent(year)}` : "";

    const tmdbUrl = `https://api.themoviedb.org/3/search/${mediaType}?query=${query}${yearParam}&include_adult=false&page=1`;

    const bearer = process.env.TMDB_BEARER;
    if (!bearer) {
      console.error("TMDB_BEARER environment variable is not configured");
      return NextResponse.json({ 
        error: "TMDB API not configured", 
        message: "Please set up your TMDB API key in the .env.local file" 
      }, { status: 500 });
    }

    const resp = await fetch(tmdbUrl, {
      headers: {
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json"
      },
      next: { revalidate: 86400 }
    });

    if (!resp.ok) {
      console.error(`TMDB search failed for "${title}": ${resp.status} ${resp.statusText}`);
      const errorData = await resp.text();
      console.error("TMDB error response:", errorData);
      
      if (resp.status === 401) {
        return NextResponse.json({ 
          error: "TMDB authentication failed", 
          message: "Invalid TMDB API key. Please check your .env.local file" 
        }, { status: 502 });
      }
      
      return NextResponse.json({ 
        error: "TMDB search failed", 
        message: `TMDB API returned ${resp.status}: ${resp.statusText}`,
        status: resp.status 
      }, { status: 502 });
    }

    const data = await resp.json();
    const results = data.results ?? [];

    if (!results.length) {
      console.warn(`No TMDB results found for "${title}" (${year})`);
      return NextResponse.json({ 
        error: "No results found", 
        message: `No ${mediaType} found matching "${title}" ${year ? `from ${year}` : ''}`,
        query: title,
        year: year || null
      }, { status: 404 });
    }

    // prefer exact year match if available
    let chosen: any = results[0];
    if (year) {
      const byYear = results.find((r: any) => {
        const release = r.first_air_date ?? r.release_date ?? "";
        return release.startsWith(String(year));
      });
      if (byYear) chosen = byYear;
    }

    const name = chosen.name ?? chosen.title ?? chosen.original_name ?? chosen.original_title ?? title;
    const id = chosen.id;

    const result: Result = {
      id,
      media_type: mediaType === "movie" ? "movie" : "tv",
      name,
      year: (chosen.first_air_date ?? chosen.release_date ?? "").slice(0, 4) || undefined
    };

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600"
      }
    });
  } catch (err) {
    console.error("TMDB resolve API error:", err);
    return NextResponse.json({ 
      error: "Internal server error", 
      message: "An unexpected error occurred while resolving the title",
      details: process.env.NODE_ENV === 'development' ? String(err) : undefined
    }, { status: 500 });
  }
}
