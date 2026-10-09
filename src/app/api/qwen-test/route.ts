import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.QWEN_API_KEY?.trim();
  const baseUrl = process.env.QWEN_BASE_URL?.trim();
  const model = process.env.QWEN_MODEL?.trim();

  if (!apiKey || !baseUrl || !model) {
    return NextResponse.json(
      { ok: false, error: "QWEN_NOT_CONFIGURED" },
      { status: 500 }
    );
  }

  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  const prompt = [
    "STOCKL AI RESEARCH CONTEXT",
    "User question: Analyze AAPL.",
    "Asset: AAPL — Apple Inc.",
    "MARKET DATA",
    "Latest reported price: $340.42",
    "Change versus previous close: +3.06%",
    "Previous close: $330.32",
    "Source: Yahoo Finance chart endpoint. Quote may be delayed.",
    "RETRIEVED NEWS",
    "Apple is the toll collector on the consumer AI highway, Dan Ives says.",
    "RESEARCH INSTRUCTIONS",
    "Analyze the supplied evidence, not assumptions presented as facts.",
    "Provide a concise executive summary, market snapshot, bull case, bear case, risks, what to monitor next, and a balanced conclusion.",
    "Never invent indicators, prices, events, or citations.",
    "Do not provide personalized financial advice or guarantee returns.",
    "The human trader makes the final decision.",
  ].join("\n");

  try {
    const response = await fetch(
      `${baseUrl.replace(/\/+$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are StockL, an evidence-driven financial research analyst. Be concise and never invent facts.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.2,
          max_tokens: 400,
          stream: false,
        }),
        cache: "no-store",
        signal: controller.signal,
      }
    );

    const elapsedMs = Date.now() - started;

    if (!response.ok) {
      const providerError = await response.text().catch(() => "");

      console.error("[Qwen test] Provider rejected request:", {
        status: response.status,
        elapsedMs,
        body: providerError.slice(0, 500),
      });

      return NextResponse.json({
        ok: false,
        providerStatus: response.status,
        elapsedMs,
        error: "PROVIDER_REJECTED_REQUEST",
      });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    const answer =
      typeof content === "string"
        ? content.trim()
        : Array.isArray(content)
          ? content
              .map((part: any) =>
                typeof part?.text === "string" ? part.text : ""
              )
              .join("\n")
              .trim()
          : "";

    console.info("[Qwen test] Research-style request completed:", {
      elapsedMs,
      promptCharacters: prompt.length,
      receivedAnswer: Boolean(answer),
      answerCharacters: answer.length,
    });

    return NextResponse.json({
      ok: Boolean(answer),
      providerStatus: response.status,
      elapsedMs,
      model: data?.model ?? model,
      receivedAnswer: Boolean(answer),
      answerCharacters: answer.length,
      answerPreview: answer.slice(0, 500),
    });
  } catch (error) {
    const elapsedMs = Date.now() - started;

    console.error("[Qwen test] Request failed:", {
      elapsedMs,
      errorName: error instanceof Error ? error.name : "Unknown",
      errorMessage: error instanceof Error ? error.message : "Unknown",
    });

    return NextResponse.json({
      ok: false,
      elapsedMs,
      error:
        error instanceof Error &&
        (error.name === "AbortError" || error.name === "TimeoutError")
          ? "QWEN_TIMEOUT"
          : "QWEN_CONNECTION_FAILED",
    });
  } finally {
    clearTimeout(timer);
  }
}
