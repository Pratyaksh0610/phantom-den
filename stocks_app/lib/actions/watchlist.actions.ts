"use server";

import { Watchlist } from "@/database/models/watchlist.model";
import { headers } from "next/headers";
import { auth } from "../better-auth/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export const addToWatchlist = async (symbol: string, company: string) => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) redirect("/sign-in");

    // Check if stock already exists in watchlist
    const existingItem = await Watchlist.findOne({
      userId: session.user.id,
      symbol: symbol.toUpperCase(),
    });

    if (existingItem) {
      return { success: false, error: "Stock already in watchlist" };
    }

    // Add to watchlist
    const newItem = new Watchlist({
      userId: session.user.id,
      symbol: symbol.toUpperCase(),
      company: company.trim(),
    });

    await newItem.save();
    revalidatePath("/watchlist");

    return { success: true, message: "Stock added to watchlist" };
  } catch (error) {
    console.error("Error adding to watchlist:", error);
    throw new Error("Failed to add stock to watchlist");
  }
};

export const removeFromWatchlist = async (symbol: string) => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) redirect("/sign-in");

    // Remove from watchlist
    await Watchlist.deleteOne({
      userId: session.user.id,
      symbol: symbol.toUpperCase(),
    });
    revalidatePath("/watchlist");

    return { success: true, message: "Stock removed from watchlist" };
  } catch (error) {
    console.error("Error removing from watchlist:", error);
    throw new Error("Failed to remove stock from watchlist");
  }
};
