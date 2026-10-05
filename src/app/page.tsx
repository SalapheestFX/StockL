
"use client";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import StockPriceChart from "@/components/StockPriceChart";

type Stock = {
  symbol: string;
  name: string;
  risk: string;
};

type MarketQuote = {
  ticker: string;
  price: number | null;
  currency: string;
  previousClose: number | null;
  changePercent: number | null;
  timestamp: string | null;
  available: boolean;
};

type NewsItem = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt: string | null;
  relatedTickers: string[];
};

type MarketResponse = {
  source?: string;
  fetchedAt?: string;
  stocks?: MarketQuote[];
};

type NewsResponse = {
  source?: string;
  fetchedAt?: string;
  count?: number;
  failedTickers?: string[];
  news?: NewsItem[];
};

type AnalysisResponse = {
  answer?: string;
  error?: string;
  aiProvider?: string;
  aiModel?: string;
  status?: string;
  llmConnected?: boolean;
  liveMarketData?: boolean;
  ticker?: string;
  generatedAt?: string;
};

const stocks: Stock[] = [
  { symbol: "AAPL", name: "Apple Inc.", risk: "Moderate" },
  { symbol: "NVDA", name: "NVIDIA Corp.", risk: "High" },
  { symbol: "TSLA", name: "Tesla Inc.", risk: "High" },
];

const prompts = [
  "Analyze AAPL",
  "Explain stock risk",
  "Compare AAPL vs NVDA",
  "Find market catalysts",
];

const supportedSymbols = new Set([
  "AAPL",
  "NVDA",
  "TSLA",
  "^GSPC",
  "^IXIC",
]);

const glassCard =
  "rounded-2xl border border-white/80 bg-white/75 shadow-[0_4px_24px_rgba(24,48,85,0.045)] backdrop-blur-xl";

function formatPrice(price: number, currency = "USD") {
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

function formatIndex(price: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getTickerName(ticker: string) {
  const names: Record<string, string> = {
    AAPL: "Apple",
    NVDA: "NVIDIA",
    TSLA: "Tesla",
    "^GSPC": "S&P 500",
    "^IXIC": "NASDAQ",
  };
  return names[ticker] ?? ticker;
}

function changeTone(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "bg-slate-100/80 text-slate-500";
  }
  return value >= 0
    ? "bg-emerald-50 text-emerald-700"
    : "bg-rose-50 text-rose-700";
}

function reportLines(answer: string) {
  return answer.split("\n").map((line) => line.trim()).filter(Boolean);
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [analysisMeta, setAnalysisMeta] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const [marketData, setMarketData] = useState<Record<string, MarketQuote>>({});
  const [marketLoading, setMarketLoading] = useState(true);
  const [marketUpdatedAt, setMarketUpdatedAt] = useState<string | null>(null);
  const [marketError, setMarketError] = useState("");

  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsUpdatedAt, setNewsUpdatedAt] = useState<string | null>(null);
  const [newsError, setNewsError] = useState("");
  const [failedNewsTickers, setFailedNewsTickers] = useState<string[]>([]);
  const [copyMessage, setCopyMessage] = useState("");

  const loadMarketData = useCallback(async () => {
    setMarketLoading(true);

    try {
      const response = await fetch("/api/market", { cache: "no-store" });
      if (!response.ok) throw new Error("Market data request failed.");

      const data: MarketResponse = await response.json();
      if (!Array.isArray(data.stocks)) {
        throw new Error("Invalid market data response.");
      }

      const quotes: Record<string, MarketQuote> = {};
      for (const quote of data.stocks) {
        if (
          quote &&
          typeof quote.ticker === "string" &&
          supportedSymbols.has(quote.ticker)
        ) {
          quotes[quote.ticker] = quote;
        }
      }

      setMarketData((previous) => ({ ...previous, ...quotes }));
      setMarketUpdatedAt(data.fetchedAt ?? new Date().toISOString());
      setMarketError("");
    } catch {
      setMarketError("Unable to refresh market data. Previously loaded quotes are retained.");
    } finally {
      setMarketLoading(false);
    }
  }, []);

  const loadNews = useCallback(async () => {
    setNewsLoading(true);

    try {
      const response = await fetch("/api/news", { cache: "no-store" });
      const data: NewsResponse = await response.json();

      if (!response.ok) throw new Error("The news service is temporarily unavailable.");
      if (!Array.isArray(data.news)) throw new Error("The news response was invalid.");

      const validNews = data.news.filter((item) => {
        if (!item || typeof item.title !== "string" || typeof item.url !== "string") {
          return false;
        }

        try {
          const url = new URL(item.url);
          return url.protocol === "https:" || url.protocol === "http:";
        } catch {
          return false;
        }
      });

      setNews(validNews);
      setNewsUpdatedAt(data.fetchedAt ?? new Date().toISOString());
      setFailedNewsTickers(
        Array.isArray(data.failedTickers) ? data.failedTickers : []
      );
      setNewsError(
        validNews.length === 0
          ? "No headlines were returned. Try refreshing the feed."
          : ""
      );
    } catch {
      setNewsError("Unable to load financial news. Please try again later.");
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMarketData();
    void loadNews();

    const marketInterval = window.setInterval(() => void loadMarketData(), 60_000);
    const newsInterval = window.setInterval(() => void loadNews(), 300_000);

    return () => {
      window.clearInterval(marketInterval);
      window.clearInterval(newsInterval);
    };
  }, [loadMarketData, loadNews]);

  async function analyzeQuestion(nextQuestion?: string) {
    const researchQuestion = (nextQuestion ?? question).trim();
    if (!researchQuestion || loading) return;

    setQuestion(researchQuestion);
    setLoading(true);
    setAnswer("");
    setAnalysisMeta(null);
    setCopyMessage("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: researchQuestion }),
      });

      const data: AnalysisResponse = await response.json();

      if (!response.ok) {
        setAnswer(data.error || "The research request failed.");
        setAnalysisMeta(data);
        return;
      }

      setAnswer(
        typeof data.answer === "string"
          ? data.answer
          : "The research engine returned an unexpected response."
      );
      setAnalysisMeta(data);
    } catch {
      setAnswer("Unable to reach the Stocky research engine. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(answer);
      setCopyMessage("Report copied");
    } catch {
      setCopyMessage("Copy failed. Select the report text to copy it.");
    }
  }

  const sp500 = marketData["^GSPC"];
  const nasdaq = marketData["^IXIC"];

  const indexesAvailable =
    sp500?.available === true &&
    typeof sp500.price === "number" &&
    nasdaq?.available === true &&
    typeof nasdaq.price === "number";

  const marketDirection = indexesAvailable
    ? typeof sp500.changePercent === "number" &&
      typeof nasdaq.changePercent === "number"
      ? sp500.changePercent >= 0 && nasdaq.changePercent >= 0
        ? "Positive"
        : sp500.changePercent < 0 && nasdaq.changePercent < 0
          ? "Negative"
          : "Mixed"
      : "Unassessed"
    : "Unassessed";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F2F6FC] text-[#172B4D]">
      {/* Soft background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-32 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute -right-32 top-64 h-96 w-96 rounded-full bg-cyan-100/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-indigo-100/30 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1320px] px-3 py-4 sm:px-5 lg:px-7">
        {/* COMPACT HEADER */}
        <header className={`${glassCard} flex flex-wrap items-center justify-between gap-3 px-4 py-3`}>
          <a href="#" className="flex min-w-0 items-center gap-3">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white">
  <Image
    src="/stocky-logo.jpg"
    alt="Stocky AI logo"
    fill
    priority
    sizes="44px"
    className="object-contain p-1"
  />
</div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight">
                  Stocky <span className="text-blue-600">AI</span>
                </h1>
                <span className="rounded-md border border-blue-100 bg-blue-50/80 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-blue-700">
                  RESEARCH DESK
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-500">
                AI research for tokenized U.S. equities
              </p>
            </div>
          </a>

          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
  
            <a
              href="#research"
              className="ml-1 rounded-lg bg-[#142B52] px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-blue-800"
            >
              Ask Stocky ↗
            </a>
          </div>
        </header>

        {/* HERO */}
        <section className="mt-4 grid gap-3 lg:grid-cols-[1.5fr_0.8fr]">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#102344] via-[#173965] to-[#1D4E89] p-5 text-white shadow-[0_12px_35px_rgba(20,43,82,0.12)] sm:p-6">
            <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-2 top-7 h-40 w-40 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute bottom-0 right-24 h-32 w-32 rounded-full bg-blue-400/10 blur-2xl" />

            <div className="relative max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9px] font-semibold tracking-[0.12em] text-blue-100">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                MARKET INTELLIGENCE
              </span>

              <h2 className="mt-4 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                Better research.
                <span className="block text-blue-200">Clearer decisions.</span>
              </h2>

              <p className="mt-2 max-w-lg text-xs leading-6 text-blue-50/80">
                Explore market prices, follow financial headlines, and turn evidence
                into structured research — with you in control of every decision.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href="#price-chart"
                  className="rounded-lg bg-white px-3.5 py-2 text-[11px] font-bold text-[#142B52] transition hover:bg-blue-50"
                >
                  Explore price chart
                </a>
                <a
                  href="#news"
                  className="rounded-lg border border-white/20 bg-white/5 px-3.5 py-2 text-[11px] font-semibold text-white transition hover:bg-white/10"
                >
                  Latest headlines
                </a>
              </div>
            </div>
          </div>

          <div className={`${glassCard} p-4 sm:p-5`}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold">Workspace status</h3>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">
                READY
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-white bg-white/65 p-3">
                <p className="text-[10px] text-slate-500">Market feed</p>
                <p className="mt-1.5 text-sm font-bold">
                  {marketLoading ? "Updating" : indexesAvailable ? "Connected" : "Partial"}
                </p>
                <p className="mt-1 text-[9px] text-slate-400">Yahoo Finance</p>
              </div>
              <div className="rounded-xl border border-white bg-white/65 p-3">
                <p className="text-[10px] text-slate-500">Financial news</p>
                <p className="mt-1.5 text-sm font-bold">
                  {newsLoading ? "Updating" : news.length > 0 ? "Available" : "Check feed"}
                </p>
                <p className="mt-1 text-[9px] text-slate-400">{news.length} headlines</p>
              </div>
              <div className="rounded-xl border border-white bg-white/65 p-3">
                <p className="text-[10px] text-slate-500">AI provider</p>
                <p className="mt-1.5 text-sm font-bold">Gemini</p>
                <p className="mt-1 text-[9px] text-slate-400">
                  Verified when analysis runs
                </p>
              </div>
              <div className="rounded-xl border border-white bg-white/65 p-3">
                <p className="text-[10px] text-slate-500">Market stance</p>
                <p className="mt-1.5 text-sm font-bold">{marketDirection}</p>
                <p className="mt-1 text-[9px] text-slate-400">Index changes only</p>
              </div>
            </div>
          </div>
        </section>

        {/* MARKET OVERVIEW */}
        <section className="mt-6">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">Market overview</h3>
                <span className="rounded bg-white/80 px-1.5 py-0.5 text-[9px] text-slate-500">
                  U.S. INDICES
                </span>
              </div>
              <p className="mt-1 text-[10px] text-slate-500">
                Broad market context · quotes may be delayed
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadMarketData()}
              disabled={marketLoading}
              className="rounded-lg border border-white bg-white/70 px-3 py-1.5 text-[10px] font-semibold text-slate-600 transition hover:bg-white disabled:opacity-50"
            >
              {marketLoading ? "Updating..." : "Refresh ↻"}
            </button>
          </div>

          {marketError && (
            <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50/90 px-3 py-2 text-[11px] text-rose-700">
              {marketError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
            {[
              { ticker: "^GSPC", label: "S&P 500", quote: sp500 },
              { ticker: "^IXIC", label: "NASDAQ Composite", quote: nasdaq },
            ].map(({ ticker, label, quote }) => {
              const available =
                quote?.available === true && typeof quote.price === "number";
              const change = formatPercent(quote?.changePercent);

              return (
                <div key={ticker} className={`${glassCard} p-3.5`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-medium text-slate-500">{label}</p>
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  </div>
                  <p className="mt-2 text-lg font-bold tracking-tight sm:text-xl">
                    {available
                      ? formatIndex(quote.price!)
                      : marketLoading
                        ? "Loading..."
                        : "Unavailable"}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    {change ? (
                      <span className={`rounded-md px-1.5 py-1 text-[10px] font-semibold ${changeTone(quote?.changePercent)}`}>
                        {change}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400">Change unavailable</span>
                    )}
                    <span className="truncate text-[9px] text-slate-400">
                      {formatDateTime(quote?.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}

            <div className={`${glassCard} p-3.5`}>
              <p className="text-[10px] font-medium text-slate-500">Market direction</p>
              <p className="mt-2 text-lg font-bold">{marketDirection}</p>
              <p className="mt-2 text-[9px] leading-4 text-slate-400">
                Summarized from reported index changes
              </p>
            </div>

            <div className={`${glassCard} p-3.5`}>
              <p className="text-[10px] font-medium text-slate-500">Last market fetch</p>
              <p className="mt-2 text-sm font-bold">{formatDateTime(marketUpdatedAt)}</p>
              <p className="mt-2 text-[9px] leading-4 text-slate-400">
                Source may provide delayed data
              </p>
            </div>
          </div>
        </section>

        {/* PRICE CHART */}
        <section id="price-chart" className="mt-6 scroll-mt-4">
          <div className="mb-3">
            <h3 className="text-sm font-bold">Price performance</h3>
            <p className="mt-1 text-[10px] text-slate-500">
              Historical observations for AAPL across selectable time ranges
            </p>
          </div>
          <StockPriceChart ticker="AAPL" />
        </section>

        {/* NEWS */}
        <section id="news" className="mt-6 scroll-mt-4">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">Financial news</h3>
              <p className="mt-1 text-[10px] text-slate-500">
                Recent headlines related to selected companies
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadNews()}
              disabled={newsLoading}
              className="rounded-lg border border-white bg-white/75 px-3 py-1.5 text-[10px] font-semibold text-slate-600 transition hover:bg-white disabled:opacity-50"
            >
              {newsLoading ? "Refreshing..." : "Refresh news ↻"}
            </button>
          </div>

          {newsError && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-[10px] text-amber-800">
              {newsError}
            </div>
          )}

          {failedNewsTickers.length > 0 && (
            <p className="mb-3 text-[10px] text-amber-700">
              Some searches failed: {failedNewsTickers.join(", ")}.
            </p>
          )}

          {newsLoading && news.length === 0 ? (
            <div className={`${glassCard} p-6 text-center text-xs text-slate-500`}>
              Loading financial headlines...
            </div>
          ) : news.length === 0 ? (
            <div className={`${glassCard} p-6 text-center text-xs text-slate-500`}>
              No headlines are currently available.
            </div>
          ) : (
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              {news.slice(0, 9).map((item) => (
                <article
                  key={item.id}
                  className={`${glassCard} flex flex-col p-3.5 transition duration-200 hover:-translate-y-0.5 hover:bg-white/95 hover:shadow-md`}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(item.relatedTickers ?? [])
                      .filter((ticker) => ["AAPL", "NVDA", "TSLA"].includes(ticker))
                      .slice(0, 3)
                      .map((ticker) => (
                        <span
                          key={ticker}
                          className="rounded-md bg-blue-50 px-1.5 py-1 text-[9px] font-bold text-blue-700"
                        >
                          {ticker}
                        </span>
                      ))}
                    <span className="text-[9px] text-slate-400">
                      {formatDateTime(item.publishedAt)}
                    </span>
                  </div>

                  <h4 className="mt-2.5 flex-1 text-xs font-semibold leading-5 text-slate-800">
                    {item.title}
                  </h4>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100/90 pt-2.5">
                    <span className="max-w-[65%] truncate text-[10px] text-slate-500">
                      {item.publisher || "Publisher not listed"}
                    </span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-[10px] font-semibold text-blue-700 hover:underline"
                    >
                      Read source ↗
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}

          <p className="mt-2 text-[9px] leading-4 text-slate-400">
            Headlines are not full articles. Verify details using the original source.
          </p>
        </section>

        {/* RESEARCH DESK */}
        <section id="research" className="mt-6 scroll-mt-4">
          <div className="mb-3">
            <h3 className="text-sm font-bold">Ask Stocky</h3>
            <p className="mt-1 text-[10px] text-slate-500">
              Generate an AI-assisted report using the existing research engine.
            </p>
          </div>

          <div className={`${glassCard} overflow-hidden`}>
            <div className="border-b border-white/90 bg-white/45 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#142B52] text-[10px] font-black text-white">
                    S
                  </div>
                  <div>
                    <p className="text-xs font-bold">Stocky Research Engine</p>
                    <p className="text-[9px] text-slate-500">
                      Gemini · Market context · News context
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-blue-100 bg-blue-50/80 px-2 py-1 text-[9px] font-semibold text-blue-700">
                  HUMAN-IN-THE-LOOP
                </span>
              </div>
            </div>

            <div className="p-3.5 sm:p-4">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void analyzeQuestion();
                }}
                className="flex flex-col gap-2 sm:flex-row"
              >
                <input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask about AAPL, NVDA, risk, catalysts..."
                  className="min-w-0 flex-1 rounded-xl border border-white bg-white/80 px-3.5 py-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="submit"
                  disabled={loading || !question.trim()}
                  className="rounded-xl bg-[#142B52] px-5 py-3 text-xs font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Researching..." : "Generate report →"}
                </button>
              </form>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {prompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void analyzeQuestion(prompt)}
                    disabled={loading}
                    className="rounded-full border border-white bg-white/65 px-2.5 py-1.5 text-[10px] text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {loading && (
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                    <div>
                      <p className="text-xs font-semibold text-slate-700">
                        Preparing your research
                      </p>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Gathering market context and generating analysis...
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {answer && (
                <div className="mt-4 overflow-hidden rounded-xl border border-white bg-white/85">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-3.5 py-3">
                    <div>
                      <p className="text-xs font-bold">Research report</p>
                      <p className="mt-1 text-[9px] text-slate-500">
                        {analysisMeta?.aiProvider || "Stocky AI"}
                        {analysisMeta?.aiModel ? ` · ${analysisMeta.aiModel}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void copyReport()}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Copy report ↗
                    </button>
                  </div>

                  {copyMessage && (
                    <p className="border-b border-slate-100 bg-emerald-50/70 px-3.5 py-2 text-[10px] text-emerald-700">
                      {copyMessage}
                    </p>
                  )}

                  <div className="p-4">
                    <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50/60 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-blue-700">
                        Research question
                      </p>
                      <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-800">
                        {question}
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      {reportLines(answer).map((line, index) => {
                        const heading = line.match(
                          /^(#{1,4}\s+|(?:\d+[.)]\s+))(.+)$/
                        );
                        const bullet = /^[-*•]\s+/.test(line);
                        const content = heading
                          ? heading[2]
                          : bullet
                            ? line.replace(/^[-*•]\s+/, "")
                            : line;

                        if (heading) {
                          return (
                            <h4
                              key={index}
                              className="border-b border-slate-100 pb-2 pt-2 text-xs font-bold leading-5 text-[#142B52]"
                            >
                              {content.replace(/\*\*/g, "")}
                            </h4>
                          );
                        }

                        if (bullet) {
                          return (
                            <div key={index} className="flex gap-2.5 pl-0.5">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                              <p className="text-xs leading-6 text-slate-600">
                                {content.replace(/\*\*/g, "")}
                              </p>
                            </div>
                          );
                        }

                        return (
                          <p key={index} className="text-xs leading-6 text-slate-600">
                            {content.replace(/\*\*/g, "")}
                          </p>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 bg-slate-50/70 px-3.5 py-3">
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-md px-2 py-1 text-[9px] font-semibold ${
                        analysisMeta?.llmConnected
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {analysisMeta?.llmConnected ? "AI connected" : "Fallback or unverified AI"}
                      </span>
                      <span className={`rounded-md px-2 py-1 text-[9px] font-semibold ${
                        analysisMeta?.liveMarketData
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {analysisMeta?.liveMarketData ? "Market data included" : "Market data not confirmed"}
                      </span>
                      {analysisMeta?.generatedAt && (
                        <span className="self-center text-[9px] text-slate-400">
                          Generated {formatDateTime(analysisMeta.generatedAt)}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-[10px] leading-5 text-slate-500">
                      Research is informational, not personalized financial advice.
                      Verify important facts, consider opposing scenarios, and make
                      your own decisions. Market data may be delayed.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* WATCHLIST */}
        <section id="watchlist" className="mt-6 scroll-mt-4">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">Watchlist</h3>
              <p className="mt-1 text-[10px] text-slate-500">
                Selected U.S. equity quotes
              </p>
            </div>
            <span className="text-[9px] text-slate-400">
              Last fetched {formatDateTime(marketUpdatedAt)}
            </span>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-3">
            {stocks.map((stock) => {
              const quote = marketData[stock.symbol];
              const hasPrice =
                quote?.available === true &&
                typeof quote.price === "number" &&
                Number.isFinite(quote.price);
              const change = formatPercent(quote?.changePercent);

              return (
                <article key={stock.symbol} className={`${glassCard} p-3.5`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold">{stock.symbol}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">{stock.name}</p>
                    </div>
                    <span className="rounded-md border border-blue-100 bg-blue-50/70 px-1.5 py-1 text-[9px] font-semibold text-blue-700">
                      EQUITY
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
                    <p className="text-xl font-bold tracking-tight">
                      {hasPrice
                        ? formatPrice(quote.price!, quote.currency || "USD")
                        : marketLoading
                          ? "Loading..."
                          : "Unavailable"}
                    </p>
                    {change ? (
                      <span className={`rounded-md px-1.5 py-1 text-[10px] font-semibold ${changeTone(quote?.changePercent)}`}>
                        {change}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400">No change data</span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100/90 pt-2.5">
                    <span className="text-[9px] text-slate-500">Risk profile</span>
                    <span className={`rounded-md px-1.5 py-1 text-[9px] font-semibold ${
                      stock.risk === "High"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-blue-50 text-blue-700"
                    }`}>
                      {stock.risk}
                    </span>
                  </div>

                  {quote?.timestamp && (
                    <p className="mt-2 text-[9px] text-slate-400">
                      Quote time: {formatDateTime(quote.timestamp)}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
          <p className="mt-2 text-[9px] text-slate-400">
            Source: Yahoo Finance chart endpoint. Risk labels are general categories,
            not calculated risk scores.
          </p>
        </section>

        {/* INTELLIGENCE AND RISK */}
        <section className="mt-6 grid gap-2.5 lg:grid-cols-2">
          <div className={`${glassCard} p-4`}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold">Research watchpoints</h3>
              <span className="rounded-md bg-blue-50 px-2 py-1 text-[9px] font-semibold text-blue-700">
                CHECK THESE
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {[
                {
                  title: "Technology momentum",
                  text: "Compare current price action with broader sector performance.",
                },
                {
                  title: "Volatility and drawdown",
                  text: "Review historical movement and downside scenarios before acting.",
                },
                {
                  title: "Upcoming catalysts",
                  text: "Verify earnings dates, company announcements, and economic releases.",
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-2.5 rounded-xl bg-white/55 p-2.5">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  <div>
                    <p className="text-[11px] font-semibold">{item.title}</p>
                    <p className="mt-1 text-[10px] leading-5 text-slate-500">
                      {item.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[9px] text-slate-400">
              Research prompts only; these are not live trading signals.
            </p>
          </div>

          <div className={`${glassCard} p-4`}>
            <h3 className="text-xs font-bold">Risk review framework</h3>
            <p className="mt-1 text-[10px] text-slate-500">
              Questions Stocky should help you investigate.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                ["Market risk", "What could move the broader market?"],
                ["Company risk", "What could weaken the company outlook?"],
                ["Catalyst risk", "What events could change the thesis?"],
              ].map(([label, text]) => (
                <div key={label} className="rounded-xl border border-white bg-white/55 p-3">
                  <p className="text-[10px] font-bold">{label}</p>
                  <p className="mt-1.5 text-[10px] leading-5 text-slate-500">
                    {text}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl bg-[#142B52] p-3.5 text-white">
              <p className="text-[11px] font-bold">Stocky principle</p>
              <p className="mt-1 text-[10px] leading-5 text-blue-100/80">
                AI organizes evidence and uncertainty. People make the final decision.
              </p>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-6 flex flex-col gap-2 border-t border-white/90 py-4 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-slate-600">
            Stocky AI <span className="font-normal text-slate-400">· Research workspace</span>
          </p>
          <p>Market data may be delayed · Research only · Human decision-maker</p>
        </footer>
      </div>
    </main>
  );
}