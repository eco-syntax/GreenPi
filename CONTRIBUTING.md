# Contributing to GreenPi

GreenPi is a fork of [pi](https://github.com/earendil-works/pi), based on the pre-1.0 (v0.85.x) lineage. Issues and PRs are welcome and are not auto-closed.

## Philosophy

pi's core is minimal, and GreenPi keeps it that way.

If your feature does not belong in the core, it should be an extension. PRs that bloat the core will likely be rejected.

## The One Rule

**You must understand your code.** If you cannot explain what your changes do and how they interact with the rest of the system, your PR will be closed.

Using AI to write code is fine. Submitting AI-generated output without understanding it is not.

If you use an agent, run it from the repository root so it picks up `AGENTS.md` automatically. Your agent must follow the rules and guidelines in that file.

## Issues

Good issues are short, concrete, and reproducible:

- Use one of the issue templates.
- State the bug or request clearly, with minimal reproduction steps.
- Explain why it matters.
- Say so if you want to implement the change yourself.

## Before Submitting a PR

```bash
npm run check
./test.sh
```

Both must pass.

If you are adding a new provider to `packages/ai`, see `AGENTS.md` for required tests.

Changelog entries go in each package's `CHANGELOG.md` under `## [Unreleased]`; see `AGENTS.md` for the format and attribution rules.

## Upstream Relationship

GreenPi tracks pi v0.85.x and cherry-picks upstream fixes selectively instead of merging upstream releases. See [UPSTREAM.md](UPSTREAM.md) for what has and has not been ported.
