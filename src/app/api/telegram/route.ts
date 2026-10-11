import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TELEGRAM_API = "https://api.telegram.org";

type TelegramMessage = {
  message_id: number;
  text?: string;
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
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }

  // Telegram limits a text message to 4096 characters.
  // Leave room below that limit for safe delivery.
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
      // Ignore incomplete or non-JSON SSE lines.
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
  // A simple health check; this does not expose the bot token.
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

  const command = text.split(/\s+/)[0].split("@")[0].toLowerCase();

  try {
    if (command === "/start") {
      await sendTelegramMessage(
        chatId,
        [
          "Welcome to StockL AI Research! 📊",
          "",
          "Ask research questions about supported stocks.",
          "",
          "Commands:",
          "/analyze NVDA — Research NVIDIA",
          "/analyze AAPL — Research Apple",
          "/market — Learn how to request market research",
          "/help — Show help",
          "/website — Open StockL",
          "",
          "StockL supports research, not trade execution or guaranteed returns.",
        ].join("\n")
      );

      return NextResponse.json({ ok: true });
    }

    if (command === "/help") {
      await sendTelegramMessage(
        chatId,
        [
          "StockL AI Research Help",
          "",
          "Examples:",
          "/analyze NVDA",
          "/analyze TSLA",
          "/analyze AAPL",
          "",
          "You can also ask a research question:",
          "Analyze NVDA and explain the bullish factors, bearish factors, and key risks.",
        ].join("\n")
      );

      return NextResponse.json({ ok: true });
    }

    if (command === "/website") {
      await sendTelegramMessage(
        chatId,
        "Open StockL here:\nhttps://stockl-research.vercel.app"
      );

      return NextResponse.json({ ok: true });
    }

    if (command === "/market") {
      await sendTelegramMessage(
        chatId,
        [
          "StockL can retrieve market data for supported stocks.",
          "",
          "Try /analyze NVDA or /analyze AAPL.",
          "",
          "Quotes may be delayed or unavailable.",
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
          "Please provide a stock ticker or research question.\nExample: /analyze NVDA"
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
      "📊 StockL is gathering available market data and preparing your research report. Please wait..."
    );

    const report = await answerResearchQuestion(
      request.url,
      question
    );

    await sendTelegramMessage(chatId, report);
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
        "StockL couldn't complete that request right now. Please try again shortly."
      );
    } catch {
      // Delivery may also be unavailable.
    }
  }

  return NextResponse.json({ ok: true });
}
