import type { AiConfig } from "./config";

/**
 * PROVIDER INTERFACE + one OpenAI-compatible implementation.
 *
 * Any service exposing `/chat/completions` with the OpenAI message shape
 * works (OpenAI, Azure-compatible gateways, local vLLM/Ollama proxies).
 * Swapping providers means adding a class here — nothing else changes.
 */

export interface ChatRequest {
  system: string;
  user: string;
  maxTokens: number;
}

export interface ChatProvider {
  readonly id: string;
  readonly model: string;
  complete(request: ChatRequest): Promise<string>;
}

export class AiProviderError extends Error {
  readonly code: "AI_TIMEOUT" | "AI_PROVIDER_ERROR";
  constructor(code: "AI_TIMEOUT" | "AI_PROVIDER_ERROR", message: string) {
    super(message);
    this.name = "AiProviderError";
    this.code = code;
  }
}

export class OpenAiCompatibleProvider implements ChatProvider {
  readonly id = "openai-compatible";
  readonly model: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: AiConfig & { apiKey: string; baseUrl: string; model: string }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  async complete(request: ChatRequest): Promise<string> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          max_tokens: request.maxTokens,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: request.system },
            { role: "user", content: request.user },
          ],
        }),
        signal: AbortSignal.timeout(25_000),
        cache: "no-store",
      });
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        throw new AiProviderError("AI_TIMEOUT", "The AI provider did not respond in time.");
      }
      throw new AiProviderError("AI_PROVIDER_ERROR", "The AI provider is unreachable.");
    }

    if (!response.ok) {
      // Never log or return the provider's body: it can echo the request.
      throw new AiProviderError("AI_PROVIDER_ERROR", `AI provider returned HTTP ${response.status}.`);
    }

    let payload: { choices?: { message?: { content?: string } }[] };
    try {
      payload = (await response.json()) as typeof payload;
    } catch {
      throw new AiProviderError("AI_PROVIDER_ERROR", "AI provider returned a non-JSON response.");
    }

    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim().length === 0) {
      throw new AiProviderError("AI_PROVIDER_ERROR", "AI provider returned an empty completion.");
    }
    return content;
  }
}

export function providerFromConfig(config: AiConfig): ChatProvider | null {
  if (!config.available || !config.apiKey || !config.baseUrl || !config.model) return null;
  return new OpenAiCompatibleProvider({
    ...config,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    model: config.model,
  });
}
