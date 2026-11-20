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

## Focused craft cases

Follow the [task contracts](cases/craft.md). Export `api-boundaries` for the standalone dispatch
case and run `node evals/assertions/check-api-boundaries.ts /path/to/export` from the evaluator
checkout. Keep assertions and corrected controls outside candidate access.

For service requests, add `--baseline --ui-craft reference` to the isolated observer command
to capture the synthetic queue and reading references. Use `--baseline --ui-craft queue` for the
live queue task or `--baseline --ui-craft reading` for the editorial task. Only the observer gets
the capture directory. Source, dependency and checker identities are recorded in the run manifest.
Use `--baseline --ui-craft queue-recovery` to check a recovery repair after a failed status read
or a committed approval with a lost response. The unchanged starting fixture is the comparison
input. Keep the first-pass result and the follow-up observer result under their respective checker
commits.

For the visual-direction and reading-transfer trials, the local Codex runner accepts repeatable
`--image /path/to/nominated.png` with `--prompt`. Attach only the specific rendered reference and
target images the task needs. Image attachments enter the model prompt while the shell retains
its existing scoped profile. Record the image digests and a specific observation that informed
the implementation. The evaluator's raw artifacts and grading stay outside the shell scope.

For an artifact implementing the scoped worklist correction, use `--baseline --ui-craft
queue-direction`. This lane checks scope and search together, the view’s keyboard and forced-color
states, finding an approved record after a view change, server-side role and workspace checks,
and recovery before and after commit. The ordinary fixture remains the starting point for the
earlier comparisons.

Use `--baseline --ui-craft queue-finish` with the refined worklist artifact to also verify row
rhythm, mobile metadata placement, loaded Inter, hit areas and row-action states. This lane
keeps the scoped approval and recovery assertions.

Use `--baseline --ui-craft queue-workflow` with the separately derived
[rich request fixture](cases/rich-request-workflow.md). The runner checks the fixture's schema
and seed against the committed evaluator inputs. The observer checks bounded queues, detail and
navigation, reviewed revisions, and recovery across reload against the same owned database. Use
`--baseline --ui-craft queue-workflow-transfer` on the read-only Approved view derivative. This
lane checks the original receipt and view state after Back and reload. Keep the starting fixture,
candidate source, and each variant's result distinct.

For the composed desk derivative, include the committed
[`composed-workflow-content.sql`](isolated/composed-workflow-content.sql) as
`runner/composed-content.sql` in the export. Use `queue-workflow-composed` and
`queue-workflow-composed-transfer` for the full workflow and Approved view respectively. The
content changes titles and purposes while retaining the same request IDs, timestamps, and
approval conditions. The runner verifies the content bytes alongside the schema and seed.

For the Cedar calendar derivative, add `--cedar-calendar` to a composed workflow lane. Build
its tool image from the existing Dockerfile and the [Cedar-only manifests](isolated/cedar-calendar/README.md).
The runner verifies both the candidate and image dependency inputs. Historical lanes still use
their original manifests.

For a Cedar reference that preserves the applied filters on Return from a selected request,
also pass `--cedar-filter-return` with `queue-workflow-composed`. This case opens a record,
applies an end date, and checks the resulting queue, focus, and Back entry. A pre-fix artifact
can serve as the control when it reaches the named Return assertion.

Add `--cedar-review-layout` alongside `--cedar-filter-return` to check the compact review
layout. It captures short and long requests at the same 1280 × 640 viewport, checks the
review action and independent detail scrolling, and checks that Apply remains visible at
320 × 620. The date dialog and the queue's sort control are exercised separately.

Add `--cedar-distant-navigation` to the compact review lane to open a row after scrolling.
The observer checks the visible detail heading and Return control, then verifies the original
row, focus and applied filter URL after Return or browser Back. The capture set includes both
sides of the split breakpoint, a short desktop window and the phone path.
