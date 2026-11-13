# Check the fixtures

Use a Git clone for these repository checks. Release source archives don't contain `.git`, which
the package checker, fixture exporter and mounted browser control use. The archives remain suitable
for inspecting source and installing whole skill directories.

Run `python3 evals/check-static.py` and `python3 evals/test_package_checks.py` for package frontmatter and companion invocation policy,
contained inline Markdown references and known broken package controls. These checks include pending new Markdown
files; they do not execute product fixtures or prove model behavior. Use `check-local-skill.py` with
an explicit `--skill` for fresh catalog and lifecycle observations, as described in
[local staging](../docs/local-skill.md).

The [acceptance cases](cases/README.md) define the candidate tasks and their evidence. The [request notices](fixtures/first-tasks/README.md) and [service request desk](fixtures/service-requests/README.md) are starting applications. The reference and independent assertions stay with the evaluator.

Export a fixture by exact commit to a new path outside this checkout. The export contains the fixture's tracked files and emits a SHA-256 manifest. Store the manifest with the run evidence outside the export.

```sh
python3 evals/export-fixture.py <full-commit> service-requests <new-directory>
```

Use `first-tasks` for the notices fixture. The export contains no Git history, reference code, assertions, or case directory. Host file permissions and accessible tools determine whether an evaluator is isolated. Keep model runs pending until their actual access and usage scope are established.

## Deterministic controls

Install the locked dependencies in the service-request fixture and use its local PostgreSQL and browser prerequisites. Run from the Zoo root:

```sh
node --test evals/fixtures/first-tasks/notices.test.ts
evals/fixtures/service-requests/node_modules/.bin/tsc --project evals/tsconfig.json
node --test evals/assertions/check-rescheduling.ts
node --test evals/assertions/check-rescheduling-browser.ts
```

The reference check uses PostgreSQL and an owned loopback listener. The browser check exports the fixture from the current committed HEAD, then typechecks and builds the reference page in a disposable copy. Uncommitted fixture edits are not part of that export. It discards one committed confirmation response, fails one recovery attempt, and fails the refresh after recovery. It checks that the browser retains the original operation key and that PostgreSQL records one change.

For the review controls, make two exports of the same service-request baseline. Apply the [approval regression](variants/approval-without-revision.patch) to one export and leave the other clean. Run `node evals/assertions/check-approval.ts <export>` on each. The clean export must pass. The broken export must fail on its stored revision. For the notice controls, use the [handoff case inputs](cases/handoffs.md) and run `node evals/assertions/check-notices.ts <export>` against trusted exports.

These commands execute source from the named export. Use them on the known local controls until a host can enforce the intended boundary for candidate code. Save the exact starting files, checks, and outcomes before removing any owned run directory.

## Separate local execution

The macOS-specific [local Codex runner](run-local-demo.py) preflights an exact CLI command profile before invoking a model. Omit `--prompt` for preflight only. It checks fixture and skill access, denies a sibling canary and a symlink to it, and tests live TCP, Unix socket, and process signal denial. Pass `--matched-catalog` for a matched comparison to disable ambient skill entries after rendering a local prompt preview. The CLI handles model authentication outside the shell profile. These observations apply to the CLI lane and its tested paths.

Use the [isolated service runner](run-isolated-service.py) for sealed service output. Build its local tool image from the [pinned Playwright base and fixture lockfiles](isolated/Dockerfile), using a disposable build context containing only those two package files. Pass the resulting exact image ID and the nominated local Docker context and Unix endpoint. The runtime uses separate app, PostgreSQL, and observer containers. The app and observer share only the owned PostgreSQL loopback namespace. The app receives its own database role and a read-only copy of its source, with no Docker socket or evaluator mounts. The observer controls browser fault delivery and checks PostgreSQL directly.

Each new runtime manifest records the exact candidate files and digest, committed runner revision, sealed checker file hashes, variant flags, and image and runtime configuration. Its terminal result binds back to that manifest. Keep historical outcomes as recorded and link any corrected artifact or recheck separately.

The [reference controls](reference/rescheduling.ts) remain evaluator-side. Keep them, case mappings, and model logs outside candidate access. Record the effective limits of the host and any action that fell outside the requested scope.

The [repository check](../.github/workflows/check.yml) runs the entrypoint, local links, and dependency-free fixture checks. PostgreSQL, browser, and model evaluation remain separate.
