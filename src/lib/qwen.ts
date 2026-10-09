import "server-only";

export type QwenResult = {
  text: string;
  model: string;
};

const SYSTEM_INSTRUCTION = [
  "You are StockL, a concise financial research analyst.",
  "Use only the supplied evidence. Never invent prices, news, indicators, or citations.",
  "Separate facts from interpretations and unknowns.",
  "Explain both bull and bear cases, including risks and invalidation conditions.",
  "Do not guarantee returns or provide personalized financial advice.",
  "The human trader makes all final decisions.",
  "Use concise Markdown with these sections:",
  "Executive Summary, Market Snapshot, Bull Case, Bear Case, Key Risks, What to Monitor, Conclusion.",
  "Keep the entire report brief and evidence-based.",
].join("\n");

export function getQwenStatus() {
  const configured = Boolean(
    process.env.QWEN_API_KEY?.trim() &&
      process.env.QWEN_MODEL?.trim() &&
      process.env.QWEN_BASE_URL?.trim()
  );

  return {
    provider: "Qwen",
    configured,
    connected: false,
    model: process.env.QWEN_MODEL?.trim() || null,
    status: configured ? "configured_not_tested" : "not_configured",
    message: configured
      ? "Qwen credentials are configured; a successful request is still required."
      : "Qwen API credentials or configuration are missing.",
  };
}

export async function generateQwenText(
  prompt: string
): Promise<QwenResult> {
  const apiKey = process.env.QWEN_API_KEY?.trim();
  const model = process.env.QWEN_MODEL?.trim();
  const baseUrl = process.env.QWEN_BASE_URL?.trim();

  if (!apiKey || !model || !baseUrl) {
    throw new Error("QWEN_NOT_CONFIGURED");
  }

  let endpoint: URL;

  try {
    endpoint = new URL(baseUrl);
  } catch {
    throw new Error("QWEN_INVALID_BASE_URL");
  }

  if (endpoint.protocol !== "https:" && endpoint.protocol !== "http:") {
    throw new Error("QWEN_INVALID_BASE_URL");
  }

  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const startedAt = Date.now();

  // Keep the prompt compact to reduce processing time.
  const limitedPrompt = prompt.slice(0, 4500);

  let response: Response;

  try {
    response = await fetch(url, {
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
            content: SYSTEM_INSTRUCTION,
          },
          {
            role: "user",
            content: limitedPrompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 250,
        stream: false,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });
  } catch (error) {
    console.error("[StockL Qwen] Request failed:", {
      elapsedMs: Date.now() - startedAt,
      errorName: error instanceof Error ? error.name : "Unknown",
      errorMessage: error instanceof Error ? error.message : "Unknown",
    });

    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      throw new Error("QWEN_TIMEOUT");
    }

    throw new Error("QWEN_CONNECTION_FAILED");
  }

  console.info("[StockL Qwen] Provider response:", {
    elapsedMs: Date.now() - startedAt,
    status: response.status,
    promptCharacters: limitedPrompt.length,
  });

  if (!response.ok) {
    const providerError = await response.text().catch(() => "");

    console.error("[StockL Qwen] HTTP error:", {
      status: response.status,
      body: providerError.slice(0, 500),
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error("QWEN_AUTH_FAILED");
    }

    if (response.status === 429) {
      throw new Error("QWEN_RATE_LIMITED");
    }

    throw new Error(`QWEN_REQUEST_FAILED_${response.status}`);
  }

  let data: any;

  try {
    data = await response.json();
  } catch {
    throw new Error("QWEN_INVALID_RESPONSE");
  }

  const content = data?.choices?.[0]?.message?.content;

  const text =
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

  if (!text) {
    console.error("[StockL Qwen] Empty response:", {
      model: data?.model ?? null,
    });

    throw new Error("QWEN_EMPTY_RESPONSE");
  }

  return {
    text,
    model: typeof data?.model === "string" ? data.model : model,
  };
}