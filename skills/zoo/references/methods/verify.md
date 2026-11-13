# Choose verification

Write down the behavior or effect that needs evidence and the changed entry point. Use the repository's existing tests and runbooks. Choose the smallest set that reaches the actual affected boundary and can distinguish the result from a meaningful failure.

| Claim | Evidence to look for |
| --- | --- |
| A source rule or contract changed | Focused static check, caller inspection, or a test at the boundary |
| Data was stored once or stayed unchanged | A check against the owned database and resulting records |
| An operator can complete a flow | The relevant interaction on the mounted application |
| A request recovered after an uncertain response | The authoritative result for the original operation identity |

Reuse prior evidence when the candidate, relevant dependencies, environment, and assertion still support the claim. State the relationship. Before running a check that can mutate resources, establish the authorized target and expected effects. If the target or authority is uncertain, keep that check pending and continue any safe checks that still help.

Record what ran, which candidate and environment it covered, and the observed outcome. Identify mocks, skipped work, and required evidence still missing. A wrapper's green exit covers only the assertions that actually ran.
