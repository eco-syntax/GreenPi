import type { CredentialStore } from "@earendil-works/pi-ai";
import { GENERATED_CATALOG } from "../../ai/test/fixtures/generated-catalog.ts";
import { ModelRegistry } from "../src/core/model-registry.ts";
import { ModelRuntime } from "../src/core/model-runtime.ts";
import { InMemoryCodingAgentModelsStore } from "../src/core/models-store.ts";
import type { ProviderConfigInput } from "../src/core/provider-composer.ts";

const runtimes = new WeakMap<ModelRegistry, ModelRuntime>();

function wrap(runtime: ModelRuntime): ModelRegistry {
	const registry = new ModelRegistry(runtime);
	runtimes.set(registry, runtime);
	return registry;
}

/** Register the pre-excision catalog providers as declared providers so test
 * fixtures (which reference mainstream provider ids) authenticate. Declared
 * providers carry their own models; the runtime never talks to them because
 * tests supply mocked stream functions. */
function registerFixtureProviders(runtime: ModelRuntime): void {
	for (const [providerId, models] of Object.entries(GENERATED_CATALOG)) {
		const entries = Object.values(models);
		if (entries.length === 0) continue;
		const sample = entries[0];
		const config: ProviderConfigInput = {
			baseUrl: sample.baseUrl ?? "https://fixture.invalid",
			apiKey: "test-key",
			api: sample.api,
			models: entries.map((model) => {
				// Omit model-level baseUrl so provider-level registerProvider
				// overrides behave like the original catalog layout.
				const { baseUrl: _baseUrl, ...rest } = model;
				return {
					...rest,
					input: [...model.input],
				};
			}),
		};
		try {
			runtime.registerProvider(providerId, config);
		} catch {
			// Fixture entry not shaped like a valid declared provider; skip.
		}
	}
}

/** Load optional models.json configuration without introducing file-backed catalog locks into unit tests. */
export async function createModelRegistry(credentials: CredentialStore, modelsPath?: string): Promise<ModelRegistry> {
	const runtime = await ModelRuntime.create({
		allBuiltinProviders: true,
		credentials,
		modelsPath,
		modelsStore: new InMemoryCodingAgentModelsStore(),
		allowModelNetwork: false,
	});
	registerFixtureProviders(runtime);
	return wrap(runtime);
}

export async function createInMemoryModelRegistry(credentials: CredentialStore): Promise<ModelRegistry> {
	const runtime = await ModelRuntime.create({
		allBuiltinProviders: true,
		credentials,
		modelsPath: null,
		allowModelNetwork: false,
	});
	registerFixtureProviders(runtime);
	return wrap(runtime);
}

export function getModelRuntime(modelRegistry: ModelRegistry): ModelRuntime {
	const runtime = runtimes.get(modelRegistry);
	if (!runtime) throw new Error("ModelRegistry was not created by the test helper");
	return runtime;
}
