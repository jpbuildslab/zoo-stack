# Scope and continuation

Start continuation from the current request, source and durable plan. Check the candidate, relevant
dirty paths, completed proof, active resources and any uncertain operation before starting work.
A checkpoint can be stale; inspect the changes that could affect the next decision.

Classify a discovery by its consequence for the current outcome:

- A required correction belongs in the slice only when its paths, decisions and effects are within
  the existing authorization.
- A useful observation or debt item can be recorded with its impact and revisit trigger.
- Unrelated work stays outside the slice.

Keep small tasks small. A related keyword, a historical failure or a possible improvement does not
make a broad refactor necessary. Expand the plan when a reproduced dependency or contract requires it.

On a pause or narrowed request, stop starting work outside the new scope. Preserve completed changes
and reconcile in-flight owned operations enough to report their state safely. Do not reset, relocate
or clean up another writer's work. An unknown write must be resolved through its original identity
before an authorized retry, not replaced with a new attempt.

When the same failure repeats, identify the unchanged premise and seek evidence that distinguishes
causes. More retries without a new reason do not improve confidence. If access or tooling is missing,
report the exact missing proof and continue independent work already in scope; do not search or repair
unassigned environments.
