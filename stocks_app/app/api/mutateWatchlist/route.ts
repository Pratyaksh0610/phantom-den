import { NextResponse } from "next/server";
import { addToWatchlist, removeFromWatchlist } from "@/lib/actions/watchlist.actions";

export async function POST(req: Request) {
  try {
    const { symbol, company, action } = await req.json();

    if (action === "add") {
      const result = await addToWatchlist(symbol, company);
      return NextResponse.json(result);
    } 
    
    if (action === "remove") {
      const result = await removeFromWatchlist(symbol);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Watchlist API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}