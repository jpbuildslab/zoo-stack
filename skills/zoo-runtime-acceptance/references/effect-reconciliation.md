# Effect reconciliation

Before calling an external service, establish the operation, destination/account, credential
mechanism, expected effects, repetition limits and reconciliation path within the user's scope.
Bound unrelated background work. Prefer provider-off setup when supported; authentication can itself
send messages or create external effects and needs the applicable scope.

Preserve the original operation and attempt identities. After an attempt, distinguish:

- **Definite rejection:** evidence establishes the effect did not occur; retry only under the
  authorized policy after addressing its cause.
- **Accepted:** retain the returned identity and check the next relevant state. Do not create a
  duplicate operation merely because downstream observation is delayed.
- **Uncertain:** stop dependent writes, retain evidence and query/reconcile the original outcome.
  Do not invent a new key or interpret an unavailable result as proof of absence.
- **Partial:** preserve the completed portion and recover the remaining part through the existing
  contract, without repeating already-completed effects.

Some systems support an explicit idempotent resume under the original key. That is a separate action
from a result read and must follow the product's authority, eligibility and outcome contract. Do not
turn a check-status control into an implicit resubmission.

Record what the evidence actually establishes. Provider acceptance, recipient delivery, settlement,
and human confirmation may be different states. Report unresolved results and retained resources
without treating a retry budget or a green local test as permission for another external action.
