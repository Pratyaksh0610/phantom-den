import { Watchlist } from "@/database/models/watchlist.model";
import { connectToDatabase } from "@/database/mongoose";
import { headers } from "next/headers";
import { auth } from "../better-auth/auth";
import { redirect } from "next/navigation";
import {
  formatPrice,
  formatChangePercent,
  formatMarketCapValue,
} from "../utils";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export async function getWatchlistSymbolsByEmail(
  email: string,
): Promise<string[]> {
  const mongoose = await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection not established");
  try {
    const user = await db.collection("user").findOne<{
      _id?: unknown;
      id?: string;
      email?: string;
    }>({ email: email });
    if (!user) {
      return [];
    }

    const userId = user.id || user._id?.toString();
    if (!userId) {
      return [];
    }

    const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
    return items.map((i) => String(i.symbol));
  } catch (err) {
    console.error("getWatchlistSymbolsByEmail error", err);
    return [];
  }
}

// Get user's watchlist
// export const getUserWatchlist = async () => {
//   try {
//     const session = await auth.api.getSession({
//       headers: await headers(),
//     });
//     if (!session?.user) redirect("/sign-in");

//     const watchlist = await Watchlist.find({ userId: session.user.id })
//       .sort({ addedAt: -1 })
//       .lean();

//     return JSON.parse(JSON.stringify(watchlist));
//   } catch (error) {
//     console.error("Error fetching watchlist:", error);
//     throw new Error("Failed to fetch watchlist");
//   }
// };

export const getWatchlistWithData = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) redirect("/sign-in");
  try {
    const watchlist = await Watchlist.find({ userId: session.user.id })
      .sort({ addedAt: -1 })
      .lean();

    if (watchlist.length === 0) return [];

    const stocksWithData = await Promise.all(
      watchlist.map(async (item) => {
        try {
          // 3. Use your new instance. The types will now work perfectly,
          // and the class's internal queue will automatically limit
          // concurrent requests to prevent rate-limiting!
          const stockData = await yahooFinance.quote(item.symbol);

          // Extract metrics safely
          const currentPrice = stockData.regularMarketPrice || 0;
          const changePercent = stockData.regularMarketChangePercent || 0;
          const peRatio = stockData.trailingPE || stockData.forwardPE || null;
          const marketCap = stockData.marketCap || 0;

          return {
            ...item,
            company: stockData.shortName || stockData.longName || item.company,
            symbol: stockData.symbol,
            currentPrice: currentPrice,
            priceFormatted: formatPrice(currentPrice),
            changeFormatted: formatChangePercent(changePercent),
            changePercent: changePercent,
            marketCap: formatMarketCapValue(marketCap),
            peRatio: peRatio?.toFixed(1) || "—",
          };
        } catch (error) {
          console.warn(`Failed to fetch data for ${item.symbol}:`, error);
          // Graceful fallback: return the DB item without live price data
          return item;
        }
      }),
    );

    return JSON.parse(JSON.stringify(stocksWithData));
  } catch (error) {
    console.error("Error loading watchlist:", error);
    throw new Error("Failed to fetch watchlist");
  }
};
