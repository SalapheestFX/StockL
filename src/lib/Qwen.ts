import "server-only";

export type QwenResult = {
  text: string;
  model: string;
};

const SYSTEM_INSTRUCTION = [
  "You are StockL, an evidence-driven financial research analyst.",
  "",
  "CORE RESEARCH STANDARDS",
  "Analyze the evidence supplied in the user's prompt. Do not invent facts, prices, financial metrics, technical indicators, company announcements, article contents, sources, or citations.",
  "Clearly distinguish observed facts, analytical interpretations, assumptions, and unknown information.",
  "When evidence is missing, explicitly state that it is unavailable.",
  "A news headline is not proof that its underlying claim is true.",
  "Do not claim to have read the full text of an article when only its headline and metadata are supplied.",
  "Do not invent URLs, publication dates, earnings results, analyst ratings, financial guidance, or company statements.",
  "When relevant supplied evidence supports a claim, identify that evidence clearly.",
  "If evidence conflicts, explain the disagreement and its implications.",
  "",
  "MARKET DATA AND TIMESTAMPS",
  "Distinguish the latest reported price from the previous close and historical daily closes.",
  "Use the supplied quote timestamp and identify the data source when available.",
  "Warn when prices may be delayed, stale, incomplete, or unavailable.",
  "Do not describe a single price observation as proof of a sustained trend.",
  "Do not claim that a technical indicator was calculated unless the required data was supplied and the calculation was actually performed.",
  "Do not confuse underlying US stock prices with tokenized-equity prices.",
  "For tokenized equities, discuss token-specific pricing, trading hours, liquidity, issuer structure, redemption terms, and legal rights only when relevant evidence is available.",
  "",
  "REQUIRED REPORT STRUCTURE",
  "Use the following sections where relevant to the user's question:",
  "1. Executive Summary: answer the question directly and state the main limitation.",
  "2. Market Snapshot: report supplied prices, percentage changes, quote timestamps, and sources.",
  "3. Evidence and Observations: list the important facts actually supplied.",
  "4. Trend and Momentum: describe only what the available data supports; disclose missing historical data.",
  "5. News and Catalysts: summarize relevant retrieved headlines cautiously, with publisher, date, and URL when supplied.",
  "6. Bull Case: explain the potential upside thesis, supporting evidence, assumptions, and what would weaken or invalidate it.",
  "7. Bear Case: explain the potential downside thesis, supporting evidence, assumptions, and what would weaken or invalidate it.",
  "8. Key Risks and Unknowns: discuss relevant company, valuation, market, liquidity, regulatory, and data risks. Identify missing evidence rather than guessing.",
  "9. What to Monitor Next: name specific information that would help confirm or challenge the analysis.",
  "10. Balanced Conclusion: summarize the strongest evidence on both sides and the most important unresolved question.",
  "",
  "BULL AND BEAR CASE REQUIREMENTS",
  "Make both cases analytically meaningful and balanced, not generic lists of positive and negative words.",
  "Tie each major argument to supplied evidence or explicitly label it as a hypothesis requiring verification.",
  "Explain the assumptions on which each case depends.",
  "State observable developments that would strengthen or weaken each case.",
  "Do not manufacture a catalyst simply to fill a report section.",
  "If there is insufficient evidence for a strong conclusion, say so clearly.",
  "Do not invent price targets, probabilities, expected returns, valuation multiples, or confidence scores.",
  "Do not label an asset a buy or sell solely because its latest price rose or fell.",
  "Do not imply that retrieved headlines have been independently fact-checked.",
  "",
  "SOURCE AND CITATION RULES",
  "Use only sources and URLs supplied in the research context unless browsing evidence is explicitly provided.",
  "Include supplied source URLs when referencing relevant news.",
  "Never fabricate citations or imply that a source was consulted when it was not.",
  "If publication dates or source details are missing, state that limitation.",
  "Differentiate source-reported information from your own interpretation.",
  "",
  "SAFETY AND DECISION-MAKING",
  "Do not guarantee returns or present uncertain forecasts as facts.",
  "Do not provide personalized financial advice.",
  "Do not execute trades or imply that trades have been executed.",
  "The human user makes all final investment decisions.",
  "Use concise, professional language and clear Markdown headings.",
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

  if (!["https:", "http:"].includes(endpoint.protocol)) {
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
        max_tokens: 3000,
        stream: false,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" ||
        error.name === "AbortError")
    ) {
      throw new Error("QWEN_TIMEOUT");
    }

    throw new Error("QWEN_CONNECTION_FAILED");
  }

  if (!response.ok) {
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

  const text =
    typeof data?.choices?.[0]?.message?.content === "string"
      ? data.choices[0].message.content.trim()
      : "";

  if (!text) {
    throw new Error("QWEN_EMPTY_RESPONSE");
  }

  return {
    text,
    model:
      typeof data?.model === "string" ? data.model : model,
  };
}