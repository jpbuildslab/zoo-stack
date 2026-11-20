# Install Zoo in a project

Copy the whole skill directory into `.agents/skills/` in the project where you'll use it. Keep the
entrypoint, references, metadata where present, and license together. The verified catalog path is
Codex CLI and App Server on macOS. See [host compatibility](compatibility.md) for observed coverage.

## First installation

The [README quickstart](../README.md#get-started) starts in your project's root and clones the pinned
release alongside it. If you already have the release, follow the copy steps below.

## Install from an existing clone or archive

For a clone, check the selected source before copying. `git -C /path/to/zoo-stack rev-parse HEAD`
reports the current commit, and `git -C /path/to/zoo-stack status --short` shows local changes. Use a
clean copy of the release or commit you intend to install.

For an archive, [verify and extract the suite](downloads.md#use-archives-for-inspection-or-installation).
The extracted directory containing `skills/` is the source. The archive copy and direct-file route
work without Git metadata.

From your project root, set `zoo_source` to the clone root or the extracted directory containing
`skills/`. Replace the example path before running this block.

```sh
zoo_source="/path/to/zoo-stack"
zoo_skill="zoo"
test -f "$zoo_source/skills/$zoo_skill/SKILL.md" &&
test ! -L .agents &&
test ! -L .agents/skills &&
mkdir -p .agents/skills &&
test ! -e ".agents/skills/$zoo_skill" &&
test ! -L ".agents/skills/$zoo_skill" &&
cp -R "$zoo_source/skills/$zoo_skill" ".agents/skills/$zoo_skill"
```

The guards refuse an existing destination and linked parent directories. Inspect the destination if
the copy stops. Use the [update procedure](#stage-and-update-an-owned-installation) when replacing a
package you own.

Open a fresh Codex CLI session from your project root. Use `$` to select the skill. Check the path
when the host shows it. If the catalog offers two entries with the same name, identify the intended
copy before proceeding. Follow [your first task](first-task.md) for a source-only example.

## Add a companion

Use the copy block above with `zoo_skill` set to one of these package names. Use the same reviewed
release when combining methods.

| Set `zoo_skill` to | Whole source directory | Project destination |
| --- | --- | --- |
| `zoo-production-loop` | `skills/zoo-production-loop` | `.agents/skills/zoo-production-loop` |
| `zoo-api-craft` | `skills/zoo-api-craft` | `.agents/skills/zoo-api-craft` |
| `zoo-ui-craft` | `skills/zoo-ui-craft` | `.agents/skills/zoo-ui-craft` |
| `zoo-runtime-acceptance` | `skills/zoo-runtime-acceptance` | `.agents/skills/zoo-runtime-acceptance` |

If adding several packages, check every destination before starting. Open a fresh session and select
each method you want to use explicitly. You can use a companion by itself or combine it with the
core in one workflow. The receiving repo defines the product and its checks.

## Use a skill without installing it

From a chat in your project, ask Codex to read the full path to `skills/zoo/SKILL.md` in the clone or
extracted suite. Keep the whole source package accessible so Codex can follow its references. Name
the task and scope in the same request. Evidence for this route is the observed file read. Installed
catalog discovery and picker attachment each require their own check.

## Record what you installed

Keep an installation receipt in your existing project tooling notes, outside `.agents/skills/`.
Record the release or full source commit, package name, destination, and package identity. Use the
package file list and digests from the release manifest or the [local check](#rehearse-the-lifecycle).
Copied packages have no intrinsic version field. If you adapt a package locally, record the
adaptation and preserve it before replacement.

## Stage and update an owned installation

For maintainer work, stage the whole package from an exact commit outside the project's catalog.
From a Zoo clone, set `zoo_commit` to the full commit ID and `zoo_skill` to the package name. Set
`zoo_stage` to a new directory on the same filesystem as the installation so the validated package
can be moved into place.

```sh
git archive --output="$zoo_stage/package.tar" "$zoo_commit" "skills/$zoo_skill" &&
tar -xf "$zoo_stage/package.tar" -C "$zoo_stage"
```

Compare the staged file list and digests with the exact commit. Check the discovery name, metadata,
contained references, and license. Check the destination and fresh catalog for ownership and name
collisions before moving anything.

Finish or pause tasks that use the old copy. Save the existing owned directory outside the catalog
and record its location. Move the complete staged copy to the same project destination. Verify its
file list and digests, check the path in a fresh catalog, and record the new receipt. Resume paused
work in a fresh session.

If interrupted, inspect both the destination and staged copies before retrying. If the destination
is empty, restore the saved prior directory. To roll back an activated update, finish or pause its
tasks, preserve the current copy outside the catalog, and restore the prior directory. Verify the
restored digests and fresh catalog path. For removal, take only the owned package out of the catalog
and check that a fresh session no longer offers that path.

## Rehearse the lifecycle

From a Zoo Git clone, run the [disposable App Server check](../evals/check-local-skill.py) with two
full commit IDs and the selected skill. This check requires Python and the Codex CLI.

```sh
python3 evals/check-local-skill.py <prior-full-commit> <candidate-full-commit> --skill zoo-ui-craft
```

The check records the package manifest, catalog paths, collisions, interrupted activation, update,
rollback, removal, and whether the package bytes differ. Passing the same commit twice rehearses
same-version replacement. To verify model loading, record the selection and entrypoint read in the
session where you use it.
