# Contributing to Zoo

Start with a concrete task the current skill handles poorly. Show what happened, what you expected,
and the smallest example that explains the gap. Keep one coherent change per pull request.

## What belongs here

Zoo owns reusable methods. A product's roles, routes, tokens, components and runtime commands belong
in that product's repo. If a private project exposed a useful lesson, recreate the issue with synthetic
inputs rather than copying its source or screenshots into Zoo.

Keep the entrypoints short. Add a reference when a task needs detail, and link it where the agent
needs it. Every skill must remain usable outside this checkout with its local links intact.

## Run the local checks

Use Python 3.9 or newer and Node.js 24 or newer. From the repository root:

```sh
python3 evals/check-static.py
python3 evals/test_package_checks.py
node --test evals/fixtures/first-tasks/notices.test.ts evals/fixtures/preferences-cli/prefs.test.mjs evals/assertions/preferences-files.test.mjs evals/assertions/race-outcome.test.mjs
```

These checks don't need a model, database or provider. For a behavior or runtime change, use the
relevant case in [the evaluation guide](evals/README.md). Record the exact candidate, commands,
results, substitutions and checks you couldn't run. Keep a failed result when a later correction
passes. Don't rerun unrelated work just to produce a larger test count.

## Open an issue or pull request

Use [Issues](https://github.com/jpbuildslab/zoo-stack/issues) for ordinary bugs, documentation gaps or
proposals. Include the release or commit, host, selected skills, expected behavior and observed result.
Share only material you have permission to disclose. Remove credentials, private code and personal data.

A pull request should lead with the problem and resulting behavior, then explain the meaningful checks.
Avoid unrelated cleanup. Keep existing invocation policy unless the change explicitly proposes a new one.

For a security-sensitive issue, use the private process in [SECURITY.md](SECURITY.md). Contributions are
made under the [MIT license](LICENSE). Submit only work you have the right to contribute.
