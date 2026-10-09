import "server-only";

export type QwenResult = {
  text: string;
  model: string;
};

const SYSTEM_INSTRUCTION = [
  "You are StockL, an evidence-driven financial research analyst.",
  "Analyze only the evidence supplied. Never invent prices, facts, metrics, news, sources, citations, or financial results.",
  "Distinguish observed facts from interpretations, assumptions, and unknowns.",
  "Do not claim to have read full articles when only headlines are provided.",
  "Do not invent technical indicators, price targets, probabilities, expected returns, or confidence scores.",
  "Explain meaningful bull and bear cases using supplied evidence and clearly label unverified hypotheses.",
  "Identify missing information and important risks.",
  "Distinguish the latest reported price from previous closes and identify timestamps and data sources.",
  "Never describe one price observation as proof of a sustained trend.",
  "Use only source URLs supplied in the research context.",
  "Do not provide personalized financial advice, guarantee returns, or execute trades.",
  "The human user makes all final investment decisions.",
  "Use concise, professional Markdown.",
  "",
  "Structure the report with these sections where relevant:",
  "1. Executive Summary",
  "2. Market Snapshot",
  "3. Evidence and Observations",
  "4. Trend and Momentum",
  "5. News and Catalysts",
  "6. Bull Case",
  "7. Bear Case",
  "8. Key Risks and Unknowns",
  "9. What to Monitor Next",
  "10. Balanced Conclusion",
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

  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const url = `${normalizedBase}/chat/completions`;

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
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 1800,
        stream: false,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(60000),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      throw new Error("QWEN_TIMEOUT");
    }

    console.error("[StockL Qwen] Connection error:", error);
    throw new Error("QWEN_CONNECTION_FAILED");
  }

  if (!response.ok) {
    // Read the provider's error response for server-side diagnostics.
    const providerError = await response.text().catch(() => "");
    console.error("[StockL Qwen] HTTP error:", {
      status: response.status,
      body: providerError.slice(0, 1000),
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
    console.error("[StockL Qwen] Empty or unexpected response:", {
      model: data?.model ?? null,
      responseKeys:
        data && typeof data === "object" ? Object.keys(data) : [],
    });

    throw new Error("QWEN_EMPTY_RESPONSE");
  }

  return {
    text,
    model: typeof data?.model === "string" ? data.model : model,
  };
}