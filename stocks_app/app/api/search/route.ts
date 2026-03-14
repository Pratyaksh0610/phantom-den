import { NextResponse } from "next/server";
import { searchStocks } from "@/lib/actions/finnhub.actions"; // adjust path if needed

export async function GET(request: Request) {
  // Grab the "q" parameter from the URL (e.g., /api/search?q=AAPL)
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  try {
    // Call your server function here, safely on the server
    const results = await searchStocks(q);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json([], { status: 500 });
  }
}