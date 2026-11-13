# Release Zoo

Zoo is an MIT-licensed alpha maintained by JP. The first public history begins with a reviewed source
snapshot. Earlier development commits and private evidence remain outside the public repository.

For a later release:

1. Select the exact packages and source commit. Run package checks and the affected fixture tests.
   Verify a fresh installation and record the host. Separate catalog results from model and runtime proof.
2. Review the files and any new history for private material and required notices. Keep package contents
   self-contained. Include the [license](../LICENSE), [notice](../NOTICE) and current reporting instructions.
3. Run independent tasks that exercise changed guidance. Keep failures, substitutions and unsupported
   paths visible. A small successful example is not a general performance claim.
4. Build archives and a SHA-256 manifest from the selected Git tree. Check every path, digest, size and
   executable mode. Don't package installed dependencies, browser binaries, credentials or private runs.
5. Verify CI on the exact candidate. Publish an immutable tag and release assets, then check the remote
   source, download digests and installation. Don't move a published tag to hide a correction.

Use [GitHub Releases](https://github.com/jpbuildslab/zoo-stack/releases) for versioned downloads and
[Issues](https://github.com/jpbuildslab/zoo-stack/issues) for ordinary reports. Sensitive issues use
[private reporting](../SECURITY.md). Keep support claims tied to the evidence in
[compatibility](compatibility.md) and [results](results.md).

Independent beta is still open for the alpha. Useful feedback comes from a real task in a repository
someone maintains, with the outcome, intervention and missing checks recorded. Don't label assisted
runs as independent adoption or turn publication into a claim of production readiness.
