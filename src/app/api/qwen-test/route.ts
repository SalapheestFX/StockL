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
  const timer = setTimeout(() => controller.abort(), 15000);

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
            { role: "user", content: "Reply with only OK" },
          ],
          max_tokens: 10,
          stream: false,
        }),
        cache: "no-store",
        signal: controller.signal,
      }
    );

    const elapsedMs = Date.now() - started;

    if (!response.ok) {
      console.error("[Qwen test] Provider HTTP status:", response.status);

      return NextResponse.json({
        ok: false,
        providerStatus: response.status,
        elapsedMs,
        error: "PROVIDER_REJECTED_REQUEST",
      });
    }

    const data = await response.json();
    const answer = data?.choices?.[0]?.message?.content;

    return NextResponse.json({
      ok: true,
      providerStatus: response.status,
      elapsedMs,
      model: data?.model ?? model,
      receivedAnswer: Boolean(answer),
    });
  } catch (error) {
    const elapsedMs = Date.now() - started;

    console.error("[Qwen test] Request failed:", error);

    return NextResponse.json({
      ok: false,
      elapsedMs,
      error:
        error instanceof Error && error.name === "AbortError"
          ? "QWEN_TIMEOUT"
          : "QWEN_CONNECTION_FAILED",
    });
  } finally {
    clearTimeout(timer);
  }
}
