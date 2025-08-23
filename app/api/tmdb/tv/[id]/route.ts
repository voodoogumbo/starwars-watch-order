import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: "Missing tv id" }, { status: 400 });
    }

    const bearer = process.env.TMDB_BEARER;
    if (!bearer) {
      console.error("TMDB_BEARER environment variable is not configured");
      return NextResponse.json({ 
        error: "TMDB API not configured", 
        message: "Please set up your TMDB API key in the .env.local file" 
      }, { status: 500 });
    }

    // Fetch tv details to know seasons
    const tvResp = await fetch(`https://api.themoviedb.org/3/tv/${id}`, {
      headers: { Authorization: `Bearer ${bearer}` },
      next: { revalidate: 86400 }
    });

    if (!tvResp.ok) {
      console.error(`TMDB TV fetch failed for ID ${id}: ${tvResp.status} ${tvResp.statusText}`);
      
      if (tvResp.status === 401) {
        return NextResponse.json({ 
          error: "TMDB authentication failed", 
          message: "Invalid TMDB API key. Please check your .env.local file" 
        }, { status: 502 });
      }
      
      if (tvResp.status === 404) {
        return NextResponse.json({ 
          error: "TV series not found", 
          message: `No TV series found with ID ${id}` 
        }, { status: 404 });
      }
      
      return NextResponse.json({ 
        error: "TMDB TV fetch failed", 
        message: `TMDB API returned ${tvResp.status}: ${tvResp.statusText}`,
        status: tvResp.status 
      }, { status: 502 });
    }

    const tv = await tvResp.json();

    const seasons = (tv.seasons ?? []).filter((s: any) => s.season_number !== 0);

    // Fetch each season's episodes in parallel
    const seasonPromises = seasons.map(async (s: any) => {
      const seasonNum = s.season_number;
      try {
        const r = await fetch(`https://api.themoviedb.org/3/tv/${id}/season/${seasonNum}`, {
          headers: { Authorization: `Bearer ${bearer}` },
          next: { revalidate: 86400 }
        });
        if (!r.ok) {
          console.warn(`Season ${seasonNum} fetch failed for TV ${id}: ${r.status} ${r.statusText}`);
          return { season_number: seasonNum, episodes: [] };
        }
        const seasonData = await r.json();
        const episodes = (seasonData.episodes ?? []).map((e: any) => ({
          id: e.id,
          episode_number: e.episode_number,
          name: e.name,
          air_date: e.air_date ?? null,
          runtime: e.runtime ?? null
        }));
        return { season_number: seasonNum, episodes };
      } catch (error) {
        console.error(`Error fetching season ${seasonNum} for TV ${id}:`, error);
        return { season_number: seasonNum, episodes: [] };
      }
    });

    const seasonsWithEpisodes = await Promise.all(seasonPromises);

    // Calculate total runtime and per-season runtimes
    let totalRuntime = 0;
    const seasonsWithRuntimes = seasonsWithEpisodes
      .sort((a: any, b: any) => a.season_number - b.season_number)
      .map((s: any) => {
        const episodes = s.episodes.sort((a: any, b: any) => a.episode_number - b.episode_number);
        const seasonRuntime = episodes.reduce((sum: number, ep: any) => sum + (ep.runtime || 0), 0);
        totalRuntime += seasonRuntime;
        
        return {
          season_number: s.season_number,
          episodes,
          runtime: seasonRuntime > 0 ? seasonRuntime : undefined
        };
      });

    const result = {
      id: tv.id,
      name: tv.name ?? tv.original_name,
      rating: tv.vote_average ?? undefined,
      runtime: totalRuntime > 0 ? totalRuntime : undefined,
      seasons: seasonsWithRuntimes
    };

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600"
      }
    });
  } catch (err) {
    console.error(`TMDB TV API error for ID ${params.id}:`, err);
    return NextResponse.json({ 
      error: "Internal server error", 
      message: "An unexpected error occurred while fetching TV episodes",
      details: process.env.NODE_ENV === 'development' ? String(err) : undefined
    }, { status: 500 });
  }
}
