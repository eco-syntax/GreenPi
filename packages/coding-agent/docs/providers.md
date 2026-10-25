# Providers

Pi ships with a default set of providers focused on European cloud inference and local models: **GreenPT** and **Viro AI** (OpenAI-compatible cloud APIs), plus **LM Studio**, **Ollama**, **vLLM**, and **llama.cpp server** for local inference. Other built-in providers (Anthropic, OpenAI, Google, etc.) remain in the provider catalog but are not registered by pi by default; see [Other Built-in Providers](#other-built-in-providers).

## Table of Contents

- [Default Providers](#default-providers)
- [Other Built-in Providers](#other-built-in-providers)
- [API Keys and Auth File](#api-keys-and-auth-file)
- [llama.cpp](#llamacpp)
- [Custom Providers](#custom-providers)
- [Resolution Order](#resolution-order)

## Default Providers

These providers are offered by `/login`, `/model`, and first-run setup. All of them speak the OpenAI Completions API.

### GreenPT

European OpenAI-compatible API ([docs.greenpt.ai](https://docs.greenpt.ai)) with a curated catalog (GLM, Kimi, DeepSeek, Qwen, MiniMax, Gemma, GPT-OSS, and GreenPT's own models). The model list is refreshed from `GET /models`; the curated table supplies cost and context metadata for known ids.

The base URL selects the region ([regions](https://docs.greenpt.ai/regions)): `greenpt` uses the EU endpoint (`https://api.greenpt.ai/v1`, full catalog) and `greenpt-us` uses the US endpoint (`https://api.us.greenpt.ai/v1`, a subset). Both use `GREENPT_API_KEY`.

```bash
export GREENPT_API_KEY=...
# or: /login greenpt
pi --provider greenpt --model glm-5.2

# US inference, same API key
pi --provider greenpt-us --model glm-5.3
```

### Viro AI

OpenAI-compatible API at `https://api.viro.app/v1`. Models are discovered dynamically from the server (`GET /models`).

```bash
export VIRO_API_KEY=...
# or: /login viro
pi --provider viro
```

### Local Inference Servers

On first interactive startup, pi offers to set up llama.cpp as the default local provider: it installs a pinned `llama-server`, starts it on `http://127.0.0.1:8080` (`LLAMA_BASE_URL` overrides), downloads the default model, and saves it as the startup default. See [llama-cpp.md](llama-cpp.md).

LM Studio, Ollama, vLLM, and a bring-your-own llama.cpp server run locally and need no API key (optional env vars are supported). Pi discovers their models from the OpenAI-compatible `GET /models` endpoint at startup. `/login <provider>` for these also asks for the server URL (Enter keeps the default), so a server on a non-default host or port can be configured without models.json.

| Provider | Default endpoint | Key env var |
|----------|------------------|-------------|
| LM Studio | `http://localhost:1234/v1` | `LMSTUDIO_API_KEY` (optional) |
| Ollama | `http://localhost:11434/v1` | `OLLAMA_API_KEY` (optional) |
| vLLM | `http://localhost:8000/v1` | `VLLM_API_KEY` (optional) |
| llama.cpp server | `http://localhost:8080/v1` | `LLAMA_CPP_API_KEY` (optional) |
| [Strata](https://github.com/Niko1221/Strata) | `http://127.0.0.1:8080/v1` | `STRATA_API_KEY` (optional) |
| [Unsloth Studio](https://unsloth.ai/docs/basics/api) | `http://localhost:8888/v1` | `UNSLOTH_API_KEY` (**required** — the generated `sk-unsloth-…` key) |

Start the server, then:

```bash
greenpi --provider lmstudio      # or ollama / vllm / llama-cpp / strata / unsloth
```

Discovered models assume a 128k context window and 8k output; override per model with `models.json` `modelOverrides` (see [models.md](models.md)).

## Other Endpoints (models.json)

For one-off endpoints there is also `/login` → **Custom OpenAI-compatible endpoint**: enter a provider name and server URL (plus an optional API key), and pi registers the provider for this and future sessions, discovering models from `GET <url>/models`. `/logout` removes it again. For anything that needs more control (API dialect, model metadata, headers), use models.json instead.

GreenPi ships no mainstream cloud providers. To point GreenPi at any other OpenAI-compatible (or Anthropic/Responses-speaking) endpoint, declare it via `models.json` with its `baseUrl`, API dialect, API key, and models (see [models.md](models.md)). The wire protocols (`openai-completions`, `anthropic-messages`, `openai-responses`, `google-generative-ai`, `bedrock-converse-stream`) are bundled for this purpose.

## API Keys and Auth File

API keys are resolved from the credential store (`~/.greenpi/agent/auth.json`) or environment variables. Store a key via `/login <provider>` or set the env var directly:

```bash
export GREENPT_API_KEY=...
# or: export VIRO_API_KEY=...
```

| Provider | Environment Variable | `auth.json` key |
|----------|----------------------|------------------|
| GreenPT | `GREENPT_API_KEY` | `greenpt` |
| GreenPT (US) | `GREENPT_API_KEY` | `greenpt-us` |
| Viro AI | `VIRO_API_KEY` | `viro` |

Store credentials in `~/.greenpi/agent/auth.json`:

```json
{
  "greenpt": { "type": "api_key", "key": "..." },
  "viro": { "type": "api_key", "key": "..." }
}
```

The file is created with `0600` permissions (user read/write only). Auth file credentials take priority over environment variables.

API key credentials can also include provider-scoped environment values. These values are used before process environment variables when resolving the credential key, provider/model headers, and provider configuration such as `PI_CACHE_RETENTION` and `HTTP_PROXY`/`HTTPS_PROXY`.

```json
{
  "greenpt": {
    "type": "api_key",
    "key": "$GREENPT_API_KEY",
    "env": {
      "GREENPT_API_KEY": "..."
    }
  }
}
```

Use this when pi should use different provider settings than the project shell environment.

### Key Resolution

The `key` field supports command execution, environment interpolation, and literals:

- **Shell command:** `"!command"` at the start executes the whole value as a command and uses stdout (cached for process lifetime)
  ```json
  { "type": "api_key", "key": "!security find-generic-password -ws 'greenpt'" }
  ```
- **Environment interpolation:** `"$ENV_VAR"` or `"${ENV_VAR}"` uses the value of the named variable. Interpolation works inside larger literals.
  ```json
  { "type": "api_key", "key": "$MY_GREENPT_KEY" }
  { "type": "api_key", "key": "${KEY_PREFIX}_${KEY_SUFFIX}" }
  ```
  `$FOO_BAR` is the variable `FOO_BAR`; use `${FOO}_BAR` when `BAR` is literal text. Missing environment variables make the value unresolved.
- **Escapes:** `"$$"` emits a literal `"$"`; `"$!"` emits a literal `"!"` without triggering command execution.
  ```json
  { "type": "api_key", "key": "$$literal-dollar-prefix" }
  { "type": "api_key", "key": "$!literal-bang-prefix" }
  ```
- **Literal value:** Used directly. Plain uppercase strings such as `MY_API_KEY` are literals; use `$MY_API_KEY` for environment variables.
  ```json
  { "type": "api_key", "key": "..." }
  { "type": "api_key", "key": "public" }
  ```

OAuth credentials are stored here only for providers that register an OAuth flow via an extension; built-in providers use API keys.

## llama.cpp

Pi supports the llama.cpp router server. Configure it with `/login llama.cpp`, manage loaded models with `/llama`, and select a loaded model with `/model`.

See [llama.cpp](llama-cpp.md) for server setup, model directory layout, environment variables, and command usage.

## Custom Providers

**Via models.json:** Add Ollama, LM Studio, vLLM, or any provider that speaks a supported API (OpenAI Completions, OpenAI Responses, Anthropic Messages, Google Generative AI). See [models.md](models.md).

**Via extensions:** For providers that need custom API implementations or OAuth flows, create an extension. See [custom-provider.md](custom-provider.md) and [examples/extensions/custom-provider-gitlab-duo](../examples/extensions/custom-provider-gitlab-duo/).

## Resolution Order

When resolving credentials for a provider:

1. CLI `--api-key` flag
2. `auth.json` entry (API key or OAuth token)
3. Environment variable
4. Custom provider keys from `models.json`
