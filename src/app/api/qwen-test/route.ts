import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.QWEN_API_KEY;
  const baseUrl = process.env.QWEN_BASE_URL;
  const model = process.env.QWEN_MODEL || "qwen3.6-plus";

  if (!apiKey || !baseUrl) {
    return NextResponse.json(
      { ok: false, error: "QWEN_ENV_MISSING" },
      { status: 500 }
    );
  }

  const startedAt = Date.now();
  let firstTokenMs: number | null = null;
  let answer = "";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(
      `${baseUrl.replace(/\/+$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are StockL, a concise financial research assistant. Do not invent facts.",
            },
            {
              role: "user",
              content:
                "Write a short research note about Apple (AAPL). Explain that an analyst should consider price movement, company news, risks, and uncertainty. Do not invent current prices or news.",
            },
          ],
          temperature: 0.2,
          max_tokens: 250,
          stream: true,
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const errorText = (await response.text()).slice(0, 800);

      return NextResponse.json({
        ok: false,
        providerStatus: response.status,
        elapsedMs: Date.now() - startedAt,
        error: errorText,
      });
    }

    if (!response.body) {
      return NextResponse.json({
        ok: false,
        elapsedMs: Date.now() - startedAt,
        error: "NO_RESPONSE_BODY",
      });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const rawLine of lines) {
        const line = rawLine.trim();

        if (!line.startsWith("data:")) continue;

        const data = line.slice(5).trim();

        if (!data || data === "[DONE]") continue;

        try {
          const chunk = JSON.parse(data);
          const content = chunk.choices?.[0]?.delta?.content;

          if (typeof content === "string" && content.length > 0) {
            if (firstTokenMs === null) {
              firstTokenMs = Date.now() - startedAt;
            }

            answer += content;
          }
        } catch {
          // Ignore incomplete or non-JSON streaming events.
        }
      }
    }

    return NextResponse.json({
      ok: answer.length > 0,
      providerStatus: response.status,
      elapsedMs: Date.now() - startedAt,
      firstTokenMs,
      model,
      receivedAnswer: answer.length > 0,
      answerCharacters: answer.length,
      answerPreview: answer.slice(0, 500),
    });
  } catch (error) {
    const err = error as Error;

    return NextResponse.json({
      ok: false,
      elapsedMs: Date.now() - startedAt,
      firstTokenMs,
      error:
        err.name === "AbortError"
          ? "QWEN_TIMEOUT"
          : err.message || "QWEN_STREAM_TEST_FAILED",
    });
  } finally {
    clearTimeout(timeout);
  }
}