
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Range = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y";

type PricePoint = {
  timestamp: number;
  date: string;
  price: number;
};

type HistoryResponse = {
  ticker: string;
  currency?: string;
  range: string;
  source?: string;
  fetchedAt?: string;
  delayedDataWarning?: string;
  points: PricePoint[];
  error?: string;
};

type StockPriceChartProps = {
  ticker?: string;
};

const RANGES: { label: string; value: Range }[] = [
  { label: "1D", value: "1d" },
  { label: "5D", value: "5d" },
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
];

function formatPrice(value: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatDate(value: string, range: Range) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  if (range === "1d" || range === "5d") {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: range === "1d" ? "2-digit" : undefined,
    });
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: range === "1y" ? "2-digit" : undefined,
  });
}

export default function StockPriceChart({
  ticker = "AAPL",
}: StockPriceChartProps) {
  const [range, setRange] = useState<Range>("5d");
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadHistory() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/history?ticker=${encodeURIComponent(ticker)}&range=${range}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const result = (await response.json()) as HistoryResponse;

        if (!response.ok) {
          throw new Error(
            result.error || "Unable to load historical price data."
          );
        }

        if (!Array.isArray(result.points) || result.points.length === 0) {
          throw new Error("No price history is available for this period.");
        }

        setData(result);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading the chart."
        );
        setData(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadHistory();

    return () => controller.abort();
  }, [ticker, range]);

  const points = useMemo(
    () =>
      (data?.points ?? [])
        .filter(
          (point) =>
            Number.isFinite(point.price) &&
            Number.isFinite(new Date(point.date).getTime())
        )
        .map((point) => ({
          ...point,
          chartDate: formatDate(point.date, range),
        })),
    [data, range]
  );

  const firstPrice = points[0]?.price;
  const latestPrice = points[points.length - 1]?.price;

  const change =
    firstPrice !== undefined && latestPrice !== undefined
      ? latestPrice - firstPrice
      : null;

  const changePercent =
    firstPrice && change !== null ? (change / firstPrice) * 100 : null;

  const positive = change !== null && change >= 0;
  const currency = data?.currency || "USD";
  const lineColor = positive ? "#16a34a" : "#ef4444";

  return (
    <section className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Price history
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {ticker}
            </span>
          </div>

          {loading && !data ? (
            <div className="mt-3 h-9 w-36 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          ) : latestPrice !== undefined ? (
            <div className="mt-2 flex flex-wrap items-baseline gap-3">
              <h2 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                {formatPrice(latestPrice, currency)}
              </h2>

              {change !== null && changePercent !== null && (
                <span
                  className={`text-sm font-semibold ${
                    positive ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {positive ? "+" : ""}
                  {formatPrice(change, currency)} (
                  {positive ? "+" : ""}
                  {changePercent.toFixed(2)}%)
                </span>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              Historical market prices
            </p>
          )}

          <p className="mt-1 text-xs text-slate-500">
            Change across the displayed period
          </p>
        </div>

        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
          {RANGES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setRange(item.value)}
              aria-pressed={range === item.value}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                range === item.value
                  ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 sm:p-5">
        {error ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 px-5 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl text-red-500 dark:bg-red-950">
              !
            </div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Chart unavailable
            </p>
            <p className="max-w-sm text-sm text-slate-500">{error}</p>
            <button
              type="button"
              onClick={() => setRange((current) => current)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
            >
              Retry
            </button>
          </div>
        ) : loading && !data ? (
          <div className="flex min-h-[280px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
              <p className="mt-3 text-sm text-slate-500">
                Loading {ticker} price history…
              </p>
            </div>
          </div>
        ) : (
          <div className="relative">
            {loading && (
              <p className="absolute right-2 top-0 z-10 text-xs text-slate-400">
                Updating…
              </p>
            )}

            <div className="h-[280px] w-full sm:h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={points}
                  margin={{ top: 18, right: 8, left: 8, bottom: 4 }}
                >
                  <defs>
                    <linearGradient
                      id="stockyChartFade"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={lineColor}
                        stopOpacity={0.18}
                      />
                      <stop
                        offset="100%"
                        stopColor={lineColor}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 5"
                    vertical={false}
                    stroke="#94a3b8"
                    strokeOpacity={0.2}
                  />

                  <XAxis
                    dataKey="chartDate"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={35}
                    tickMargin={12}
                  />

                  <YAxis
                    domain={["auto", "auto"]}
                    orientation="right"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value: number) =>
                      value.toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                      })
                    }
                    width={58}
                  />

                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                      color: "#f8fafc",
                      padding: "12px",
                    }}
                    labelStyle={{
                      color: "#cbd5e1",
                      fontSize: 12,
                      marginBottom: 6,
                    }}
                    formatter={(value) => [
                      formatPrice(Number(value), currency),
                      "Price",
                    ]}
                    labelFormatter={(label) => String(label)}
                  />

                  <Line
                    type="monotone"
                    dataKey="price"
                    name="Price"
                    stroke={lineColor}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: lineColor,
                      stroke: "#ffffff",
                      strokeWidth: 2,
                    }}
                    isAnimationActive={!loading}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800">
              <span>
                {points.length} historical data points
              </span>
              <span>
                Source: {data?.source || "Yahoo Finance"}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/50">
        <p className="text-xs leading-5 text-slate-500">
          Historical market data may be delayed or revised. Price movement
          reflects the first and last available observations in the selected
          period; it is not a trading signal or a prediction.
        </p>
      </div>
    </section>
  );
}