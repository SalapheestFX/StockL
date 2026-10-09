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
  "rounded-[28px] border border-white/70 bg-white/55 shadow-[0_15px_50px_rgba(15,23,42,0.07)] backdrop-blur-2xl";

const innerGlass =
  "rounded-2xl border border-white/70 bg-white/40 backdrop-blur-xl";

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
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function changeTone(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "bg-white/60 text-slate-500";
  }

  return value >= 0
    ? "bg-emerald-50/90 text-emerald-700"
    : "bg-rose-50/90 text-rose-700";
}

function reportLines(answer: string) {
  return answer
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      {eyebrow && (
        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-blue-700">
          {eyebrow}
        </p>
      )}

      <h3 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
        {title}
      </h3>

      <p className="mt-1 text-[11px] leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function StatusDot({ active = true }: { active?: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${
        active ? "bg-emerald-500" : "bg-amber-400"
      }`}
    />
  );
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const [analysisMeta, setAnalysisMeta] =
    useState<AnalysisResponse | null>(null);

  const [loading, setLoading] = useState(false);

  const [marketData, setMarketData] =
    useState<Record<string, MarketQuote>>({});

  const [marketLoading, setMarketLoading] = useState(true);

  const [marketUpdatedAt, setMarketUpdatedAt] =
    useState<string | null>(null);

  const [marketError, setMarketError] = useState("");

  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  const [newsUpdatedAt, setNewsUpdatedAt] =
    useState<string | null>(null);

  const [newsError, setNewsError] = useState("");

  const [failedNewsTickers, setFailedNewsTickers] =
    useState<string[]>([]);

  const [copyMessage, setCopyMessage] = useState("");

  const loadMarketData = useCallback(async () => {
    setMarketLoading(true);

    try {
      const response = await fetch("/api/market", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Market data request failed.");
      }

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

      setMarketData((previous) => ({
        ...previous,
        ...quotes,
      }));

      setMarketUpdatedAt(
        data.fetchedAt ?? new Date().toISOString()
      );

      setMarketError("");
    } catch {
      setMarketError(
        "Unable to refresh market data. Previously loaded quotes are retained."
      );
    } finally {
      setMarketLoading(false);
    }
  }, []);

  const loadNews = useCallback(async () => {
    setNewsLoading(true);

    try {
      const response = await fetch("/api/news", {
        cache: "no-store",
      });

      const data: NewsResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          "The news service is temporarily unavailable."
        );
      }

      if (!Array.isArray(data.news)) {
        throw new Error("The news response was invalid.");
      }

      const validNews = data.news.filter((item) => {
        if (
          !item ||
          typeof item.title !== "string" ||
          typeof item.url !== "string"
        ) {
          return false;
        }

        try {
          const url = new URL(item.url);

          return (
            url.protocol === "https:" ||
            url.protocol === "http:"
          );
        } catch {
          return false;
        }
      });

      setNews(validNews);

      setNewsUpdatedAt(
        data.fetchedAt ?? new Date().toISOString()
      );

      setFailedNewsTickers(
        Array.isArray(data.failedTickers)
          ? data.failedTickers
          : []
      );

      setNewsError(
        validNews.length === 0
          ? "No headlines were returned. Try refreshing the feed."
          : ""
      );
    } catch {
      setNewsError(
        "Unable to load financial news. Please try again later."
      );
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMarketData();
    void loadNews();

    const marketInterval = window.setInterval(
      () => void loadMarketData(),
      60_000
    );

    const newsInterval = window.setInterval(
      () => void loadNews(),
      300_000
    );

    return () => {
      window.clearInterval(marketInterval);
      window.clearInterval(newsInterval);
    };
  }, [loadMarketData, loadNews]);

  async function analyzeQuestion(nextQuestion?: string) {
    const researchQuestion = (
      nextQuestion ?? question
    ).trim();

    if (!researchQuestion || loading) return;

    setQuestion(researchQuestion);
    setLoading(true);
    setAnswer("");
    setAnalysisMeta(null);
    setCopyMessage("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: researchQuestion,
        }),
      });

      const data: AnalysisResponse = await response.json();

      if (!response.ok) {
        setAnswer(
          data.error || "The research request failed."
        );

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
      setAnswer(
        "Unable to reach the Stocky research engine. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(answer);
      setCopyMessage("Report copied successfully.");
    } catch {
      setCopyMessage(
        "Copy failed. Select the report text to copy it."
      );
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
      ? sp500.changePercent >= 0 &&
        nasdaq.changePercent >= 0
        ? "Positive"
        : sp500.changePercent < 0 &&
            nasdaq.changePercent < 0
          ? "Negative"
          : "Mixed"
      : "Unassessed"
    : "Unassessed";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#edf4f8] text-slate-950">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-32 h-[28rem] w-[28rem] rounded-full bg-sky-300/25 blur-3xl" />
        <div className="absolute -right-32 top-40 h-[30rem] w-[30rem] rounded-full bg-blue-300/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-indigo-300/15 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-white/40 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1320px] px-3 py-4 sm:px-5 sm:py-6 lg:px-7">
        {/* HEADER */}
        <header
          className={`${glassCard} flex items-center justify-between gap-3 px-3 py-3 sm:px-5`}
        >
          <a
            href="#"
            className="flex min-w-0 items-center gap-2.5 sm:gap-3"
          >
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-2xl border border-white/80 bg-white/75 shadow-sm sm:h-11 sm:w-11">
              <Image
                src="/stocky-logo.jpg"
                alt="Stocky AI logo"
                fill
                priority
                sizes="44px"
                className="object-contain p-1"
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm font-extrabold tracking-tight text-slate-950 sm:text-base">
                  Stocky <span className="text-blue-700">AI</span>
                </h1>

                <span className="rounded-lg border border-blue-100/90 bg-blue-50/80 px-1.5 py-1 text-[7px] font-bold tracking-[0.1em] text-blue-700 sm:px-2 sm:text-[8px]">
                  RESEARCH DESK
                </span>
              </div>

              <p className="mt-0.5 hidden text-[10px] text-slate-500 sm:block">
                Simple, structured equity research
              </p>
            </div>
          </a>

          <a
            href="#research"
            className="shrink-0 rounded-xl bg-slate-950 px-3 py-2.5 text-[10px] font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:px-4 sm:text-xs"
          >
            Ask Stocky <span aria-hidden="true">↗</span>
          </a>
        </header>

        {/* HERO */}
        <section className="mt-4">
          <div className="relative overflow-hidden rounded-[30px] bg-slate-950/90 p-5 text-white shadow-[0_25px_70px_rgba(15,23,42,0.18)] sm:p-7 lg:p-9">
            <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-4 top-10 h-44 w-44 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -bottom-20 right-20 h-60 w-60 rounded-full bg-sky-400/15 blur-3xl" />
            <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />

            <div className="relative max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[9px] font-semibold tracking-[0.16em] text-sky-100">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-300" />
                MARKET INTELLIGENCE
              </span>

              <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[42px]">
                Better research.
                <span className="block text-sky-200">
                  Clearer decisions.
                </span>
              </h2>

              <p className="mt-3 max-w-lg text-xs leading-6 text-slate-300 sm:text-sm sm:leading-7">
                Explore market prices, follow financial headlines, and
                turn evidence into structured research — with you in
                control of every decision.
              </p>

              <div className="mt-6 flex flex-wrap gap-2.5">
                <a
                  href="#price-chart"
                  className="rounded-xl bg-white px-4 py-3 text-[10px] font-bold text-slate-950 transition hover:bg-sky-50"
                >
                  Explore price chart ↗
                </a>

                <a
                  href="#news"
                  className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-[10px] font-semibold text-white transition hover:bg-white/10"
                >
                  Latest headlines
                </a>
              </div>

              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-5 text-[9px] text-slate-400">
                <span className="flex items-center gap-2">
                  <StatusDot active />
                  Market monitoring
                </span>

                <span className="flex items-center gap-2">
                  <StatusDot active />
                  AI-assisted research
                </span>

                <span className="flex items-center gap-2">
                  <StatusDot active />
                  Human-led decisions
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* MARKET OVERVIEW */}
        <section className="mt-7">
          <SectionHeading
            eyebrow="The big picture"
            title="Market overview"
            description="Broad U.S. market context. Quotes may be delayed."
          />

          {marketError && (
            <div className="mb-4 rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-[11px] leading-5 text-rose-700">
              {marketError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { ticker: "^GSPC", label: "S&P 500", quote: sp500 },
              {
                ticker: "^IXIC",
                label: "NASDAQ Composite",
                quote: nasdaq,
              },
            ].map(({ ticker, label, quote }) => {
              const available =
                quote?.available === true &&
                typeof quote.price === "number";

              const change = formatPercent(
                quote?.changePercent
              );

              return (
                <article
                  key={ticker}
                  className={`${glassCard} p-4 sm:p-5`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-xl border border-white bg-white/65 px-2.5 py-1.5 text-[9px] font-bold tracking-wide text-slate-600">
                      INDEX
                    </span>

                    <span className="text-[9px] text-slate-400">
                      {ticker}
                    </span>
                  </div>

                  <p className="mt-4 text-xs font-medium text-slate-500">
                    {label}
                  </p>

                  <p className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-950">
                    {available
                      ? formatIndex(quote.price!)
                      : marketLoading
                        ? "Loading..."
                        : "Unavailable"}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/80 pt-3">
                    {change ? (
                      <span
                        className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${changeTone(
                          quote?.changePercent
                        )}`}
                      >
                        {change}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400">
                        Change unavailable
                      </span>
                    )}

                    <span className="text-[9px] text-slate-400">
                      {formatDateTime(quote?.timestamp)}
                    </span>
                  </div>
                </article>
              );
            })}

            <article className={`${glassCard} p-4 sm:p-5`}>
              <span className="inline-flex rounded-xl border border-white bg-white/65 px-2.5 py-1.5 text-[9px] font-bold text-slate-600">
                MARKET SIGNAL
              </span>

              <p className="mt-4 text-xs font-medium text-slate-500">
                Market direction
              </p>

              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                {marketDirection}
              </p>

              <p className="mt-3 text-[10px] leading-5 text-slate-500">
                Summarized from reported S&P 500 and NASDAQ changes.
              </p>
            </article>

            <article className={`${glassCard} p-4 sm:p-5`}>
              <span className="inline-flex rounded-xl border border-white bg-white/65 px-2.5 py-1.5 text-[9px] font-bold text-slate-600">
                DATA STATUS
              </span>

              <p className="mt-4 text-xs font-medium text-slate-500">
                Last market fetch
              </p>

              <p className="mt-2 text-lg font-bold tracking-tight text-slate-950">
                {formatDateTime(marketUpdatedAt)}
              </p>

              <p className="mt-3 text-[10px] leading-5 text-slate-500">
                The source may provide delayed data.
              </p>
            </article>
          </div>
        </section>

        {/* AI RESEARCH — MOVED DIRECTLY BELOW MARKET OVERVIEW */}
        <section id="research" className="mt-7 scroll-mt-5">
          <SectionHeading
            eyebrow="Your research assistant"
            title="Ask Stocky"
            description="Turn a research question into an AI-assisted report using your existing research engine."
          />

          <div className={`${glassCard} overflow-hidden`}>
            <div className="relative overflow-hidden border-b border-white/70 bg-white/35 px-4 py-4 sm:px-5">
              <div className="pointer-events-none absolute -right-10 -top-16 h-36 w-36 rounded-full bg-sky-200/40 blur-3xl" />

              <div className="relative flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-white bg-white/75 shadow-sm">
                    <Image
                      src="/stocky-logo.jpg"
                      alt="Stocky AI"
                      fill
                      sizes="40px"
                      className="object-contain p-1"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Stocky Research Engine
                    </p>

                    <p className="mt-1 text-[10px] text-slate-500">
                      Gemini · Market context · News context
                    </p>
                  </div>
                </div>

                <span className="rounded-full border border-blue-100/80 bg-blue-50/70 px-3 py-1.5 text-[9px] font-semibold tracking-wide text-blue-700">
                  HUMAN-IN-THE-LOOP
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void analyzeQuestion();
                }}
                className="flex flex-col gap-2.5 sm:flex-row"
              >
                <input
                  value={question}
                  onChange={(event) =>
                    setQuestion(event.target.value)
                  }
                  placeholder="Ask about AAPL, NVDA, risk, catalysts..."
                  className="min-w-0 flex-1 rounded-2xl border border-white/90 bg-white/60 px-4 py-3.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white/80 focus:ring-4 focus:ring-sky-100/60"
                />

                <button
                  type="submit"
                  disabled={loading || !question.trim()}
                  className="rounded-2xl bg-slate-950 px-5 py-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Researching..."
                    : "Generate report →"}
                </button>
              </form>

              <div className="mt-3 flex flex-wrap gap-2">
                {prompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void analyzeQuestion(prompt)}
                    disabled={loading}
                    className="rounded-full border border-white/90 bg-white/45 px-3 py-2 text-[10px] font-medium text-slate-600 transition hover:border-sky-200 hover:bg-sky-50/80 hover:text-blue-700 disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {loading && (
                <div className="mt-5 rounded-2xl border border-sky-100/90 bg-sky-50/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-200 border-t-blue-600" />

                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        Preparing your research
                      </p>

                      <p className="mt-1 text-[10px] leading-5 text-slate-500">
                        Gathering market context and generating analysis...
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {answer && (
                <div className="mt-5 overflow-hidden rounded-[24px] border border-white/80 bg-white/45">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/90 bg-white/45 px-4 py-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        Research report
                      </p>

                      <p className="mt-1 text-[10px] text-slate-500">
                        {analysisMeta?.aiProvider || "Stocky AI"}
                        {analysisMeta?.aiModel
                          ? ` · ${analysisMeta.aiModel}`
                          : ""}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void copyReport()}
                      className="rounded-xl border border-white bg-white/75 px-3 py-2 text-[10px] font-semibold text-slate-700 transition hover:bg-white"
                    >
                      Copy report ↗
                    </button>
                  </div>

                  {copyMessage && (
                    <p className="border-b border-white/80 bg-emerald-50/70 px-4 py-2.5 text-[10px] text-emerald-700">
                      {copyMessage}
                    </p>
                  )}

                  <div className="p-4 sm:p-5">
                    <div className="mb-5 rounded-2xl border border-white/90 bg-white/55 p-4">
                      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-blue-700">
                        Research question
                      </p>

                      <p className="mt-2 text-xs font-semibold leading-6 text-slate-800">
                        {question}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {reportLines(answer).map((line, index) => {
                        const heading = line.match(
                          /^(#{1,6}\s+|\*\*)(.+?)(\*\*)?:?$/
                        );

                        const numberedHeading = line.match(
                          /^(\d+[.)]\s+)(.+)$/
                        );

                        const bullet = /^[-*•]\s+/.test(line);

                        const isHeading =
                          Boolean(heading) ||
                          Boolean(numberedHeading);

                        const content = heading
                          ? heading[2]
                          : numberedHeading
                            ? numberedHeading[2]
                            : bullet
                              ? line.replace(/^[-*•]\s+/, "")
                              : line;

                        if (isHeading) {
                          return (
                            <h4
                              key={index}
                              className="border-b border-white/90 pb-2 pt-2 text-sm font-bold leading-6 text-slate-900"
                            >
                              {content.replace(/\*\*/g, "")}
                            </h4>
                          );
                        }

                        if (bullet) {
                          return (
                            <div
                              key={index}
                              className="flex gap-3 pl-1"
                            >
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />

                              <p className="text-xs leading-6 text-slate-600">
                                {content.replace(/\*\*/g, "")}
                              </p>
                            </div>
                          );
                        }

                        return (
                          <p
                            key={index}
                            className="text-xs leading-6 text-slate-600"
                          >
                            {content.replace(/\*\*/g, "")}
                          </p>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-white/80 bg-white/35 px-4 py-4 sm:px-5">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-lg px-2.5 py-1.5 text-[9px] font-semibold ${
                          analysisMeta?.llmConnected
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {analysisMeta?.llmConnected
                          ? "AI connected"
                          : "Fallback or unverified AI"}
                      </span>

                      <span
                        className={`rounded-lg px-2.5 py-1.5 text-[9px] font-semibold ${
                          analysisMeta?.liveMarketData
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-white/80 text-slate-600"
                        }`}
                      >
                        {analysisMeta?.liveMarketData
                          ? "Market data included"
                          : "Market data not confirmed"}
                      </span>

                      {analysisMeta?.generatedAt && (
                        <span className="self-center text-[9px] text-slate-400">
                          Generated{" "}
                          {formatDateTime(
                            analysisMeta.generatedAt
                          )}
                        </span>
                      )}
                    </div>

                    <p className="mt-3 text-[10px] leading-5 text-slate-500">
                      Research is informational, not personalized
                      financial advice. Verify important facts,
                      consider opposing scenarios, and make your
                      own decisions. Market data may be delayed.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* PRICE CHART */}
        <section
          id="price-chart"
          className="mt-7 scroll-mt-5"
        >
          <SectionHeading
            eyebrow="Historical market data"
            title="Price performance"
            description="Explore historical AAPL price observations across selectable time ranges."
          />

          <div className={`${glassCard} overflow-hidden p-2 sm:p-4`}>
            <StockPriceChart ticker="AAPL" />
          </div>
        </section>

        {/* FINANCIAL NEWS */}
        <section id="news" className="mt-7 scroll-mt-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <SectionHeading
              eyebrow="What is happening"
              title="Financial news"
              description="Recent headlines related to selected companies."
            />

            <button
              type="button"
              onClick={() => void loadNews()}
              disabled={newsLoading}
              className="mb-4 rounded-xl border border-white/80 bg-white/60 px-3.5 py-2.5 text-[10px] font-semibold text-slate-700 shadow-sm transition hover:bg-white disabled:opacity-50"
            >
              {newsLoading ? "Refreshing..." : "Refresh news ↻"}
            </button>
          </div>

          {newsError && (
            <div className="mb-4 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-[10px] leading-5 text-amber-800">
              {newsError}
            </div>
          )}

          {failedNewsTickers.length > 0 && (
            <p className="mb-3 text-[10px] text-amber-700">
              Some searches failed:{" "}
              {failedNewsTickers.join(", ")}.
            </p>
          )}

          {newsLoading && news.length === 0 ? (
            <div className={`${glassCard} p-8 text-center`}>
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-sky-200 border-t-blue-600" />

              <p className="mt-3 text-xs font-medium text-slate-600">
                Loading financial headlines...
              </p>
            </div>
          ) : news.length === 0 ? (
            <div className={`${glassCard} p-8 text-center`}>
              <p className="text-sm font-semibold text-slate-700">
                No headlines available
              </p>

              <p className="mt-2 text-[11px] text-slate-500">
                Try refreshing the feed.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {news.slice(0, 9).map((item) => (
                <article
                  key={item.id}
                  className={`${glassCard} flex flex-col p-4 transition duration-200 hover:-translate-y-0.5 hover:bg-white/75 hover:shadow-[0_20px_55px_rgba(15,23,42,0.10)]`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {(item.relatedTickers ?? [])
                      .filter((ticker) =>
                        ["AAPL", "NVDA", "TSLA"].includes(
                          ticker
                        )
                      )
                      .slice(0, 3)
                      .map((ticker) => (
                        <span
                          key={ticker}
                          className="rounded-lg border border-blue-100/80 bg-blue-50/80 px-2 py-1 text-[9px] font-bold text-blue-700"
                        >
                          {ticker}
                        </span>
                      ))}

                    <span className="text-[9px] text-slate-400">
                      {formatDateTime(item.publishedAt)}
                    </span>
                  </div>

                  <h4 className="mt-4 flex-1 text-sm font-semibold leading-6 text-slate-800">
                    {item.title}
                  </h4>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/90 pt-3">
                    <span className="max-w-[65%] truncate text-[10px] text-slate-500">
                      {item.publisher || "Publisher not listed"}
                    </span>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-lg bg-white/70 px-2.5 py-2 text-[10px] font-semibold text-blue-700 transition hover:bg-white"
                    >
                      Read source ↗
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[9px] text-slate-400">
            <p>
              Headlines are not full articles. Verify details
              using the original source.
            </p>

            <p>Updated {formatDateTime(newsUpdatedAt)}</p>
          </div>
        </section>

        {/* WATCHLIST */}
        <section
          id="watchlist"
          className="mt-7 scroll-mt-5"
        >
          <SectionHeading
            eyebrow="Selected companies"
            title="Watchlist"
            description="Monitor selected U.S. equity quotes and their reported price changes."
          />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {stocks.map((stock) => {
              const quote = marketData[stock.symbol];

              const hasPrice =
                quote?.available === true &&
                typeof quote.price === "number" &&
                Number.isFinite(quote.price);

              const change = formatPercent(
                quote?.changePercent
              );

              return (
                <article
                  key={stock.symbol}
                  className={`${glassCard} p-4 sm:p-5`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-bold tracking-tight text-slate-950">
                        {stock.symbol}
                      </h4>

                      <p className="mt-1 text-[11px] text-slate-500">
                        {stock.name}
                      </p>
                    </div>

                    <span className="rounded-xl border border-white/90 bg-white/55 px-2.5 py-1.5 text-[9px] font-bold tracking-wide text-slate-600">
                      EQUITY
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
                    <p className="break-words text-2xl font-bold tracking-tight text-slate-950">
                      {hasPrice
                        ? formatPrice(
                            quote.price!,
                            quote.currency || "USD"
                          )
                        : marketLoading
                          ? "Loading..."
                          : "Unavailable"}
                    </p>

                    {change ? (
                      <span
                        className={`rounded-xl px-2.5 py-1.5 text-[10px] font-bold ${changeTone(
                          quote?.changePercent
                        )}`}
                      >
                        {change}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400">
                        No change data
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/90 pt-3">
                    <span className="text-[10px] text-slate-500">
                      Risk profile
                    </span>

                    <span
                      className={`rounded-lg px-2.5 py-1.5 text-[9px] font-semibold ${
                        stock.risk === "High"
                          ? "bg-amber-50/90 text-amber-700"
                          : "bg-blue-50/90 text-blue-700"
                      }`}
                    >
                      {stock.risk}
                    </span>
                  </div>

                  {quote?.timestamp && (
                    <p className="mt-3 text-[9px] text-slate-400">
                      Quote time:{" "}
                      {formatDateTime(quote.timestamp)}
                    </p>
                  )}
                </article>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[9px] leading-5 text-slate-400">
            <p>Source: Yahoo Finance chart endpoint.</p>

            <p>
              Risk labels are general categories, not calculated scores.
            </p>
          </div>
        </section>

        {/* INTELLIGENCE AND RISK */}
        <section className="mt-7 grid gap-4 lg:grid-cols-2">
          <div className={`${glassCard} p-4 sm:p-5`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-blue-700">
                  Research checklist
                </p>

                <h3 className="mt-1.5 text-sm font-bold text-slate-900">
                  Research watchpoints
                </h3>
              </div>

              <span className="rounded-xl border border-white/80 bg-white/55 px-2.5 py-1.5 text-[9px] font-semibold text-slate-600">
                CHECK THESE
              </span>
            </div>

            <div className="mt-4 space-y-3">
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
              ].map((item, index) => (
                <div
                  key={item.title}
                  className="flex gap-3 rounded-2xl border border-white/70 bg-white/35 p-3.5"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/90 bg-white/70 text-[10px] font-bold text-blue-700">
                    0{index + 1}
                  </span>

                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      {item.title}
                    </p>

                    <p className="mt-1.5 text-[10px] leading-5 text-slate-500">
                      {item.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 text-[9px] leading-5 text-slate-400">
              Research prompts only. These are not live trading signals.
            </p>
          </div>

          <div className={`${glassCard} p-4 sm:p-5`}>
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-blue-700">
              Decision framework
            </p>

            <h3 className="mt-1.5 text-sm font-bold text-slate-900">
              Risk review framework
            </h3>

            <p className="mt-1.5 text-[10px] leading-5 text-slate-500">
              Questions Stocky should help you investigate before making a decision.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                [
                  "Market risk",
                  "What could move the broader market?",
                ],
                [
                  "Company risk",
                  "What could weaken the company outlook?",
                ],
                [
                  "Catalyst risk",
                  "What events could change the thesis?",
                ],
              ].map(([label, text]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/80 bg-white/40 p-3.5"
                >
                  <p className="text-xs font-bold text-slate-800">
                    {label}
                  </p>

                  <p className="mt-2 text-[10px] leading-5 text-slate-500">
                    {text}
                  </p>
                </div>
              ))}
            </div>

            <div className="relative mt-4 overflow-hidden rounded-[24px] bg-slate-950/90 p-4 text-white shadow-[0_15px_35px_rgba(15,23,42,0.12)]">
              <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-sky-400/15 blur-2xl" />

              <div className="relative">
                <p className="text-xs font-bold">
                  The Stocky principle
                </p>

                <p className="mt-2 text-[10px] leading-5 text-slate-300">
                  AI organizes evidence and uncertainty. People make the final decision.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-7 rounded-[24px] border border-white/70 bg-white/35 px-4 py-4 backdrop-blur-xl sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800">
                Stocky AI
              </p>

              <p className="mt-1 text-[10px] text-slate-500">
                Your AI-assisted research workspace.
              </p>
            </div>

            <p className="max-w-lg text-[9px] leading-5 text-slate-500 sm:text-right">
              Market data may be delayed. Research is informational only.
              Verify important facts and remain the decision-maker.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}