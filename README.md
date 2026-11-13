# Zoo

I want agents to understand a repo before they change it. Read the code, follow the product's rules,
and check the path someone will actually use.

Zoo puts that approach into five skills. Use it to investigate a problem, plan a change, build an
approved slice, review the result, or pick up work another session left behind. Your repository keeps
its own API rules, design system and verification commands.

## Start here

Clone the alpha release alongside the project you want to work on:

```sh
git clone --branch v0.1.0-alpha.1 --depth 1 https://github.com/jpbuildslab/zoo-stack.git
```

The verified project-local discovery path is Codex CLI and App Server on macOS. From your project's
root, install the general entrypoint:

```sh
test ! -L .agents &&
test ! -L .agents/skills &&
mkdir -p .agents/skills &&
test ! -e .agents/skills/zoo &&
test ! -L .agents/skills/zoo &&
cp -R ../zoo-stack/skills/zoo .agents/skills/zoo
```

This leaves an existing installation untouched. If Zoo is already there, or your clone is elsewhere,
follow the [installation and update guide](docs/local-skill.md).

Start a fresh Codex chat in your project and try one question:

```text
$zoo Trace how this app saves a changed record. Show me the owner of the write,
what can fail, and how the caller recovers. Cite the source. Don't edit files.
```

You can also point a chat directly at `skills/zoo/SKILL.md` in your clone without installing it.
Each package carries its MIT license. The four companion skills are optional. Install the ones you need from the same release and name
them explicitly when you use them.

## The skills

| Skill | What it helps you do |
| --- | --- |
| [zoo](skills/zoo/SKILL.md) | Choose the right approach for investigation, planning, building, review or continuation |
| [zoo-production-loop](skills/zoo-production-loop/SKILL.md) | Keep substantial work in coherent slices with one accountable writer and focused review |
| [zoo-api-craft](skills/zoo-api-craft/SKILL.md) | Trace permissions, resource scope, contracts, writes, retries and recovery |
| [zoo-ui-craft](skills/zoo-ui-craft/SKILL.md) | Extend a product's accepted design while preserving its behavior, accessibility and recovery |
| [zoo-runtime-acceptance](skills/zoo-runtime-acceptance/SKILL.md) | Check running behavior, persisted results, external effects and cleanup |

A small wording fix should stay small. A payment or permission change needs deeper proof. Load the
methods that help with the actual task, rather than putting every change through the same process.

## A few ways to use it

**Plan an API change**

```text
$zoo $zoo-api-craft Plan this recovery fix against the current source.
Name the affected contracts and the tests that would prove it. Planning only.
```

**Make an approved change**

```text
$zoo Implement the approved slice in this worktree. Preserve unrelated work,
run the agreed checks, and report anything that remains unverified.
```

**Improve a screen**

```text
$zoo-ui-craft Compare this screen with the repo's accepted sibling.
Find unnecessary copy, unclear actions and broken recovery. Return findings first.
```

**Review or continue**

```text
$zoo Review this diff for regressions in permissions and repeat behavior.
Keep the candidate unchanged.
```

```text
$zoo Compare this checkpoint with the current checkout and continue only
what's already authorized. Preserve completed work and useful evidence.
```

## Keep product knowledge in the product

Zoo supplies the method. Your repo supplies the definitions: who can act, which record an operation
belongs to, what an approved screen looks like, and which command proves the change works.

For UI work, point to actual tokens, components and accepted examples. Keep useful state, action and
consequence text. Remove explanations that repeat a heading or control. A cleaner screen still needs
to tell someone when their payment or saved change is unconfirmed.

Use your existing instructions and a short task map. You don't need a new profile format or a second
handbook. See the [repository guidance](docs/repository-guidance.md) and [small example](examples/repository-guidance.md).

## What we've checked

This is an alpha. Local checks cover package boundaries, installation and recovery, synthetic
engineering tasks, and selected browser and database workflows. The current host evidence is from
Codex CLI and App Server on macOS. The new API and UI companions also went through a source-only
exercise using two different synthetic product profiles.

Failures and limits are kept in the [results](docs/results.md), including cases that needed a repair.
The [compatibility notes](docs/compatibility.md) distinguish observed behavior from support we haven't
verified. Independent beta, other hosts and Desktop picker behavior still need evidence.

Skills guide the agent; they don't enforce its permissions. A planning request stays planning-only.
Use the host's actual controls for tools, files and services, and authorize implementation separately.

## Contributing

Bring a concrete task, a small reproduction and the outcome you expected. Changes that make a real
workflow clearer or catch a meaningful failure are useful. See [CONTRIBUTING.md](CONTRIBUTING.md) for
local checks and [SECURITY.md](SECURITY.md) for private reports.

## Credits and license

[PStack](https://github.com/cursor/plugins/tree/main/pstack) and
[TStack](https://github.com/t3dotgg/tstack) helped shape Zoo's approach to reusable engineering workflows.
Zoo's local results don't establish that it outperforms either project.

[MIT](LICENSE), copyright 2026 JP. Research influences and external tooling are listed in [NOTICE](NOTICE).
