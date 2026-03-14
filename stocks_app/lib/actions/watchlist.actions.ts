"use server";

import { Watchlist } from "@/database/models/watchlist.model";
import { connectToDatabase } from "@/database/mongoose";

export async function getWatchlistSymbolsByEmail(
  email: string,
): Promise<string[]> {
  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection not established");

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
