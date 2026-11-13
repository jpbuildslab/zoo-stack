# Continue or pause work

Start with the user's current scope and the latest durable plan or checkpoint. Reconcile it against the current candidate, relevant repository state, retained evidence, and authoritative records of any effects. Check that the scope, target, and writer still match. If a graceful handoff is missing, use the last recorded state and inspect what changed since it was written.

Preserve completed work and usable evidence. If a write or external action has an uncertain outcome, recover using the recorded identity before attempting a retry. If the identity or result cannot be established, preserve the state and identify which dependent step must wait.

For a status request, return the state and next action. When asked to continue, do the remaining authorized work and verify the result. When asked to pause or narrow scope, stop starting work outside the new scope and account for owned operations already in flight. Preserve the candidate and resources in their current locations unless the user authorizes a move or cleanup.

Use the existing evidence or planning location for a handoff when writes there are authorized. Record the objective, candidate and resource identities, active scope, completed and remaining work, check results, and unresolved effects. A fresh session should be able to locate the evidence without the original chat. Exclude secrets and rely on the current grant for new action.
