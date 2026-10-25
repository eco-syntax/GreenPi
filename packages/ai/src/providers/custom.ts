import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import type { ApiKeyAuth, Credential } from "../auth/types.ts";
import { createProvider, type Provider } from "../models.ts";
import { fetchOpenAICompatibleModels } from "./local.ts";

/**
 * Credential-env markers that let a custom endpoint registered via /login be
 * re-registered on later starts: `ModelRuntime.create` scans stored
 * credentials for these keys and rebuilds the provider.
 */
export const CUSTOM_PROVIDER_BASE_URL_ENV = "OPENAI_BASE_URL";
export const CUSTOM_PROVIDER_NAME_ENV = "OPENAI_PROVIDER_NAME";

export interface CustomOpenAICompatibleOptions {
	/** Provider id entered by the user, already slugified. */
	id: string;
	/** Display name entered by the user. */
	name: string;
	/** Server base URL (includes the API prefix, e.g. http://host:port/v1). */
	baseUrl: string;
}

/**
 * A user-defined OpenAI-compatible endpoint registered from /login: dynamic
 * model discovery from `GET /models`, optional key (dummy bearer when unset),
 * conservative local-server compat. Name/URL prompts happen before this
 * factory runs; the values are also stamped into the credential env by the
 * caller so the provider survives restarts.
 */
export function customOpenAICompatibleProvider(options: CustomOpenAICompatibleOptions): Provider<"openai-completions"> {
	const auth: ApiKeyAuth = {
		name: `${options.name} API key (optional)`,
		login: async (interaction) => {
			interaction.signal.throwIfAborted();
			const key = await interaction.prompt({
				type: "secret",
				message: `${options.name} API key (optional, enter to skip)`,
			});
			return {
				type: "api_key",
				key: key.trim() || undefined,
				env: {
					[CUSTOM_PROVIDER_BASE_URL_ENV]: options.baseUrl,
					[CUSTOM_PROVIDER_NAME_ENV]: options.name,
				},
			};
		},
		check: async () => ({ type: "api_key", source: "stored credential" }),
		resolve: async ({ credential }) => ({
			auth: { apiKey: credential?.key || "local", baseUrl: options.baseUrl },
			env: credential?.env,
			source: "stored credential",
		}),
	};
	return createProvider({
		id: options.id,
		name: options.name,
		baseUrl: options.baseUrl,
		isCustomEndpoint: true,
		auth: { apiKey: auth },
		models: [],
		fetchModels: async (context) =>
			await fetchOpenAICompatibleModels(
				options.id,
				options.baseUrl,
				context.signal,
				context.credential?.type === "api_key" ? context.credential.key : undefined,
			),
		api: openAICompletionsApi(),
	});
}

/** Rebuild a custom provider from its stored credential, or undefined if the credential is not a custom-endpoint marker. */
export function customProviderFromCredential(
	providerId: string,
	credential: Credential,
): Provider<"openai-completions"> | undefined {
	if (credential.type !== "api_key") return undefined;
	const baseUrl = credential.env?.[CUSTOM_PROVIDER_BASE_URL_ENV];
	const name = credential.env?.[CUSTOM_PROVIDER_NAME_ENV];
	if (!baseUrl || !name) return undefined;
	return customOpenAICompatibleProvider({ id: providerId, name, baseUrl });
}
