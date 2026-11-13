# Mutation integrity

## Commit boundary and side effects

- Identify the authoritative precondition, allowed transition, and resulting proof. Bind the write to the resolved scope and recheck mutable conditions at the point of commit. Commit records that must agree atomically and verify how competing writers are arbitrated. Choose a mechanism that matches the invariant, such as a conditional update for a stale revision or a uniqueness constraint for a single claim.
- When committed local state requires an external effect, establish how durable responsibility survives a crash or timeout. Trace who claims the work, executes it, records attempts and results, and reconciles unknown outcomes. Avoid holding a database transaction open across an external call or relying on its rollback to undo the external effect.
- Preserve independently successful results when a later step fails. Verify what a caller can read after the failure and which unfinished steps can resume without repeating completed work.

## Replay and concurrency

- For a retriable mutation, establish a stable operation key or natural identity, its scope, and the durable boundary that arbitrates simultaneous attempts. Verify what happens if the same identity is submitted with different inputs. Check the caller's authority to access the original result on replay.
- Trace interruption around commit, external acceptance, and result recording when those points exist. Check which component can establish that an attempt did or did not take effect. Retain the operation identity across transport retries and reconcile uncertain attempts before deciding whether to repeat them.

## Caller recovery

Use the repository's error and response contract to give the caller a next action for each relevant outcome.

- **Definitive rejection or stale state.** When the request is proven to have had no effect, preserve the inputs for correction. For a stale precondition, direct the caller to read the latest state and review the action again before resubmitting.
- **Known operation.** Return or point to the authorized result or current operation state. Distinguish accepted work from completed work when processing is asynchronous. If a key belongs to different inputs, surface the conflict without applying a new mutation.
- **Uncertain outcome.** Preserve the original attempt identity and direct the caller to status, reconciliation, or an established escalation path. A refresh of the affected record alone may leave the original effect unresolved.
- **Partial outcome.** Report confirmed successes, failures, and any remaining uncertainty. Identify the bounded recovery step for unfinished work.
