
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_RANGES = {
  "1d": { range: "1d", interval: "5m" },
  "5d": { range: "5d", interval: "15m" },
  "1mo": { range: "1mo", interval: "1d" },
  "3mo": { range: "3mo", interval: "1d" },
  "6mo": { range: "6mo", interval: "1d" },
  "1y": { range: "1y", interval: "1wk" },
} as const;

const ALLOWED_TICKERS = new Set([
  "AAPL", "NVDA", "TSLA", "MSFT", "GOOGL",
  "AMZN", "META", "AMD", "COIN", "HOOD",
  "MSTR", "NFLX", "PLTR", "INTC", "JPM",
  "^GSPC", "^IXIC",
]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const ticker = (searchParams.get("ticker") || "AAPL")
    .trim()
    .toUpperCase();

  const requestedRange = searchParams.get("range") || "5d";

  if (!ALLOWED_TICKERS.has(ticker)) {
    return NextResponse.json(
      { error: "Unsupported ticker." },
      { status: 400 }
    );
  }

  if (
    !Object.prototype.hasOwnProperty.call(
      ALLOWED_RANGES,
      requestedRange
    )
  ) {
    return NextResponse.json(
      { error: "Unsupported time range." },
      { status: 400 }
    );
  }

  const config =
    ALLOWED_RANGES[
      requestedRange as keyof typeof ALLOWED_RANGES
    ];

  const url = new URL(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`
  );

  url.searchParams.set("range", config.range);
  url.searchParams.set("interval", config.interval);
  url.searchParams.set("includePrePost", "false");

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Market history provider is temporarily unavailable." },
        { status: 502 }
      );
    }

    const payload = await response.json();
    const result = payload?.chart?.result?.[0];

    if (!result) {
      return NextResponse.json(
        { error: "No historical data was returned for this ticker." },
        { status: 502 }
      );
    }

    const timestamps: number[] = result.timestamp ?? [];
    const closes: (number | null)[] =
      result.indicators?.quote?.[0]?.close ?? [];

    const points = timestamps
      .map((timestamp, index) => ({
        timestamp: timestamp * 1000,
        date: new Date(timestamp * 1000).toISOString(),
        price: closes[index],
      }))
      .filter(
        (point) =>
          typeof point.price === "number" &&
          Number.isFinite(point.price)
      );

    return NextResponse.json({
      ticker,
      currency: result.meta?.currency ?? "USD",
      range: requestedRange,
      interval: config.interval,
      source: "Yahoo Finance chart endpoint",
      fetchedAt: new Date().toISOString(),
      delayedDataWarning:
        "Prices may be delayed and are not guaranteed executable prices.",
      points,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to retrieve historical market data." },
      { status: 502 }
    );
  }
}