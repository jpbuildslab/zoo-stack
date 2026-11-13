# Maintaining Zoo

- Author the entrypoint in [skills/zoo](skills/zoo/SKILL.md) and optional methods in the other `skills/` directories. Every package must work independently of this checkout and keep local links within its own directory. Keep host details in the entrypoint's host reference and the probe procedure in [docs/host-probe.md](docs/host-probe.md).
- Keep product definitions in the receiving repository. Generic skills describe what to discover without private paths, product rules, model selections, credentials or runtime defaults. Follow the [repository guidance interface](docs/repository-guidance.md).
- Keep [probe/sample.ts](probe/sample.ts) synthetic and dependency-free. For probe changes, reconcile the documented expectations with the exact source and identify which observations need a rerun.
- For package changes, check skill metadata, relative links, and the candidate file list. Review the exact files for private material and retain applicable notices for any copied material. Report static checks and actual host observations separately.
- Write a plain-language commit subject that names what changed. Add a short body when the reason or the checks would help someone understand the change later. Mention only checks that actually ran.
- Preserve unrelated work. Keep private provenance, held-out grading material, and raw run evidence outside the repository. Export only the selected fixture for candidate work. Keep the known controls and reference with the evaluator.
