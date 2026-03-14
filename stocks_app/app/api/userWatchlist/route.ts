import { NextResponse } from "next/server";
import { getWatchlistSymbolsByEmail } from "@/lib/actions/watchlist.queries";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) redirect("/sign-in");

  try {
    const results = await getWatchlistSymbolsByEmail(session.user.email);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
