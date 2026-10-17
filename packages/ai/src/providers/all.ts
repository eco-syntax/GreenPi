import { type CreateModelsOptions, createModels, type MutableModels, type Provider } from "../models.ts";
import type { Api, Model } from "../types.ts";
import { greenptProvider, greenptUsProvider } from "./greenpt.ts";
import {
	llamaCppServerProvider,
	lmStudioProvider,
	ollamaProvider,
	strataProvider,
	unslothProvider,
	vllmProvider,
} from "./local.ts";
import { radiusProvider } from "./radius.ts";
import { viroProvider } from "./viro.ts";

export { radiusProvider };

export type BuiltinProvider =
	| "greenpt"
	| "greenpt-us"
	| "viro"
	| "llama-cpp"
	| "lmstudio"
	| "ollama"
	| "vllm"
	| "strata"
	| "unsloth"
	| "radius";

/** All built-in providers, freshly constructed. GreenPi ships only local
 * inference and the green datacenter providers; anything else is declared via
 * models.json. */
export function builtinProviders(): Provider[] {
	return [
		greenptProvider(),
		greenptUsProvider(),
		viroProvider(),
		llamaCppServerProvider(),
		lmStudioProvider(),
		ollamaProvider(),
		vllmProvider(),
		strataProvider(),
		unslothProvider(),
		radiusProvider(),
	];
}

/** A `Models` collection with every built-in provider registered. */
export function builtinModels(options?: CreateModelsOptions): MutableModels {
	const models = createModels(options);
	for (const provider of builtinProviders()) {
		models.setProvider(provider);
	}
	return models;
}

/** Runtime model lookup over the built-in providers (replaces the generated
 * static catalog reads). */
export function getBuiltinModels(provider: string): readonly Model<Api>[] {
	return (
		builtinProviders()
			.find((entry) => entry.id === provider)
			?.getModels() ?? []
	);
}

export function getBuiltinModel(provider: string, modelId: string): Model<Api> | undefined {
	return getBuiltinModels(provider).find((model) => model.id === modelId);
}

export function getBuiltinProviders(): string[] {
	return builtinProviders().map((provider) => provider.id);
}
