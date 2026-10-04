
const stocks = [
  { symbol: "AAPL", name: "Apple Inc.", price: "$227.16", change: "+1.24%" },
  { symbol: "NVDA", name: "NVIDIA Corp.", price: "$186.32", change: "+1.87%" },
  { symbol: "TSLA", name: "Tesla Inc.", price: "$348.42", change: "+2.17%" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F5F7FB] text-[#142B52]">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">

        {/* Compact header */}
        <header className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Stocky <span className="text-[#3B82F6]">AI</span>
            </h1>
            <p className="mt-0.5 text-xs text-[#64748B]">
              Your 24/7 AI market research agent
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-[#BBE7CA] bg-[#E8F8EE] px-3 py-1.5 text-xs font-medium text-[#16803D]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
            System ready
          </div>
        </header>

        {/* Smaller hero */}
        <section className="py-7 md:py-9">
          <div className="relative overflow-hidden rounded-2xl bg-[#142B52] p-6 shadow-sm md:p-8">
            <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-5 -top-5 h-32 w-32 rounded-full border border-white/10" />

            <div className="relative z-10">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-2.5 py-1.5 text-[10px] font-semibold tracking-wide text-[#BFDBFE]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#60A5FA]" />
                AI × TOKENIZED EQUITIES
              </div>

              <h2 className="max-w-2xl text-3xl font-bold leading-tight text-white md:text-4xl">
                Markets never sleep.
                <span className="mt-1 block text-[#CBD5E1]">
                  Neither does your research.
                </span>
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-[#DCE6F5]">
                Research tokenized U.S. equities with AI-powered market
                insights, momentum analysis, and risk research.
              </p>

              <div className="mt-5 flex flex-wrap gap-2.5">
                <a
                  href="#ask-stocky"
                  className="rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2563EB]"
                >
                  Start researching →
                </a>

                <a
                  href="#watchlist"
                  className="rounded-lg border border-white/25 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  View watchlist
                </a>
              </div>

              <div className="mt-6 flex gap-10 border-t border-white/15 pt-4">
                <div>
                  <p className="text-xs text-[#AFC1DA]">Availability</p>
                  <p className="mt-1 text-sm font-bold text-white">24 / 7</p>
                </div>
                <div>
                  <p className="text-xs text-[#AFC1DA]">Workspace</p>
                  <p className="mt-1 text-sm font-bold text-white">Initialized</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Compact AI input */}
        <section
          id="ask-stocky"
          className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm md:p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold">Ask Stocky</h3>
              <p className="mt-0.5 text-xs text-[#64748B]">
                Your AI research workspace
              </p>
            </div>

            <span className="rounded-md bg-[#EFF6FF] px-2.5 py-1.5 text-[10px] font-bold text-[#2563EB]">
              AI RESEARCH
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              placeholder="e.g. Analyze AAPL and explain its risks..."
              className="min-w-0 flex-1 rounded-lg border border-[#DCE3ED] bg-[#F8FAFC] px-3.5 py-3 text-sm text-[#142B52] outline-none placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/15"
            />

            <button
              type="button"
              className="rounded-lg bg-[#3B82F6] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2563EB]"
            >
              Analyze →
            </button>
          </div>

          <p className="mt-2 text-[11px] text-[#64748B]">
            AI analysis will be connected in the next development step.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {[
              "Market trends",
              "Stock risk",
              "Compare equities",
            ].map((prompt) => (
              <span
                key={prompt}
                className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-[11px] text-[#475569]"
              >
                {prompt}
              </span>
            ))}
          </div>
        </section>

        {/* Smaller market cards */}
        <section id="watchlist" className="mt-7">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">Market watchlist</h3>
              <p className="mt-0.5 text-xs text-[#64748B]">
                Your selected equities at a glance
              </p>
            </div>

            <span className="rounded-full bg-[#E8EDF5] px-2.5 py-1.5 text-[10px] font-bold text-[#425777]">
              DEMO DATA
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stocks.map((stock) => (
              <div
                key={stock.symbol}
                className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-bold">{stock.symbol}</p>
                    <p className="mt-0.5 text-xs text-[#64748B]">
                      {stock.name}
                    </p>
                  </div>

                  <span className="rounded-md bg-[#EFF6FF] px-2 py-1 text-[10px] font-semibold text-[#2563EB]">
                    EQUITY
                  </span>
                </div>

                <div className="mt-5 flex items-end justify-between gap-2">
                  <p className="text-xl font-bold">{stock.price}</p>
                  <p className="rounded-md bg-[#E8F8EE] px-2 py-1 text-xs font-semibold text-[#16803D]">
                    {stock.change}
                  </p>
                </div>

                <div className="mt-4 h-1 overflow-hidden rounded-full bg-[#E8EDF5]">
                  <div className="h-full w-2/3 rounded-full bg-[#3B82F6]" />
                </div>
              </div>
            ))}
          </div>

          <p className="mt-2 text-[11px] text-[#64748B]">
            Prices and percentage changes are illustrative, not live market data.
          </p>
        </section>

        {/* Compact activity section */}
        <section className="mt-7 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm md:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-bold">Agent activity</h3>
            <span className="text-[10px] font-semibold text-[#64748B]">
              WORKSPACE
            </span>
          </div>

          <div className="mt-4 flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-xs font-bold text-[#2563EB]">
              AI
            </div>

            <div>
              <p className="text-sm font-semibold">
                Stocky workspace initialized
              </p>
              <p className="mt-1 text-xs leading-5 text-[#64748B]">
                Next, we will connect an AI model, real market data, and
                research tools for market and risk analysis.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-[#E2E8F0] py-4 text-xs text-[#64748B]">
          <p>
            <span className="font-bold text-[#142B52]">Stocky AI</span>
            {" "}· Smarter market research
          </p>
          <p>Research only · Demo prices are not live</p>
        </footer>
      </div>
    </main>
  );
}