import {
  validateArticle,
  formatArticle,
  formatPrice,
  formatChangePercent,
  formatMarketCapValue,
} from "@/lib/utils";
import { POPULAR_STOCK_SYMBOLS } from "@/lib/constants";
import { cache } from "react";
import { auth } from "../better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import YahooFinance from "yahoo-finance2";
import { getWatchlistSymbolsByEmail } from "./watchlist.queries";

const yahooFinance = new YahooFinance();

export async function fetchJSON<T>(
  url: string,
  revalidateSeconds?: number,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  const options: RequestInit & { next?: { revalidate?: number } } =
    revalidateSeconds
      ? { cache: "force-cache", next: { revalidate: revalidateSeconds } }
      : { cache: "no-store" };

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Fetch failed ${res.status}: ${text}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

function generateNumericId(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    const char = uuid.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export async function getNews(
  symbols?: string[],
): Promise<MarketNewsArticle[]> {
  try {
    const cleanSymbols = (symbols || [])
      .map((s) => s?.trim().toUpperCase())
      .filter((s): s is string => Boolean(s));

    const maxArticles = 6;

    // If we have symbols, try to fetch company news per symbol and round-robin select
    if (cleanSymbols.length > 0) {
      const perSymbolArticles: Record<string, RawNewsArticle[]> = {};

      await Promise.all(
        cleanSymbols.map(async (sym) => {
          try {
            // Fetch recent news for the specific symbol using Yahoo Finance
            const result = await yahooFinance.search(sym, { newsCount: 10 });
            const yfNews = result.news || [];

            // Map Yahoo's format to your RawNewsArticle type
            const articles: RawNewsArticle[] = yfNews.map((n) => ({
              id: generateNumericId(n.uuid),
              headline: n.title,
              summary: n.title,
              source: n.publisher,
              url: n.link,
              // Convert JS Date to UNIX timestamp in seconds
              datetime: n.providerPublishTime
                ? Math.floor(n.providerPublishTime.getTime() / 1000)
                : undefined,
              image: n.thumbnail?.resolutions?.[0]?.url || undefined,
              category: "company",
              related: (n.relatedTickers || []).join(","),
            }));

            perSymbolArticles[sym] = articles.filter(validateArticle);
          } catch (e) {
            console.error("Error fetching company news for", sym, e);
            perSymbolArticles[sym] = [];
          }
        }),
      );

      const collected: MarketNewsArticle[] = [];
      // Round-robin up to 6 picks (Kept exactly as you wrote it)
      for (let round = 0; round < maxArticles; round++) {
        for (let i = 0; i < cleanSymbols.length; i++) {
          const sym = cleanSymbols[i];
          const list = perSymbolArticles[sym] || [];
          if (list.length === 0) continue;
          const article = list.shift();
          if (!article || !validateArticle(article)) continue;
          collected.push(formatArticle(article, true, sym, round));
          if (collected.length >= maxArticles) break;
        }
        if (collected.length >= maxArticles) break;
      }

      if (collected.length > 0) {
        // Sort by datetime desc
        collected.sort((a, b) => (b.datetime || 0) - (a.datetime || 0));
        return collected.slice(0, maxArticles);
      }
      // If none collected, fall through to general news
    }

    // General market news fallback or when no symbols provided.
    // We use '^GSPC' (S&P 500) as the search query to pull high-quality broad market news.
    const generalResult = await yahooFinance.search("^GSPC", { newsCount: 20 });
    const generalYfNews = generalResult.news || [];

    const general: RawNewsArticle[] = generalYfNews.map((n) => ({
      id: generateNumericId(n.uuid),
      headline: n.title,
      summary: n.title,
      source: n.publisher,
      url: n.link,
      // Convert JS Date to UNIX timestamp in seconds
      datetime: n.providerPublishTime
        ? Math.floor(n.providerPublishTime.getTime() / 1000)
        : undefined,
      image: n.thumbnail?.resolutions?.[0]?.url || undefined,
      category: "general",
      related: (n.relatedTickers || []).join(","),
    }));
    const seen = new Set<string>();
    const unique: RawNewsArticle[] = [];
    for (const art of general || []) {
      if (!validateArticle(art)) continue;
      const key = `${art.id}-${art.url}-${art.headline}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(art);
      if (unique.length >= 20) break; // cap early before final slicing
    }

    const formatted = unique
      .slice(0, maxArticles)
      .map((a, idx) => formatArticle(a, false, undefined, idx));
    return formatted;
  } catch (err) {
    console.error("getNews error:", err);
    throw new Error("Failed to fetch news");
  }
}

export const getStocksDetails = cache(async (symbol: string) => {
  const cleanSymbol = symbol.trim().toUpperCase();

  try {
    // 3. Use the instantiated client to avoid the 'never' TS error
    const quote = await yahooFinance.quote(cleanSymbol);

    if (!quote || !quote.regularMarketPrice) {
      throw new Error("Invalid stock data received from API");
    }

    const currentPrice = quote.regularMarketPrice;
    const changePercent = quote.regularMarketChangePercent || 0;

    // Safely fallback for metrics that might be missing on certain assets like ETFs
    const peRatio = quote.trailingPE || quote.forwardPE || null;
    const marketCap = quote.marketCap || 0;

    return {
      symbol: cleanSymbol,
      company: quote.shortName || quote.longName || cleanSymbol,
      currentPrice,
      changePercent,
      priceFormatted: formatPrice(currentPrice),
      changeFormatted: formatChangePercent(changePercent),
      peRatio: peRatio?.toFixed(1) || "—",
      marketCapFormatted: formatMarketCapValue(marketCap),
    };
  } catch (error) {
    console.error(`Error fetching details for ${cleanSymbol}:`, error);
    throw new Error("Failed to fetch stock details");
  }
});

export const searchStocks = cache(
  async (query?: string): Promise<StockWithWatchlistStatus[]> => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });
      if (!session?.user) redirect("/sign-in");

      const userWatchlistSymbols = await getWatchlistSymbolsByEmail(
        session.user.email,
      );

      const trimmed = typeof query === "string" ? query.trim() : "";

      // 1. Handle Empty State (Default Popular Stocks)
      if (!trimmed) {
        // We map these manually so we don't waste ANY API calls on default UI
        return POPULAR_STOCK_SYMBOLS.slice(0, 10).map((sym) => {
          const upper = sym.toUpperCase();
          return {
            symbol: upper,
            name: upper, // Fallback name
            exchange: "US",
            type: "Stock",
            isInWatchlist: userWatchlistSymbols.includes(upper),
          };
        });
      }

      // 2. Handle Search Query using Yahoo Finance (No API Key Required!)
      const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
        trimmed,
      )}&quotesCount=15&newsCount=0`;

      // Using your existing fetchJSON utility
      const data = await fetchJSON<any>(url, 1800);
      const yahooResults = data?.quotes || [];

      // 3. Map Yahoo's response to your TypeScript types
      const mapped: StockWithWatchlistStatus[] = yahooResults
        // Filter out news articles or crypto if you only want stocks/ETFs
        .filter((r: any) => r.quoteType === "EQUITY" || r.quoteType === "ETF")
        .map((r: any) => {
          const symbol = (r.symbol || "").toUpperCase();
          return {
            symbol,
            name: r.shortname || r.longname || symbol,
            exchange: r.exchDisp || r.exchange || "US",
            type: r.quoteType === "ETF" ? "ETF" : "Stock",
            isInWatchlist: userWatchlistSymbols.includes(symbol),
          };
        })
        .slice(0, 15);

      return mapped;
    } catch (err) {
      console.error("Error in stock search:", err);
      return [];
    }
  },
);
//   const cleanSymbol = symbol.trim().toUpperCase();

//   try {
//     // 1 call to Yahoo Finance replaces 3 calls to Finnhub
//     const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${cleanSymbol}`;

//     // We can still cache this for 15 minutes (900 seconds)
//     const data = await fetchJSON<any>(url, 900);
//     const quote = data?.quoteResponse?.result?.[0];

//     if (!quote) throw new Error('Invalid stock data received from API');

//     return {
//       symbol: cleanSymbol,
//       company: quote.shortName || quote.longName || cleanSymbol,
//       currentPrice: quote.regularMarketPrice || 0,
//       changePercent: quote.regularMarketChangePercent || 0,
//       priceFormatted: formatPrice(quote.regularMarketPrice || 0),
//       changeFormatted: formatChangePercent(quote.regularMarketChangePercent || 0),
//       peRatio: quote.trailingPE ? quote.trailingPE.toFixed(1) : '—',
//       marketCapFormatted: formatMarketCapValue(quote.marketCap || 0),
//     };
//   } catch (error) {
//     console.error(`Error fetching details for ${cleanSymbol}:`, error);
//     // Graceful fallback UI data
//     return {
//       symbol: cleanSymbol,
//       company: cleanSymbol,
//       currentPrice: 0,
//       changePercent: 0,
//       priceFormatted: "Unavailable",
//       changeFormatted: "—",
//       peRatio: "—",
//       marketCapFormatted: "—",
//     };
//   }
// });

// export const getBatchStocksDetails = cache(async (symbols: string[]) => {
//   if (!symbols || symbols.length === 0) return [];

//   // Join the array into a comma-separated string: "AAPL,MSFT,TSLA"
//   const cleanSymbols = symbols.map(s => s.trim().toUpperCase()).join(',');

//   try {
//     const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${cleanSymbols}`;

//     // Cache the entire batch for 15 minutes (900 seconds)
//     const data = await fetchJSON<any>(url, 900);
//     return data?.quoteResponse?.result || [];
//   } catch (error) {
//     console.error(`Error fetching batch details for ${cleanSymbols}:`, error);
//     return [];
//   }
// });
