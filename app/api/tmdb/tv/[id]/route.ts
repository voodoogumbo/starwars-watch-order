import { NextResponse } from "next/server";
import { watchOrder } from "@/data/watchOrder";
import { fetchSeries, TmdbError } from "@/lib/tmdb";

// Only proxy series that are actually in the watch order — this route is not a
// general-purpose TMDB proxy for our token.
const SERIES_IDS = new Set(watchOrder.filter((i) => i.type === "series").map((i) => i.tmdbId));

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!SERIES_IDS.has(id)) {
    return NextResponse.json(
      { error: "Unknown series", message: `Series ${params.id} is not in the watch order` },
      { status: 404 }
    );
  }

  try {
    const result = await fetchSeries(id);
    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600"
      }
    });
  } catch (err) {
    console.error(`TMDB TV API error for ID ${id}:`, err);
    if (err instanceof TmdbError) {
      if (err.status === 500) {
        return NextResponse.json({
          error: "TMDB API not configured",
          message: "Please set up your TMDB API key in the .env.local file"
        }, { status: 500 });
      }
      if (err.status === 401) {
        return NextResponse.json({
          error: "TMDB authentication failed",
          message: "Invalid TMDB API key. Please check your .env.local file"
        }, { status: 502 });
      }
      if (err.status === 404) {
        return NextResponse.json({
          error: "TV series not found",
          message: `No TV series found with ID ${id}`
        }, { status: 404 });
      }
      return NextResponse.json({
        error: "TMDB TV fetch failed",
        message: err.message,
        status: err.status
      }, { status: 502 });
    }
    return NextResponse.json({
      error: "Internal server error",
      message: "An unexpected error occurred while fetching TV episodes",
      details: process.env.NODE_ENV === 'development' ? String(err) : undefined
    }, { status: 500 });
  }
}
