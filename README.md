# Zoo

Zoo is a set of skills for building and maintaining software with Codex.

I want agents to understand the code they change and explain how they checked the result. Your
repo's API rules, components and design references should inform the work.

Start with `$zoo` for everyday tasks. Add a focused skill when you want help with API behavior,
UI work, a larger change or verification in a running app.

## Get started

This quickstart is for Codex CLI on macOS. You need Codex and Git. Zoo's instructions don't require
Python, Node or Docker to read. Your project's checks may have their own requirements.

**1. Start in your existing project.** Replace the path below with its root directory. The clone goes
in a sibling directory.

```sh
cd /path/to/your-project &&
git clone --branch v0.1.0-alpha.1 --depth 1 https://github.com/jpbuildslab/zoo-stack.git ../zoo-stack
```

If that clone already exists or the command fails, follow the
[existing clone or archive route](docs/local-skill.md#install-from-an-existing-clone-or-archive).

**2. Install the core skill.** Stay in your project's root and run:

```sh
test ! -L .agents &&
test ! -L .agents/skills &&
mkdir -p .agents/skills &&
test ! -e .agents/skills/zoo &&
test ! -L .agents/skills/zoo &&
cp -R ../zoo-stack/skills/zoo .agents/skills/zoo
```

You should now have `.agents/skills/zoo/SKILL.md`, its references and its license. Existing or linked
destinations are left untouched. This installs `zoo` only. The other four skills are optional.

**3. Try one real question.** Open a fresh Codex CLI session in your project. Type `$` to select the
installed `zoo` entry in your project. Then name a button, command or function you want to
understand.

```text
Trace what happens when I click Save on the customer form. Cite the code that
saves the record, what can fail, and how the caller recovers. Use source only.
Don't change files or run the app.
```

Replace the example with your actual screen or entrypoint. Give its file or route if the name is
ambiguous. A useful answer shows the relevant path through the code, with citations and a clear
statement of what would still need a running app to verify.

For one task, you can also [point Codex at the skill file directly](docs/local-skill.md#use-a-skill-without-installing-it).
Record the [installed package](docs/local-skill.md#record-what-you-installed) if you plan to keep it.

## Choose a skill

Use `zoo` for the normal task. Install and explicitly select an optional skill when its focus helps.
The [install guide](docs/local-skill.md) shows the source and destination for each package.

| When you want to… | Select | What it focuses on |
| --- | --- | --- |
| Understand code, plan, build, review or continue | `$zoo` | The requested outcome, current source and relevant checks |
| Build a substantial change | `$zoo-production-loop` | Coherent steps, one writer and independent review where it matters |
| Change an API | `$zoo-api-craft` | Permissions, request/data contracts, writes and retries |
| Improve an existing screen | `$zoo-ui-craft` | The repo's design, clear actions, responsive behavior and recovery |
| Verify a running workflow | `$zoo-runtime-acceptance` | Real behavior, persisted results, effects and cleanup |

Keep small changes small. Select a companion for the task at hand. When you select several skills,
use them in the same workflow.

## Give it the task

After selecting the relevant installed skill, use your own words:

```text
Plan how to stop this form from submitting twice. Show the affected code and
the test that would prove the fix. Don't implement it yet.
```

```text
Fix the approved issue in this worktree and run the agreed local checks.
Leave unrelated changes alone.
```

```text
Compare this screen with our accepted Invoice view. Find repeated text,
unclear actions and missing recovery. Return findings first.
```

```text
Read this checkpoint, compare it with the current code, and continue the
remaining authorized work.
```

A question stays a question. A plan stays a plan. For implementation, say which change and checks
you authorize. See [the first-task walkthrough](docs/first-task.md) for a complete example.

## Make it fit your product

Keep permissions, data rules, design tokens, accepted screens and verification commands in your repo. Zoo tells the agent to find and use those definitions.

For UI work, an example should point to a real component and show the states that matter. Preserve
useful consequences and blocker messages. Remove text that only repeats a heading or control.

Use your existing repository instructions. You don't need a new profile format or a duplicate
handbook. [Repository guidance](docs/repository-guidance.md) shows the connection.

## Status and feedback

Zoo is an alpha. Local checks cover the packages, installation and selected synthetic tasks.
The latest local evaluation covers dispatch acknowledgement handling and a synthetic request queue
with browser and PostgreSQL checks.
The [compatibility notes](docs/compatibility.md) and [results](docs/results.md) explain the limits.
Skills guide behavior; the host controls tool and file access.

See [downloads](docs/downloads.md) for release archives and checksums,
[contributing](CONTRIBUTING.md) for checks and useful reports, and [security](SECURITY.md) for private issues.

## Credits

[PStack](https://github.com/cursor/plugins/tree/main/pstack) and
[TStack](https://github.com/t3dotgg/tstack) informed Zoo's approach to reusable engineering workflows.

See [NOTICE](NOTICE) for research influences and external tooling.

## License

MIT
