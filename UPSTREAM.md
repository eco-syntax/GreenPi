# Upstream relationship

GreenPi forks [pi](https://github.com/earendil-works/pi) at the v0.85.x line (upstream's last releases before its 1.0 architecture change). We do not merge upstream `main`; we cherry-pick fixes onto the 0.85.x base.

## Why not merge

Upstream 1.0 changed default behavior and architecture in ways this fork intentionally does not follow:

- Fullscreen-by-default terminal UI (GreenPi keeps normal scrollback).
- Reworked codemode with ~40% prompt-token reduction and new image/classifier/decision APIs.
- The `packages/durable` agent-architecture work ("pico").
- Radius single-sign-on as a first-class provider.
- New provider catalog churn for services GreenPi does not present.

These are good changes for upstream's goals; they are just not what GreenPi's users want. Nothing here is a judgment about their quality.

## Cherry-picked from upstream

| Upstream commit | Fix |
|---|---|
| `c37b0e03b` | Cap agent retry backoff at `retry.maxAgentDelayMs` (#8826) |
| `acaa253cc` | Reject extension tools without parameter schemas at registration (#9300) |
| `890f92088` | Default unknown OpenAI-compatible endpoints to non-strict tools (#9816) |
| `8d897edaa` | Prevent duplicate extension runtimes; warn on host modules in `dependencies` (#9863) |
| `c01f687e5` | Apply model `samplingParams` in direct `stream()`/`complete()` calls (#9506) |
| `ff72faba2` | Save new session file at the first user message (#10000) |
| `1b2aa0ca0` | Reject unfinished OpenAI Responses tool calls instead of running them (#9974) |
| `da19b63c7` | Cache llama.cpp context window across reloads (#10158/#10077) |
| `0c453048b` | Fail when `--provider` is given without `--model` (#10236) |
| `54c19a252` | Reduce TUI memory retained per rendered message (~5x) |

## Evaluated and skipped

- `1d74741e1`, `d850edee9` — MCP OAuth fixes (serialized refreshes, RFC 9207 `iss` check). N/A: the fork's 0.85.x base predates upstream's MCP extension entirely. If MCP support is ported later, port these with it.
- Everything listed under "Why not merge" above.
- Provider-catalog churn for providers GreenPi does not register.

## Policy

- When upstream lands a security fix, port it promptly.
- Feature PRs against upstream that fit the 0.85.x architecture may be cherry-picked case by case; record them in the table above.
- Changelog entries for ported fixes go under each package's `## [Unreleased]` with the original issue reference.
