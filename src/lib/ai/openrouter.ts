/**
 * OpenRouter AI client — replaces direct Anthropic SDK usage.
 * Uses OpenAI-compatible chat completions endpoint.
 *
 * Model: anthropic/claude-3.5-haiku (cost-efficient for high-volume calls)
 */

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "anthropic/claude-3.5-haiku";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Send a chat completion request to OpenRouter.
 *
 * @param system - System prompt
 * @param userMessage - User message
 * @param maxTokens - Max output tokens (default 500)
 * @param model - Model override (default anthropic/claude-3.5-haiku)
 * @returns The assistant's text response
 */
export async function chatCompletion(
  system: string,
  userMessage: string,
  maxTokens: number = 500,
  model: string = DEFAULT_MODEL
): Promise<{ text: string; inputTokens?: number; outputTokens?: number }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set in environment variables");
  }

  const messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: userMessage },
  ];

  const response = await fetch(OPENROUTER_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://pgl-main.vercel.app",
      "X-Title": "PGL Luxury Buyer Finder",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errorText.slice(0, 300)}`);
  }

  const data = (await response.json()) as OpenRouterResponse;
  const choice = data.choices?.[0];

  if (!choice?.message?.content) {
    throw new Error("Empty response from OpenRouter");
  }

  return {
    text: choice.message.content,
    inputTokens: data.usage?.prompt_tokens,
    outputTokens: data.usage?.completion_tokens,
  };
}
