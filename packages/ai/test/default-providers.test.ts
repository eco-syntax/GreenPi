import { describe, expect, it } from "vitest";
import { builtinProviders } from "../src/providers/all.ts";
import { greenptProvider } from "../src/providers/greenpt.ts";
import { fetchOpenAICompatibleModels } from "../src/providers/local.ts";
import { viroProvider } from "../src/providers/viro.ts";

describe("default-presented providers", () => {
	it("registers GreenPT, Viro, and local inference servers", () => {
		const ids = new Set(builtinProviders().map((provider) => provider.id));
		for (const id of ["greenpt", "viro", "lmstudio", "ollama", "vllm", "llama-cpp"]) {
			expect(ids.has(id)).toBe(true);
		}
	});

	it("greenpt catalog has unique ids pointing at the GreenPT endpoint", () => {
		const models = greenptProvider().getModels();
		expect(models.length).toBeGreaterThan(10);
		expect(new Set(models.map((model) => model.id)).size).toBe(models.length);
		for (const model of models) {
			expect(model.baseUrl).toBe("https://api.greenpt.ai/v1");
			expect(model.api).toBe("openai-completions");
		}
	});

	it("viro discovers models dynamically", () => {
		expect(viroProvider().getModels()).toEqual([]);
		expect(viroProvider().baseUrl).toBe("https://api.viro.app/v1");
	});

	it("viro discovers models from its own base URL with the API key", async () => {
		const provider = viroProvider();
		const requests: Array<{ url: string; authorization: string | null }> = [];
		const originalFetch = globalThis.fetch;
		globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
			const headers = init?.headers as Record<string, string> | undefined;
			requests.push({
				url: String(input),
				authorization: headers?.authorization ?? null,
			});
			return new Response(JSON.stringify({ data: [{ id: "viro-1" }] }), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		}) as typeof fetch;
		try {
			await provider.refreshModels?.({
				credential: { type: "api_key", key: "test-key" },
				publish: async () => true,
				allowNetwork: true,
				signal: new AbortController().signal,
			});
			expect(requests).toEqual([{ url: "https://api.viro.app/v1/models", authorization: "Bearer test-key" }]);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it("parses OpenAI-compatible /models responses", async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = (async () =>
			new Response(JSON.stringify({ data: [{ id: "qwen3-8b" }, { id: "" }, {}] }), { status: 200 })) as typeof fetch;
		try {
			const models = await fetchOpenAICompatibleModels(
				"lmstudio",
				"http://localhost:1234/v1",
				new AbortController().signal,
			);
			expect(models.map((model) => model.id)).toEqual(["qwen3-8b"]);
			expect(models[0]?.provider).toBe("lmstudio");
			expect(models[0]?.api).toBe("openai-completions");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it("returns no models when the local server is offline", async () => {
		const models = await fetchOpenAICompatibleModels(
			"lmstudio",
			"http://localhost:59999/v1",
			new AbortController().signal,
		);
		expect(models).toEqual([]);
	});
});
