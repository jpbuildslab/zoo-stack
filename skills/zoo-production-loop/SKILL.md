---
name: zoo-production-loop
description: Plan and deliver substantial repository changes with one accountable writer, coherent slices, proportionate independent review, and durable handoffs. Use for multi-file or consequential work; skip the loop for tiny isolated tasks.
---

# Zoo Production Loop

Use the repository's current instructions and the user's requested outcome to choose the next
coherent slice. A planning or review request produces a plan or findings, not implementation.
This method adds no authority to edit, commit, delegate, contact another chat or operate a service.
Honor authorization already established for the actual task without asking again at each step.

## Establish the work

Identify the assigned checkout, baseline and relevant dirty work; the outcome; the affected owners;
the allowed changes and effects; and the evidence that would establish completion. Read only the
repository guidance needed to settle those decisions. Keep product rules in their existing owners.

The current builder remains the accountable writer while scope and ownership are coherent.
Use one writer on shared contracts, schemas and integration surfaces. Independent work needs
disjoint ownership, including generated files and runtime resources, not merely different prompts.

## Deliver a slice

1. Trace the user-facing path and the code that owns its behavior. Separate required work from
   optional improvements and unresolved product decisions.
2. Propose or implement the smallest coherent slice within the current request. Keep the existing
   flow usable where required; do not introduce temporary architecture merely to produce more steps.
3. Run the narrow checks that can distinguish the intended behavior from a meaningful failure.
   State mocked dependencies and missing proof. A whole-repository run is not a substitute for a
   decisive test at the affected boundary.
4. For material risk or a repository-required review, freeze the candidate and use independent
   review when available and authorized. Follow [review and handoff](references/review-and-handoff.md).
   Do not create a panel or a new top-level chat for an ordinary choice.
5. Assess findings against current source, make justified in-scope corrections, and verify affected
   behavior. Reuse evidence whose code, inputs, dependencies and assertions still apply.
6. Return the candidate, results, remaining work and next authorized action. Make a coherent commit
   when Git preservation is part of the task; never include unrelated changes.

Use [scope and continuation](references/scope-and-continuation.md) for pauses, takeover, repeated
failure or a task whose boundaries change. Keep established repository checkpoints rather than
creating a parallel workflow database.

## Compose only what is needed

If a general entrypoint selected this method, run one workflow. Add the relevant API or UI craft
method for its own boundary and runtime guidance only when processes, browsers, persistence or
external effects materially enter verification. If a companion is unavailable, use the repository's
own guidance and identify the missing capability; do not silently install or replace it.

Stop the affected action for an unresolved authority, ownership or product decision, an ambiguous
effect, or repeated failure without new causal evidence. Continue independent authorized work when
it remains useful. Context age or a completed slice alone does not require a new builder.
