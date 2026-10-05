"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type PricePoint = {
  timestamp: number;
  date: string;
  price: number;
};

type StockPriceChartProps = {
  ticker?: string;
};

const STOCKS = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "META", name: "Meta" },
  { symbol: "AMD", name: "AMD" },
  { symbol: "COIN", name: "Coinbase" },
  { symbol: "HOOD", name: "Robinhood" },
  { symbol: "MSTR", name: "Strategy" },
  { symbol: "NFLX", name: "Netflix" },
  { symbol: "PLTR", name: "Palantir" },
];

const RANGES = [
  { value: "1d", label: "1D" },
  { value: "5d", label: "5D" },
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" },
];

export default function StockPriceChart({
  ticker = "AAPL",
}: StockPriceChartProps) {
  const [selectedTicker, setSelectedTicker] = useState(ticker);
  const [range, setRange] = useState("5d");
  const [data, setData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const selectedStock = useMemo(
    () => STOCKS.find((stock) => stock.symbol === selectedTicker),
    [selectedTicker]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/history?ticker=${encodeURIComponent(
            selectedTicker
          )}&range=${encodeURIComponent(range)}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("Unable to load price history");
        }

        const result = await response.json();

        if (!cancelled) {
          setData(Array.isArray(result.points) ? result.points : []);
        }
      } catch (err) {
        if (!cancelled) {
          setData([]);
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load price history"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [selectedTicker, range]);

  const latestPrice = data.length > 0 ? data[data.length - 1].price : null;
  const firstPrice = data.length > 0 ? data[0].price : null;

  const periodChange =
    latestPrice !== null &&
    firstPrice !== null &&
    firstPrice !== 0
      ? ((latestPrice - firstPrice) / firstPrice) * 100
      : null;

  const isPositive = periodChange !== null && periodChange >= 0;

  const formattedData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      displayDate: new Date(point.timestamp * 1000).toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
        }
      ),
    }));
  }, [data]);

  const handleRefresh = () => {
    setRefreshing(true);

    // Changing the range to itself won't trigger useEffect,
    // so we reload the page data directly.
    const loadAgain = async () => {
      try {
        setError("");

        const response = await fetch(
          `/api/history?ticker=${encodeURIComponent(
            selectedTicker
          )}&range=${encodeURIComponent(range)}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("Unable to refresh price history");
        }

        const result = await response.json();
        setData(Array.isArray(result.points) ? result.points : []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to refresh price history"
        );
      } finally {
        setRefreshing(false);
      }
    };

    loadAgain();
  };

  return (
    <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Price History
            </h3>

            <span className="rounded-full border border-slate-200 bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-500">
              Yahoo Finance
            </span>
          </div>

          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight text-slate-950">
              {latestPrice !== null
                ? `$${latestPrice.toFixed(2)}`
                : "--"}
            </span>

            {periodChange !== null && (
              <span
                className={`text-xs font-semibold ${
                  isPositive ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {isPositive ? "+" : ""}
                {periodChange.toFixed(2)}%
              </span>
            )}
          </div>

          <p className="mt-0.5 text-[11px] text-slate-500">
            {selectedStock?.name ?? selectedTicker} · {range.toUpperCase()}
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="self-start rounded-lg border border-slate-200 bg-white/80 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Stock selector */}
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {STOCKS.map((stock) => {
          const active = selectedTicker === stock.symbol;

          return (
            <button
              key={stock.symbol}
              type="button"
              onClick={() => setSelectedTicker(stock.symbol)}
              className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                active
                  ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                  : "border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300 hover:bg-white"
              }`}
            >
              {stock.symbol}
            </button>
          );
        })}
      </div>

      {/* Time range */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl border border-slate-200/80 bg-slate-100/70 p-1">
          {RANGES.map((item) => {
            const active = range === item.value;

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setRange(item.value)}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold transition ${
                  active
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <span className="hidden text-[10px] text-slate-400 sm:block">
          Delayed market data
        </span>
      </div>

      {/* Chart */}
      <div className="h-[230px] w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
              Loading {selectedTicker}...
            </div>
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-xs font-medium text-slate-700">
              Unable to load chart
            </p>

            <p className="mt-1 max-w-xs text-[11px] text-slate-400">
              {error}
            </p>

            <button
              type="button"
              onClick={handleRefresh}
              className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              Try again
            </button>
          </div>
        ) : formattedData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            No price history available for {selectedTicker}.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={formattedData}
              margin={{
                top: 8,
                right: 8,
                left: -18,
                bottom: 0,
              }}
            >
              <XAxis
                dataKey="displayDate"
                axisLine={false}
                tickLine={false}
                tick={{
                  fontSize: 10,
                  fill: "#94a3b8",
                }}
                minTickGap={24}
              />

              <YAxis
                domain={["auto", "auto"]}
                axisLine={false}
                tickLine={false}
                tick={{
                  fontSize: 10,
                  fill: "#94a3b8",
                }}
                tickFormatter={(value) => `$${value}`}
                width={52}
              />

              <Tooltip
                cursor={{
                  stroke: "#cbd5e1",
                  strokeDasharray: "4 4",
                }}
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid rgba(226,232,240,0.9)",
                  background: "rgba(255,255,255,0.95)",
                  boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
                  fontSize: "11px",
                }}
                labelStyle={{
                  color: "#64748b",
                  marginBottom: "3px",
                }}
                formatter={(value) => [
                  `$${Number(value).toFixed(2)}`,
                  selectedTicker,
                ]}
              />

              <Line
                type="monotone"
                dataKey="price"
                stroke={isPositive ? "#059669" : "#e11d48"}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  strokeWidth: 2,
                  fill: "#ffffff",
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-200/70 pt-3">
        <span className="text-[10px] text-slate-400">
          {data.length > 0
            ? `${data.length} data points`
            : "No data"}
        </span>

        <span className="text-[10px] text-slate-400">
          Underlying market data
        </span>
      </div>
    </div>
  );
}