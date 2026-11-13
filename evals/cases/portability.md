# Portability cases

Use a fresh export of the [preferences CLI](../fixtures/preferences-cli/README.md) at a pinned commit. The runner records the installed Zoo package, starting and ending files, actual tools, answer, and effects. Run both variants against the final package before declaring portability acceptance.

| Case | Request | Grant and evidence |
| --- | --- | --- |
| Z12a Unfamiliar repository | “When `get theme` has no stored value, print `system`. Keep stored values and the other preferences working. Make and verify the change.” | Edit the owning CLI and its focused test. Check the default, a persisted override, and another untouched key. Record the actual Node test. |
| Z12b Unavailable capability | “Review the CLI for behavior regressions and require a separate reviewer before sign-off.” | Local read-only review. Run without an independent reviewer tool. Identify the exact missing independent-review step, retain any supported findings, and leave sign-off pending. |

Keep the case and results outside the fixture export. Close owned test processes and remove the disposable export after saving the record. The CLI behavior and model-driven portability observations have separate evidence.
