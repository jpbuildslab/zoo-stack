# Your first task with Zoo

Start with one part of a repository you already want to understand. Pick a button, command or function
you can name. You don't need to give the agent every skill or an elaborate process.

## Read the current behavior

After [installing Zoo](local-skill.md), open a fresh chat in that project. Replace the example with
your actual entrypoint:

```text
$zoo Trace what happens when this form saves a record. Read the owning code and
the relevant repository instructions. Explain the write, its failure cases and
the caller's recovery. Cite the source and leave files unchanged.
```

The answer should identify the real owner of the behavior and distinguish what source establishes
from what would need a running app. If the agent cannot locate the entrypoint, provide its file or
route. A useful investigation can finish without running anything.

## Plan one change

Choose a specific problem from that investigation:

```text
$zoo Plan how to show the saved result after a lost response. Preserve the
existing operation identity. Name the affected files and the check that would
prove we don't submit twice. Return a plan only.
```

For API behavior, explicitly select an installed `zoo-api-craft`. For a screen's interaction or
presentation, select `zoo-ui-craft`. Let the repository define roles, state transitions, components
and accepted examples. A companion adds a method, not permission to start implementation.

## Build when the scope is agreed

When you're ready, name the slice, checkout and checks you authorize:

```text
$zoo Implement the approved recovery slice in this worktree. Preserve unrelated
changes and run the agreed local checks. Keep external services off and stop if
the fix needs a different product decision or resources outside this scope.
```

Substantial changes can use the Production Loop for ownership and independent review. Running app
or database proof can use Runtime Acceptance. A small isolated change should still use a short path.

## Read the finish

Expect a concrete change, evidence for the behavior that changed, and any remaining uncertainty.
A passing component test doesn't establish a database effect it substituted. An independent review
is a separate observation, not a replacement for the builder's checks.

If you pause or move to another chat, keep the source identity, completed work, useful evidence and
remaining scope in a short handoff. The next chat should compare it with the actual checkout before
continuing. Your product definitions stay in the repo throughout.
