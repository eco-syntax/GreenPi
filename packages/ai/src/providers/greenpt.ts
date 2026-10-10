import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Provider } from "../models.ts";
import type { Model, OpenAICompletionsCompat } from "../types.ts";
import { fetchOpenAICompatibleModels } from "./local.ts";

// OpenAI-compatible API endpoint (https://docs.greenpt.ai). The marketing URL
// https://greenpt.com/api documents the same service. The caller's base URL
// selects the region; nothing in the key or request body does.
// https://docs.greenpt.ai/regions
const GREENPT_BASE_URL = "https://api.greenpt.ai/v1";
const GREENPT_US_BASE_URL = "https://api.us.greenpt.ai/v1";

// Chat-capable models served by the US endpoint; the EU endpoint serves the
// full catalog.
const GREENPT_US_CHAT_MODEL_IDS = new Set(["deepseek-v4.1-flash", "glm-5.3", "glm-5.3-flash", "kimi-k3"]);

// Conservative OpenAI-completions compat; GreenPT reasoning models reason on
// their own, pi sends no reasoning controls.
const GREENPT_COMPAT: OpenAICompletionsCompat = {
	supportsStore: false,
	supportsDeveloperRole: false,
	supportsReasoningEffort: false,
	maxTokensField: "max_tokens",
	supportsStrictMode: false,
};

interface GreenPTModelSpec {
	id: string;
	name: string;
	reasoning: boolean;
	vision: boolean;
	contextWindow: number;
	maxTokens: number;
	/** EUR per million tokens from https://docs.greenpt.ai/model-cards. */
	cost: { input: number; output: number; cacheRead?: number };
}

// Chat-capable models from the GreenPT catalog (embeddings, speech-to-text,
// and reranking models are omitted). Costs are EUR per million tokens; pi
// cost fields are display-only. Cache-read pricing is only documented for
// some models.
const GREENPT_MODELS: GreenPTModelSpec[] = [
	{
		id: "glm-5.2",
		name: "GLM 5.2",
		reasoning: true,
		vision: false,
		contextWindow: 1000000,
		maxTokens: 32768,
		cost: { input: 1.1, output: 4.4, cacheRead: 0.275 },
	},
	{
		id: "glm-5.3",
		name: "GLM 5.3",
		reasoning: true,
		vision: false,
		contextWindow: 1000000,
		maxTokens: 32768,
		cost: { input: 1.1, output: 4.4, cacheRead: 0.275 },
	},
	{
		id: "glm-5.3-flash",
		name: "GLM 5.3 Flash",
		reasoning: true,
		vision: false,
		contextWindow: 1000000,
		maxTokens: 32768,
		cost: { input: 0.11, output: 0.44, cacheRead: 0.022 },
	},
	{
		id: "deepseek-v4-flash-0731",
		name: "DeepSeek V4 Flash (0731)",
		reasoning: true,
		vision: false,
		contextWindow: 1000000,
		maxTokens: 32768,
		cost: { input: 0.14, output: 0.35, cacheRead: 0.04 },
	},
	{
		id: "deepseek-v4.1-flash",
		name: "DeepSeek V4.1 Flash",
		reasoning: true,
		vision: true,
		contextWindow: 1000000,
		// GreenPT does not publish a max output cap for this model; match the
		// sibling deepseek-v4-flash-0731 until it does.
		maxTokens: 32768,
		cost: { input: 0.22, output: 1.1, cacheRead: 0.011 },
	},
	{
		id: "minimax-m2.5",
		name: "MiniMax M2.5",
		reasoning: true,
		vision: false,
		contextWindow: 192000,
		maxTokens: 128000,
		cost: { input: 0.33, output: 1.32 },
	},
	{
		id: "kimi-k3",
		name: "Kimi K3",
		reasoning: true,
		vision: true,
		contextWindow: 1000000,
		maxTokens: 32768,
		cost: { input: 3.3, output: 16.5, cacheRead: 0.825 },
	},
	{
		id: "kimi-k2.6",
		name: "Kimi K2.6",
		reasoning: true,
		vision: true,
		contextWindow: 256000,
		maxTokens: 256000,
		cost: { input: 0.66, output: 3.751, cacheRead: 0.22 },
	},
	{
		id: "kimi-k2.7-code",
		name: "Kimi K2.7 Code",
		reasoning: true,
		vision: false,
		contextWindow: 256000,
		maxTokens: 256000,
		cost: { input: 0.77, output: 3.85, cacheRead: 0.165 },
	},
	{
		id: "gemma4",
		name: "Gemma 4",
		reasoning: true,
		vision: true,
		contextWindow: 256000,
		maxTokens: 32000,
		cost: { input: 0.5, output: 1.5 },
	},
	{
		id: "qwen3.5-397b-a17b",
		name: "Qwen3.5 397B A17B",
		reasoning: true,
		vision: false,
		contextWindow: 250000,
		maxTokens: 16000,
		cost: { input: 0.7, output: 4.35 },
	},
	{
		id: "qwen3.6-35b-a3b",
		name: "Qwen3.6 35B A3B",
		reasoning: true,
		vision: false,
		contextWindow: 256000,
		maxTokens: 32000,
		cost: { input: 0.3, output: 1.8 },
	},
	{
		id: "mistral-small-3.2-24b-instruct-2506",
		name: "Mistral Small 3.2 24B (2506)",
		reasoning: false,
		vision: true,
		contextWindow: 128000,
		maxTokens: 32000,
		cost: { input: 0.2, output: 0.4 },
	},
	{
		id: "gpt-oss-120b",
		name: "GPT-OSS 120B",
		reasoning: true,
		vision: true,
		contextWindow: 128000,
		maxTokens: 32000,
		cost: { input: 0.2, output: 0.7 },
	},
	{
		id: "qwen3-235b-a22b-instruct-2507",
		name: "Qwen3 235B A22B Instruct (2507)",
		reasoning: true,
		vision: false,
		contextWindow: 250000,
		maxTokens: 16000,
		cost: { input: 0.9, output: 2.7 },
	},
	{
		id: "llama-3.3-70b-instruct",
		name: "Llama 3.3 70B Instruct",
		reasoning: false,
		vision: false,
		contextWindow: 128000,
		maxTokens: 16000,
		cost: { input: 1.1, output: 1.1 },
	},
	{
		id: "green-r",
		name: "GreenR",
		reasoning: true,
		vision: true,
		contextWindow: 128000,
		maxTokens: 32000,
		cost: { input: 0.35, output: 0.95 },
	},
	{
		id: "green-r-raw",
		name: "GreenR Raw",
		reasoning: true,
		vision: true,
		contextWindow: 128000,
		maxTokens: 32000,
		cost: { input: 0.35, output: 0.95 },
	},
	{
		id: "green-l",
		name: "GreenL",
		reasoning: false,
		vision: true,
		contextWindow: 128000,
		maxTokens: 32000,
		cost: { input: 0.25, output: 0.8 },
	},
	{
		id: "green-l-raw",
		name: "GreenL Raw",
		reasoning: false,
		vision: true,
		contextWindow: 128000,
		maxTokens: 32000,
		cost: { input: 0.25, output: 0.8 },
	},
];

function greenptModel(providerId: string, baseUrl: string, spec: GreenPTModelSpec): Model<"openai-completions"> {
	return {
		id: spec.id,
		name: spec.name,
		api: "openai-completions",
		provider: providerId,
		baseUrl,
		reasoning: spec.reasoning,
		input: spec.vision ? ["text", "image"] : ["text"],
		cost: {
			input: spec.cost.input,
			output: spec.cost.output,
			cacheRead: spec.cost.cacheRead ?? 0,
			cacheWrite: 0,
		},
		contextWindow: spec.contextWindow,
		maxTokens: spec.maxTokens,
		compat: GREENPT_COMPAT,
	};
}

function createGreenptProvider(options: {
	id: string;
	name: string;
	baseUrl: string;
	staticModels: readonly GreenPTModelSpec[];
}): Provider<"openai-completions"> {
	const { id, name, baseUrl, staticModels } = options;
	return createProvider({
		id,
		name,
		baseUrl,
		auth: { apiKey: envApiKeyAuth("GreenPT API key", ["GREENPT_API_KEY"]) },
		models: staticModels.map((spec) => greenptModel(id, baseUrl, spec)),
		// Live catalog (GET /models) merged over the static table: known ids keep
		// their documented cost/context metadata, new ids come through with
		// fetchOpenAICompatibleModels' defaults.
		fetchModels: async (context) => {
			const fetched = await fetchOpenAICompatibleModels(
				id,
				baseUrl,
				context.signal,
				context.credential?.type === "api_key" ? context.credential.key : undefined,
			);
			if (fetched.length === 0) return fetched;
			const byId = new Map(GREENPT_MODELS.map((spec) => [spec.id, greenptModel(id, baseUrl, spec)]));
			return fetched.map((model) => byId.get(model.id) ?? model);
		},
		api: openAICompletionsApi(),
	});
}

/** GreenPT EU (default): https://api.greenpt.ai/v1. */
export function greenptProvider(): Provider<"openai-completions"> {
	return createGreenptProvider({
		id: "greenpt",
		name: "GreenPT",
		baseUrl: GREENPT_BASE_URL,
		staticModels: GREENPT_MODELS,
	});
}

/** GreenPT US: https://api.us.greenpt.ai/v1 (EU serves the full catalog). */
export function greenptUsProvider(): Provider<"openai-completions"> {
	return createGreenptProvider({
		id: "greenpt-us",
		name: "GreenPT (US)",
		baseUrl: GREENPT_US_BASE_URL,
		staticModels: GREENPT_MODELS.filter((spec) => GREENPT_US_CHAT_MODEL_IDS.has(spec.id)),
	});
}
