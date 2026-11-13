---
name: zoo-runtime-acceptance
description: Plan or perform scoped verification of running applications, browser journeys, persistence, external effects and cleanup. Use when source checks cannot prove the requested behavior; ordinary code-only checks do not need this method.
---

# Zoo Runtime Acceptance

Match the runtime evidence to the claim. Read the repository's normal check commands, resource
ownership rules and effect policy. A planning request produces an execution plan; it does not start
processes or connect to a database. Reuse the task's established authorization, and identify any
genuinely missing target or effect scope before the dependent action.

## Select the relevant reference

| Boundary | Reference |
| --- | --- |
| Source/build identity, processes, ports, databases and cleanup | [Runtime identity and cleanup](references/runtime-identity-and-cleanup.md) |
| Browser interactions, responsive states and visual review | [Browser evidence](references/browser-evidence.md) |
| External services, partial results, uncertain effects and retries | [Effect reconciliation](references/effect-reconciliation.md) |

Read only the references needed for the active check. Keep application-specific commands, schemas,
providers, credentials, roles and destinations in the repository's own runtime guidance.

## Verify the actual boundary

1. Name the changed entrypoint, the claim and the decisive assertion. Distinguish source checks,
   mocked behavior, persisted state, a mounted interaction and externally observed results.
2. Identify the exact candidate and executable artifacts, assigned resources, synthetic or otherwise
   authorized inputs, allowed effects and cleanup owner. A worktree alone does not isolate processes,
   ports, databases or services.
3. Prefer focused iteration on owned local resources with unrelated effects disabled. Do not
   recreate an environment after every harmless locator or wording change.
4. Use a frozen disposable gate when the risk or requested acceptance needs an exact-source proof.
   Check the relevant failure/recovery path as well as success. Reuse unaffected prior evidence and
   state why it applies.
5. Reconcile results against the authoritative records or service observation. A wrapper exit or
   screenshot does not establish an effect it never checked.
6. Clean up only the owned disposable resources and return the evidence, retained resources and
   remaining limits. An uncertain effect or failed cleanup remains explicit.

Shared environments and live providers are separate scopes from local source or runtime access.
Existing credentials, a prior successful run or a tool's availability does not authorize their use.
Do not infer host-enforced isolation from a role description or instruction alone.
