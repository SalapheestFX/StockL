import { NextResponse } from "next/server";
import { generateQwenText } from "@/lib/qwen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STOCK_NAMES: Record<string, string> = {
  AAPL: "Apple Inc.",
  NVDA: "NVIDIA Corporation",
  TSLA: "Tesla, Inc.",
  MSFT: "Microsoft Corporation",
  GOOGL: "Alphabet Inc.",
  AMZN: "Amazon.com, Inc.",
  META: "Meta Platforms, Inc.",
  AMD: "Advanced Micro Devices",
  COIN: "Coinbase Global, Inc.",
  HOOD: "Robinhood Markets, Inc.",
  MSTR: "Strategy Inc.",
  NFLX: "Netflix, Inc.",
  PLTR: "Palantir Technologies",
  INTC: "Intel Corporation",
  JPM: "JPMorgan Chase & Co.",
};

type MarketData = {
  ticker: string;
  company: string;
  currency: string;
  price: number;
  previousClose: number | null;
  changePercent: number | null;
  quoteTime: number | null;
  lastDailyClose: number | null;
  previousDailyClose: number | null;
};

type NewsItem = {
  title?: string;
  publisher?: string;
  url?: string;
  publishedAt?: string | null;
  relatedTickers?: string[];
};

function identifyTicker(question: string): string | null {
  const normalized = question.toUpperCase();

  for (const ticker of Object.keys(STOCK_NAMES)) {
    const pattern = new RegExp(`\\$?\\b${ticker}\\b`);

    if (pattern.test(normalized)) {
      return ticker;
    }
  }

  return null;
}

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

async function fetchMarketData(
  ticker: string
): Promise<MarketData | null> {
  const url = new URL(
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`
  );

  url.searchParams.set("range", "5d");
  url.searchParams.set("interval", "1d");
  url.searchParams.set("includePrePost", "false");

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const payload = await response.json();
    const result = payload?.chart?.result?.[0];

    if (!result?.meta) return null;

    const meta = result.meta;
    const timestamps: number[] = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0];
    const closes: (number | null)[] = quote?.close ?? [];
    const validCloses = closes.filter(isValidNumber);

    const price = isValidNumber(meta.regularMarketPrice)
      ? meta.regularMarketPrice
      : validCloses.at(-1);

    if (!isValidNumber(price)) return null;

    const previousClose = isValidNumber(meta.chartPreviousClose)
      ? meta.chartPreviousClose
      : validCloses.length >= 2
        ? validCloses[validCloses.length - 2]
        : null;

    const lastDailyClose = validCloses.at(-1) ?? null;

    const previousDailyClose =
      validCloses.length >= 2
        ? validCloses[validCloses.length - 2]
        : null;

    const changePercent =
      previousClose !== null && previousClose !== 0
        ? ((price - previousClose) / previousClose) * 100
        : null;

    const quoteTime = isValidNumber(meta.regularMarketTime)
      ? meta.regularMarketTime
      : timestamps.at(-1) ?? null;

    return {
      ticker,
      company: STOCK_NAMES[ticker],
      currency: meta.currency ?? "USD",
      price,
      previousClose,
      changePercent,
      quoteTime,
      lastDailyClose,
      previousDailyClose,
    };
  } catch {
    return null;
  }
}

async function fetchNews(
  requestUrl: string
): Promise<NewsItem[]> {
  try {
    const url = new URL("/api/news", requestUrl);

    const response = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return [];

    const payload = await response.json();

    if (!Array.isArray(payload?.news)) return [];

    return payload.news
      .filter(
        (item: NewsItem) =>
          typeof item.title === "string" &&
          item.title.trim().length > 0
      )
      .slice(0, 8)
      .map((item: NewsItem) => ({
        title: item.title?.slice(0, 400),
        publisher: item.publisher?.slice(0, 120),
        url: item.url,
        publishedAt: item.publishedAt ?? null,
        relatedTickers: Array.isArray(item.relatedTickers)
          ? item.relatedTickers.slice(0, 10)
          : [],
      }));
  } catch {
    return [];
  }
}

function formatPrice(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}

function formatTimestamp(timestamp: number | null): string {
  if (timestamp === null) return "Unavailable";

  return new Date(timestamp * 1000).toISOString();
}

function buildResearchReport(
  question: string,
  ticker: string | null,
  market: MarketData | null,
  news: NewsItem[]
): string {
  const company = ticker ? STOCK_NAMES[ticker] : null;

  const marketSection = market
    ? [
        `Company: ${market.company}`,
        `Ticker: ${market.ticker}`,
        `Latest reported price: ${formatPrice(market.price, market.currency)}`,
        `Change versus previous close: ${
          market.changePercent === null
            ? "Unavailable"
            : `${market.changePercent >= 0 ? "+" : ""}${market.changePercent.toFixed(2)}%`
        }`,
        `Previous close: ${
          market.previousClose === null
            ? "Unavailable"
            : formatPrice(market.previousClose, market.currency)
        }`,
        `Quote timestamp (UTC): ${formatTimestamp(market.quoteTime)}`,
        `Latest daily close: ${
          market.lastDailyClose === null
            ? "Unavailable"
            : formatPrice(market.lastDailyClose, market.currency)
        }`,
        `Previous daily close: ${
          market.previousDailyClose === null
            ? "Unavailable"
            : formatPrice(market.previousDailyClose, market.currency)
        }`,
        "Source: Yahoo Finance chart endpoint. Quote may be delayed.",
      ].join("\n")
    : ticker
      ? `Market data for ${ticker} could not be retrieved. Do not invent a price.`
      : "No supported stock ticker was identified. No individual quote is available.";

  const newsSection =
    news.length > 0
      ? news
          .map((item, index) => {
            const date =
              item.publishedAt || "Publication time unavailable";

            const publisher =
              item.publisher || "Publisher unavailable";

            const tickers = item.relatedTickers?.length
              ? `; related tickers: ${item.relatedTickers.join(", ")}`
              : "";

            const link = item.url ? `; URL: ${item.url}` : "";

            return `${index + 1}. ${item.title}\n   Publisher: ${publisher}; date: ${date}${tickers}${link}`;
          })
          .join("\n")
      : "No news articles were retrieved. Do not claim that current news was checked.";

  return [
    "STOCKL AI RESEARCH CONTEXT",
    "",
    `User question: ${question}`,
    `Asset: ${ticker ? `${ticker} — ${company}` : "Broad market research"}`,
    `Report generated at (UTC): ${new Date().toISOString()}`,
    "",
    "MARKET DATA",
    marketSection,
    "",
    "RETRIEVED NEWS",
    newsSection,
    "",
    "RESEARCH INSTRUCTIONS",
    "Analyze the supplied evidence, not assumptions presented as facts.",
    "Structure the report with these sections:",
    "1. Research overview and direct answer to the user's question.",
    "2. Market snapshot, clearly identifying the source and quote timestamp.",
    "3. Trend and momentum: distinguish observed prices from indicators not calculated.",
    "4. News and potential catalysts: use only supplied articles as retrieved news.",
    "5. Risk assessment, including data freshness and uncertainty.",
    "6. Bull case, with supporting evidence and invalidation conditions.",
    "7. Bear case, with supporting evidence and invalidation conditions.",
    "8. What to monitor next.",
    "9. Balanced conclusion and key limitations.",
    "",
    "Never invent indicators, prices, events, citations, or article contents.",
    "If the supplied news is not relevant or is too old, say so.",
    "A news headline is not proof that its claims are true.",
    "Do not present the report as personalized financial advice.",
    "Do not guarantee returns, issue certainty-based trading signals, or execute trades.",
    "The human trader makes the final decision.",
    "The market data is from an unofficial Yahoo Finance endpoint.",
    "StockL does not have tokenized-equity-specific prices unless explicitly supplied.",
  ].join("\n");
}

function buildFallbackReport(
  question: string,
  ticker: string | null,
  market: MarketData | null,
  news: NewsItem[]
): string {
  const snapshot = market
    ? [
        `- Company: ${market.company}`,
        `- Ticker: ${market.ticker}`,
        `- Latest reported price: ${formatPrice(market.price, market.currency)}`,
        `- Change versus previous close: ${
          market.changePercent === null
            ? "Unavailable"
            : `${market.changePercent >= 0 ? "+" : ""}${market.changePercent.toFixed(2)}%`
        }`,
        `- Previous close: ${
          market.previousClose === null
            ? "Unavailable"
            : formatPrice(market.previousClose, market.currency)
        }`,
        `- Quote timestamp (UTC): ${formatTimestamp(market.quoteTime)}`,
        `- Latest daily close: ${
          market.lastDailyClose === null
            ? "Unavailable"
            : formatPrice(market.lastDailyClose, market.currency)
        }`,
        `- Previous daily close: ${
          market.previousDailyClose === null
            ? "Unavailable"
            : formatPrice(market.previousDailyClose, market.currency)
        }`,
        "- Source: Yahoo Finance chart endpoint; quote may be delayed.",
      ].join("\n")
    : ticker
      ? `StockL could not retrieve market data for ${ticker}. No price has been invented.`
      : "No supported stock ticker was identified. Try AAPL, NVDA, TSLA, MSFT, AMZN, or GOOGL.";

  const newsText =
    news.length > 0
      ? news
          .map((item, index) => {
            const publisher =
              item.publisher || "Publisher unavailable";

            const date = item.publishedAt || "Date unavailable";

            const link = item.url ? `\n   ${item.url}` : "";

            return `${index + 1}. ${item.title}\n   ${publisher} · ${date}${link}`;
          })
          .join("\n\n")
      : "No articles were retrieved for this report.";

  return `# StockL AI Research Report

## 1. Research Overview

- **Research question:** ${question}
- **Asset:** ${ticker || "Broad market research"}
- **Generated at (UTC):** ${new Date().toISOString()}

This is StockL's rule-based fallback report. Qwen did not generate this response.

## 2. Market Snapshot

${snapshot}

## 3. Trend and Momentum

${
  market
    ? `The latest reported quote is ${formatPrice(market.price, market.currency)}. The daily closes returned were ${market.lastDailyClose === null ? "unavailable" : formatPrice(market.lastDailyClose, market.currency)} and ${market.previousDailyClose === null ? "unavailable" : formatPrice(market.previousDailyClose, market.currency)}. This limited snapshot is not a complete trend or technical-indicator analysis.`
    : "Market data is unavailable, so no price trend can be confirmed."
}

## 4. Retrieved Financial News

${newsText}

Headlines are not independently verified here. Confirm material claims against reliable sources.

## 5. Risk Assessment

- **Market risk:** Broader market conditions may move the asset.
- **Company risk:** Earnings, guidance, competition, regulation, and execution can change the outlook.
- **Volatility risk:** Price action can invalidate a thesis.
- **Liquidity risk:** Spreads and liquidity differ by trading venue.
- **Tokenization risk:** For tokenized equities, separately verify issuer, legal rights, redemption terms, spreads, and liquidity.
- **Data risk:** Quotes may be delayed or unavailable, and retrieved headlines may not tell the whole story.

## 6. Bull Case

Look for verified improvements in fundamentals, positive material company developments, and sustained price strength. Define what evidence would support the case and what would invalidate it.

## 7. Bear Case

Look for verified deterioration in fundamentals, negative material developments, or a breakdown in price structure. Define what evidence would support the case and what would invalidate it.

## 8. What to Monitor Next

1. Check the quote timestamp and latest available market data.
2. Read relevant news articles and company announcements.
3. Review upcoming earnings and other material events.
4. Use fuller historical data before drawing technical conclusions.
5. For tokenized equities, compare the token's own price, trading hours, spread, and liquidity with the underlying stock.

## 9. Conclusion

**Stance: Further verification required.**

This fallback report is generated by application code, not by a connected LLM. A quote or headline alone is insufficient to establish a buy or sell decision. StockL supports research; the human trader makes the final decision.

*Prototype limitations: Yahoo Finance data is unofficial and may be delayed. This report does not execute trades and is not personalized financial advice.*`;
}

function safeQwenError(error: unknown): string {
  const message =
    error instanceof Error ? error.message : "UNKNOWN_ERROR";

  if (message === "QWEN_NOT_CONFIGURED") {
    return "Qwen is not configured. Check the QWEN_API_KEY environment variable.";
  }

  if (message === "QWEN_AUTH_FAILED") {
    return "Qwen authentication failed. Check your API key and access permissions.";
  }

  if (message === "QWEN_RATE_LIMITED") {
    return "Qwen rate limit or quota reached. Try again later or check your quota.";
  }

  if (message === "QWEN_EMPTY_RESPONSE") {
    return "Qwen returned no text for this request.";
  }

  if (message.startsWith("QWEN_REQUEST_FAILED_")) {
    return `Qwen request failed (${message.replace("QWEN_REQUEST_FAILED_", "HTTP ")}).`;
  }

  if (
    message === "QWEN_TIMEOUT" ||
    message.includes("TimeoutError") ||
    message.toLowerCase().includes("timed out")
  ) {
    return "The Qwen request timed out.";
  }

  if (message === "QWEN_CONNECTION_FAILED") {
    return "StockL could not connect to Qwen. Check the service and network connection.";
  }

  if (message === "QWEN_INVALID_RESPONSE") {
    return "Qwen returned an unexpected response.";
  }

  return "Qwen is temporarily unavailable. StockL used its non-AI fallback report.";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const question =
      typeof body.question === "string"
        ? body.question.trim()
        : "";

    if (!question) {
      return NextResponse.json(
        { error: "A research question is required." },
        { status: 400 }
      );
    }

    if (question.length > 2000) {
      return NextResponse.json(
        {
          error: "Please keep your research question under 2,000 characters.",
        },
        { status: 400 }
      );
    }

    const ticker = identifyTicker(question);

    const [market, news] = await Promise.all([
      ticker ? fetchMarketData(ticker) : Promise.resolve(null),
      fetchNews(request.url),
    ]);

    const prompt = buildResearchReport(
      question,
      ticker,
      market,
      news
    );

    try {
      const result = await generateQwenText(prompt);

      return NextResponse.json({
        answer: result.text,
        ticker,
        market,
        newsCount: news.length,
        newsAvailable: news.length > 0,
        status: "qwen-connected",
        aiProvider: "Qwen",
        aiModel: result.model,
        llmConnected: true,
        liveMarketData: market !== null,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      const answer = buildFallbackReport(
        question,
        ticker,
        market,
        news
      );

      return NextResponse.json({
        answer,
        ticker,
        market,
        newsCount: news.length,
        newsAvailable: news.length > 0,
        status: "qwen-unavailable-fallback",
        aiProvider: null,
        aiModel: null,
        llmConnected: false,
        liveMarketData: market !== null,
        warning: safeQwenError(error),
        generatedAt: new Date().toISOString(),
      });
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid request. Please try again." },
      { status: 400 }
    );
  }
}