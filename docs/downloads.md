# Download a release

Use a [versioned GitHub release](https://github.com/jpbuildslab/zoo-stack/releases) so you know which
instructions and checks you're installing. The first alpha is `v0.1.0-alpha.1`.

## Use Git for development and checks

```sh
git clone --branch v0.1.0-alpha.1 --depth 1 https://github.com/jpbuildslab/zoo-stack.git
```

The repository's package checker and fixture exporter use Git metadata. Use the tagged clone for
[contributor checks](../CONTRIBUTING.md) and [evaluation commands](../evals/README.md).

## Use archives for inspection or installation

The release provides:

- `zoo-suite-v0.1.0-alpha.1.tar.gz`: all five whole skill packages, plus the root license and notice.
- `zoo-source-v0.1.0-alpha.1.tar.gz`: the tracked source tree, without Git history or installed dependencies.
- `manifest.json`: the source commit/tree and archive payload paths, digests, sizes and modes.
- `SHA256SUMS`: SHA-256 values for the two named archives and `manifest.json`.

Download all four files from the same release. In that download directory on macOS:

```sh
shasum -a 256 -c SHA256SUMS
```

Each named file should report `OK`. On systems with GNU coreutils, use `sha256sum -c SHA256SUMS`.
If a name, size or digest differs, stop and check the selected release and download before installing.
The checksums describe these named assets, not GitHub's automatically generated source downloads.

Extract into an unused directory. Each extracted `skills/<name>` folder is already a staged package;
start at step 2 of the [installation guide](local-skill.md) to check its destination, preserve existing
copies and confirm discovery in a fresh session. Keep each skill's license with it.
The suite doesn't include your product's API rules, visual references or runtime settings; those stay
in your own repository.
