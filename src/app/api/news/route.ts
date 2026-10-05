
export const runtime = "nodejs";

export const dynamic = "force-dynamic";

const WATCHLIST = ["AAPL", "NVDA", "TSLA"];

type NewsItem = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt: string | null;
  relatedTickers: string[];
};

async function getCompanyNews(ticker: string): Promise<NewsItem[]> {
  const url = new URL(
    "https://query1.finance.yahoo.com/v1/finance/search"
  );

  url.searchParams.set("q", ticker);
  url.searchParams.set("newsCount", "10");
  url.searchParams.set("quotesCount", "0");
  url.searchParams.set("enableFuzzyQuery", "false");

  const response = await fetch(url.toString(), {
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
    headers: {
      "User-Agent": "Mozilla/5.0 StockyAI/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`News request failed for ${ticker}`);
  }

  const data = await response.json();
  const items = Array.isArray(data.news) ? data.news : [];

  return items
    .map((item: any): NewsItem | null => {
      const title =
        typeof item.title === "string" ? item.title.trim() : "";

      const rawUrl =
        typeof item.link === "string" ? item.link : "";

      let articleUrl = "";

      try {
        articleUrl = new URL(
          rawUrl,
          "https://finance.yahoo.com"
        ).toString();
      } catch {
        return null;
      }

      if (
        !title ||
        !["https:", "http:"].includes(new URL(articleUrl).protocol)
      ) {
        return null;
      }

      const publishedAt =
        typeof item.providerPublishTime === "number"
          ? new Date(
              item.providerPublishTime * 1000
            ).toISOString()
          : null;

      const relatedTickers = Array.isArray(item.relatedTickers)
        ? item.relatedTickers.filter(
            (value: unknown): value is string =>
              typeof value === "string"
          )
        : [ticker];

      return {
        id:
          typeof item.uuid === "string"
            ? item.uuid
            : `${ticker}-${articleUrl}`,
        title,
        publisher:
          typeof item.publisher === "string"
            ? item.publisher
            : "Publisher not listed",
        url: articleUrl,
        publishedAt,
        relatedTickers: Array.from(
          new Set([...relatedTickers, ticker])
        ),
      };
    })
    .filter((item: NewsItem | null): item is NewsItem => item !== null);
}

export async function GET() {
  const results = await Promise.allSettled(
    WATCHLIST.map((ticker) => getCompanyNews(ticker))
  );

  const news: NewsItem[] = [];
  const failedTickers: string[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      news.push(...result.value);
    } else {
      failedTickers.push(WATCHLIST[index]);
    }
  });

  const uniqueNews = Array.from(
    new Map(
      news.map((item) => [item.url, item])
    ).values()
  ).sort((a, b) => {
    const dateA = a.publishedAt
      ? new Date(a.publishedAt).getTime()
      : 0;

    const dateB = b.publishedAt
      ? new Date(b.publishedAt).getTime()
      : 0;

    return dateB - dateA;
  });

  return Response.json(
    {
      source: "Yahoo Finance search/news endpoint",
      fetchedAt: new Date().toISOString(),
      count: uniqueNews.length,
      failedTickers,
      news: uniqueNews,
    },
    {
      status:
        uniqueNews.length === 0 && failedTickers.length > 0
          ? 502
          : 200,
    }
  );
}