
export const runtime = "nodejs";

const symbols = [
  { ticker: "AAPL", name: "Apple" },
  { ticker: "NVDA", name: "NVIDIA" },
  { ticker: "TSLA", name: "Tesla" },
  { ticker: "^GSPC", name: "S&P 500" },
  { ticker: "^IXIC", name: "NASDAQ Composite" },
];

async function getQuote(ticker: string) {
  try {
    const url = new URL(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`
    );

    url.searchParams.set("range", "5d");
    url.searchParams.set("interval", "1d");

    const response = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent": "Mozilla/5.0 StockyAI/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance returned ${response.status}`);
    }

    const json = await response.json();
    const result = json?.chart?.result?.[0];
    const meta = result?.meta;
    const closes: number[] = (
      result?.indicators?.quote?.[0]?.close ?? []
    ).filter(
      (value: unknown): value is number =>
        typeof value === "number" && Number.isFinite(value)
    );

    const price =
      typeof meta?.regularMarketPrice === "number"
        ? meta.regularMarketPrice
        : closes.length
          ? closes[closes.length - 1]
          : null;

    const previousClose =
      typeof meta?.chartPreviousClose === "number"
        ? meta.chartPreviousClose
        : typeof meta?.previousClose === "number"
          ? meta.previousClose
          : closes.length >= 2
            ? closes[closes.length - 2]
            : null;

    const timestamp =
      typeof meta?.regularMarketTime === "number"
        ? new Date(meta.regularMarketTime * 1000).toISOString()
        : result?.timestamp?.length
          ? new Date(
              result.timestamp[result.timestamp.length - 1] * 1000
            ).toISOString()
          : null;

    return {
      ticker,
      price,
      currency: meta?.currency ?? "USD",
      previousClose,
      changePercent:
        typeof price === "number" &&
        typeof previousClose === "number" &&
        previousClose !== 0
          ? ((price - previousClose) / previousClose) * 100
          : null,
      timestamp,
      available: typeof price === "number",
    };
  } catch {
    return {
      ticker,
      price: null,
      currency: "USD",
      previousClose: null,
      changePercent: null,
      timestamp: null,
      available: false,
    };
  }
}

export async function GET() {
  const stocks = await Promise.all(
    symbols.map(({ ticker }) => getQuote(ticker))
  );

  return Response.json({
    source: "Yahoo Finance chart endpoint",
    fetchedAt: new Date().toISOString(),
    stocks,
  });
}