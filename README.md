<p align="center">
  <img alt="GreenPi" src="packages/coding-agent/docs/images/exy.png" alt="Exy mascot" width="96">
</p>

# GreenPi

GreenPi is a community fork of [pi](https://github.com/earendil-works/pi), the minimal, extensible coding agent. Issues and PRs are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## Why this fork exists

Upstream pi's 1.0 release moved in a direction many users did not want: fullscreen-by-default terminal UI, a reworked codemode, and a much larger feature surface. GreenPi stays on the **pre-1.0 (v0.85.x) lineage** and keeps what made pi appealing: a small core, plain terminal scrollback, and extensions for everything else.

On top of that base, GreenPi is **local-first**:

- On first startup it offers to install and run a **local llama.cpp server** as the default provider (local inference: llama.cpp, LM Studio, Ollama, vLLM). Your code, sessions, and model traffic stay on your machine by default.
- Cloud providers are limited to **[GreenPT](https://greenpt.com)** (EU and US endpoints) and **[Viro AI](https://ai.viro.app)**. Other built-in cloud providers are not registered by the default runtime, but can be declared via `models.json` if you must.
- The installed CLI is `greenpi`; config lives in `~/.greenpi`. Project-level `.pi/` directories remain compatible with upstream pi.

GreenPi tracks upstream selectively: security fixes and bug fixes are cherry-picked from upstream; the 1.0+ architecture is not merged. See [UPSTREAM.md](UPSTREAM.md) for exactly what has been ported.

## Packages

| Package | Description |
|---------|-------------|
| **[@earendil-works/chord](packages/chord)** | Standalone application-composition runtime for services, replicated state, RPC, and plugins |
| **[@earendil-works/pi-telemetry](packages/telemetry)** | Vendor-neutral telemetry contracts, reference adapter, conformance tests, and typed schemas |
| **[@earendil-works/pi-ai](packages/ai)** | Unified multi-provider LLM API, local-first (GreenPT, Viro AI, and local OpenAI-compatible servers) |
| **[@earendil-works/pi-agent-core](packages/agent)** | Agent runtime with tool calling and state management |
| **[@earendil-works/pi-coding-agent](packages/coding-agent)** | Interactive coding agent CLI (installed as `greenpi`) |
| **[@earendil-works/pi-tui](packages/tui)** | Terminal UI library with differential rendering |

Package names keep the upstream `@earendil-works` scope for source-level compatibility; nothing is published to npm under that scope. Install from source:

```bash
git clone https://github.com/ColbyBrown/GreenPi.git
cd GreenPi
npm install --ignore-scripts
npm run build
npm install -g --ignore-scripts ./packages/coding-agent   # installs the `greenpi` CLI
greenpi
```

Standalone binaries can be built from a release source archive (see below) without installing Node packages globally.

## Permissions & Containerization

GreenPi does not include a built-in permission system for restricting filesystem, process, network, or credential access. By default, it runs with the permissions of the user and process that launched it.

If you need stronger boundaries, containerize or sandbox it. See [packages/coding-agent/docs/containerization.md](packages/coding-agent/docs/containerization.md) for three patterns:

- **Gondolin extension**: keep `greenpi` and provider auth on the host while routing built-in tools and `!` commands into a local Linux micro-VM.
- **Plain Docker**: run the whole process in a local container for simple isolation.
- **OpenShell**: run the whole process in a policy-controlled sandbox.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines and [AGENTS.md](AGENTS.md) for project-specific rules (for both humans and agents).

## Development

```bash
npm install --ignore-scripts  # Install all dependencies without running lifecycle scripts
npm run build         # Refresh model data, then build all packages
npm run build:offline # Rebuild using existing model data without network access
npm run check         # Lint, format, and type check
./test.sh            # Run tests (skips LLM-dependent tests without API keys)
./pi-test.sh         # Run greenpi from sources (can be run from any directory)
```

## Building standalone binaries from release source

GitHub releases include a versioned source archive covered by the release's `SHA256SUMS` file. Extract it and build standalone binaries locally:

```bash
VERSION="<release-version>"
tar -xzf "greenpi-${VERSION}-source.tar.gz"
cd "greenpi-${VERSION}"
./scripts/build-binaries.sh --offline-model-data --platform linux-x64 --out "$PWD/out"
```

The source archive includes the generated provider model data used for the release. `--offline-model-data` builds with that snapshot instead of refreshing it from live provider catalogs. The script still installs dependencies, builds the monorepo, compiles the Bun executable, and stages its runtime assets. Package maintainers who provide dependencies separately can pass `--skip-install --skip-deps`.

## Supply-chain hardening

We treat npm dependency changes as reviewed code changes.

- Direct external dependencies are pinned to exact versions. Internal workspace packages remain version-ranged.
- `.npmrc` sets `save-exact=true` and `min-release-age=2` to avoid same-day dependency releases during npm resolution.
- `package-lock.json` is the dependency ground truth. Pre-commit blocks accidental lockfile commits unless `PI_ALLOW_LOCKFILE_CHANGE=1` is set.
- `npm run check` verifies pinned direct deps, native TypeScript import compatibility, and the generated coding-agent shrinkwrap.
- The CLI package includes `packages/coding-agent/npm-shrinkwrap.json`, generated from the root lockfile, to pin transitive deps for npm users.
- Local release installs, documented npm installs, and `greenpi update --self` use `--ignore-scripts` where supported.
- CI installs with `npm ci --ignore-scripts`, and a scheduled GitHub workflow runs `npm audit --omit=dev` plus `npm audit signatures --omit=dev`.
- Shrinkwrap generation has an explicit allowlist for dependency lifecycle scripts; new lifecycle-script deps fail checks until reviewed.

## License

MIT, like upstream pi. Upstream is Copyright (c) Mario Zechner; see [LICENSE](LICENSE).
