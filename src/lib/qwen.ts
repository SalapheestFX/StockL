import "server-only";

export type QwenResult = {
  text: string;
  model: string;
};

const SYSTEM_INSTRUCTION = [
  "You are StockL, a concise financial research analyst.",
  "Use only supplied evidence. Never invent prices, news, indicators, or citations.",
  "Separate facts from interpretations and unknowns.",
  "Explain bull and bear cases, risks, and invalidation conditions.",
  "Never guarantee returns or provide personalized financial advice.",
  "The human trader makes all final decisions.",
  "Use concise Markdown with these sections:",
  "Executive Summary, Market Snapshot, Bull Case, Bear Case, Key Risks, What to Monitor, Conclusion.",
  "Be brief, clear, and evidence-based.",
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
  prompt: string,
  onChunk?: (chunk: string) => void
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

  const startedAt = Date.now();
  const limitedPrompt = prompt.slice(0, 4500);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(
      `${baseUrl.replace(/\/+$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          Accept: "text/event-stream",
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
          max_tokens: 500,
          stream: true,
        }),
        cache: "no-store",
        signal: controller.signal,
      }
    );

    console.info("[StockL Qwen] Streaming response:", {
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

    if (!response.body) {
      throw new Error("QWEN_EMPTY_RESPONSE");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";
    let text = "";
    let providerModel = model;

    const processLine = (rawLine: string) => {
      const line = rawLine.trim();

      if (!line.startsWith("data:")) return;

      const payload = line.slice(5).trim();

      if (!payload || payload === "[DONE]") return;

      let chunk: any;

      try {
        chunk = JSON.parse(payload);
      } catch {
        return;
      }

      if (typeof chunk?.model === "string") {
        providerModel = chunk.model;
      }

      const content = chunk?.choices?.[0]?.delta?.content;

      let piece = "";

      if (typeof content === "string") {
        piece = content;
      } else if (Array.isArray(content)) {
        piece = content
          .map((part: any) =>
            typeof part?.text === "string" ? part.text : ""
          )
          .join("");
      }

      if (piece) {
        text += piece;

        try {
          onChunk?.(piece);
        } catch (callbackError) {
          console.error(
            "[StockL Qwen] Chunk callback failed:",
            callbackError
          );
        }
      }
    };

    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        processLine(line);
      }
    }

    buffer += decoder.decode();

    if (buffer.trim()) {
      for (const line of buffer.split("\n")) {
        processLine(line);
      }
    }

    const cleanedText = text.trim();

    if (!cleanedText) {
      throw new Error("QWEN_EMPTY_RESPONSE");
    }

    console.info("[StockL Qwen] Generation complete:", {
      elapsedMs: Date.now() - startedAt,
      answerCharacters: cleanedText.length,
    });

    return {
      text: cleanedText,
      model: providerModel,
    };
  } catch (error) {
    const err = error as Error;

    console.error("[StockL Qwen] Streaming request failed:", {
      elapsedMs: Date.now() - startedAt,
      errorName: err.name,
      errorMessage: err.message,
    });

    if (
      err.name === "AbortError" ||
      err.name === "TimeoutError"
    ) {
      throw new Error("QWEN_TIMEOUT");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}