import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TELEGRAM_API = "https://api.telegram.org";
const STOCKL_URL = "https://stockl-research.vercel.app";

type TelegramMessage = {
  message_id: number;
  text?: string;
  from?: {
    first_name?: string;
    username?: string;
  };
  chat: {
    id: number;
  };
};

type TelegramUpdate = {
  message?: TelegramMessage;
};

async function sendTelegramMessage(
  chatId: number,
  text: string
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("Telegram bot token is not configured");
  }

  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > 0) {
    if (remaining.length <= 3500) {
      chunks.push(remaining);
      break;
    }

    let splitAt = remaining.lastIndexOf("\n", 3500);

    if (splitAt < 1500) {
      splitAt = 3500;
    }

    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }

  if (chunks.length === 0) {
    chunks.push("StockL couldn't generate a response. Please try again.");
  }

  for (const chunk of chunks) {
    const response = await fetch(
      `${TELEGRAM_API}/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunk,
          link_preview_options: {
            is_disabled: true,
          },
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      console.error(
        "[StockL Telegram] Message delivery failed:",
        response.status
      );

      throw new Error("Telegram message delivery failed");
    }
  }
}

/**
 * Converts common Markdown formatting into clean Telegram text.
 * This prevents raw symbols such as ### and ** from appearing.
 */
function cleanReport(text: string): string {
  return text
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*([\s\S]*?)\*\*/g, "$1")
.replace(/__([\s\S]*?)__/g, "$1")
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatResearchReport(report: string): string {
  const cleaned = cleanReport(report);

  return [
    "📊 STOCKL  |  AI RESEARCH DESK",
    "━━━━━━━━━━━━━━━━━━",
    "",
    cleaned,
    "",
    "━━━━━━━━━━━━━━━━━━",
    "🤖 StockL AI Research",
    "⚠️ Research assistance only. Not a trade recommendation.",
  ].join("\n");
}

async function answerResearchQuestion(
  requestUrl: string,
  question: string
): Promise<string> {
  const url = new URL("/api/analyze", requestUrl);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ question }),
    cache: "no-store",
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    throw new Error("StockL research endpoint failed");
  }

  const responseText = await response.text();
  const lines = responseText.split(/\r?\n/);
  const chunks: string[] = [];
  let finalStatus = "";

  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;

    try {
      const event = JSON.parse(line.slice(6));

      if (event.event === "chunk" && typeof event.text === "string") {
        chunks.push(event.text);
      }

      if (event.event === "done" && typeof event.status === "string") {
        finalStatus = event.status;
      }

      if (event.event === "error" && typeof event.message === "string") {
        chunks.push(`\n\nNotice: ${event.message}`);
      }
    } catch {
      // Ignore non-JSON or incomplete streaming events.
    }
  }

  const report = chunks.join("").trim();

  if (!report) {
    throw new Error(
      finalStatus
        ? `StockL returned no report (${finalStatus})`
        : "StockL returned an empty report"
    );
  }

  return report;
}

export async function GET() {
  return NextResponse.json({
    service: "StockL Telegram webhook",
    ready: Boolean(
      process.env.TELEGRAM_BOT_TOKEN &&
      process.env.TELEGRAM_WEBHOOK_SECRET
    ),
  });
}

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "Webhook is not configured" },
      { status: 503 }
    );
  }

  const suppliedSecret = request.headers.get(
    "x-telegram-bot-api-secret-token"
  );

  if (suppliedSecret !== secret) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let update: TelegramUpdate;

  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = update.message;
  const chatId = message?.chat?.id;
  const text = message?.text?.trim();

  if (chatId === undefined || !text) {
    return NextResponse.json({ ok: true });
  }

  const firstName = message?.from?.first_name?.trim() || "Trader";
  const command = text.split(/\s+/)[0].split("@")[0].toLowerCase();

  try {
    if (command === "/start") {
      await sendTelegramMessage(
        chatId,
        [
          `👋 Welcome to StockL, ${firstName}!`,
          "",
          "📈 Your Personal AI Stock Research DESK",
          "",
          "Explore market movements, investigate catalysts, and compare bullish and bearish scenarios with AI-assisted research.",
          "",
          "⚡ QUICK COMMANDS",
          "",
          "🔍 /analyze NVDA",
          "Research NVIDIA",
          "",
          "📊 /market",
          "Explore market research",
          "",
          "🌐 /website",
          "Open the StockL dashboard",
          "",
          "❓ /help",
          "View available commands",
          "",
          "💡 You can also send a stock research question directly.",
          "",
          "━━━━━━━━━━━━━━━━━━",
          "🤖 StockL AI Research Desk",
          "Research assistance, not trade execution.",
        ].join("\n")
      );

      return NextResponse.json({ ok: true });
    }

    if (command === "/help") {
      await sendTelegramMessage(
        chatId,
        [
          "📚 STOCKL — COMMAND CENTER",
          "",
          "🔍 /analyze NVDA",
          "Research NVIDIA",
          "",
          "🔍 /analyze AAPL",
          "Research Apple",
          "",
          "🔍 /analyze TSLA",
          "Research Tesla",
          "",
          "📊 /market",
          "Get instructions for market research",
          "",
          "🌐 /website",
          "Open the StockL dashboard",
          "",
          "You can also send a question such as:",
          "What are the bullish and bearish factors for NVDA?",
          "",
          "⚠️ StockL provides research assistance and does not execute trades.",
        ].join("\n")
      );

      return NextResponse.json({ ok: true });
    }

    if (command === "/website") {
      await sendTelegramMessage(
        chatId,
        [
          "🌐 STOCKL AI RESEARCH DESK",
          "",
          "Explore StockL on the web:",
          STOCKL_URL,
        ].join("\n")
      );

      return NextResponse.json({ ok: true });
    }

    if (command === "/market") {
      await sendTelegramMessage(
        chatId,
        [
          "📊 StockL Market Research",
          "",
          "Choose a stock to investigate:",
          "",
          "• /analyze NVDA — NVIDIA",
          "• /analyze AAPL — Apple",
          "• /analyze TSLA — Tesla",
          "• /analyze MSFT — Microsoft",
          "• /analyze GOOGL — Alphabet",
          "",
          "You can also ask a specific market question.",
          "",
          "⚠️ Quotes may be delayed or unavailable.",
        ].join("\n")
      );

      return NextResponse.json({ ok: true });
    }

    let question = text;

    if (command === "/analyze") {
      question = text.replace(/^\/analyze(?:@\w+)?\s*/i, "").trim();

      if (!question) {
        await sendTelegramMessage(
          chatId,
          "🔎 Which stock would you like to research?\n\nExample: /analyze NVDA"
        );

        return NextResponse.json({ ok: true });
      }
    } else if (text.startsWith("/")) {
      await sendTelegramMessage(
        chatId,
        "I don't recognize that command. Send /help to see the available commands."
      );

      return NextResponse.json({ ok: true });
    }

    if (question.length > 1500) {
      await sendTelegramMessage(
        chatId,
        "Please keep your research question under 1,500 characters."
      );

      return NextResponse.json({ ok: true });
    }

    await sendTelegramMessage(
      chatId,
      [
        "🔎 StockL",
        "",
        `Preparing research for ${firstName}...`,
        "Gathering available market data and reviewing the question.",
        "",
        "⏳ Please wait.",
      ].join("\n")
    );

    const report = await answerResearchQuestion(
      request.url,
      question
    );

    await sendTelegramMessage(
      chatId,
      formatResearchReport(report)
    );
  } catch (error) {
    console.error("[StockL Telegram] Request failed:", {
      message:
        error instanceof Error
          ? error.message
          : "Unknown error",
    });

    try {
      await sendTelegramMessage(
        chatId,
        [
          "⚠️ STOCKL RESEARCH TEMPORARILY UNAVAILABLE",
          "",
          "I couldn't complete your request right now.",
          "Please try again shortly.",
          "",
          "If the problem continues, open the StockL website:",
          STOCKL_URL,
        ].join("\n")
      );
    } catch {
      // The Telegram API may also be unavailable.
    }
  }

  return NextResponse.json({ ok: true });
}
