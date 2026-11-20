# Focused craft cases

Pin the fixture, package contents, checker, trial prompt, and write scope before comparisons. Use a
fresh export per trial. Keep evaluator assertions, known controls, and run evidence outside the export.
Record first-pass and repair outcomes independently. Preserve measured elapsed time and tool use as
observations of these tasks.

| Case | Skill conditions | Checks |
| --- | --- | --- |
| Routine notice | Repository guidance alone, published core, candidate core | Use [Z03](README.md#first-task-cases). Run the focused test and the [independent notice check](../assertions/check-notices.ts). Compare the full diff and note avoidable work. |
| Selected approval review | Candidate core with broken and clean controls | Use [Z05](service-requests.md#z05-review-a-selected-approval-diff). Keep the candidate read-only. Require the broken variant's revision consequence and no unsupported finding for the clean control. |
| Dispatch boundary | Published and candidate API craft directly | Repair the two implementations using the [dispatch contract](../fixtures/api-boundaries/README.md). Require the [independent checks](../assertions/check-api-boundaries.ts) for valid, malformed, rejection, timeout, cutoff and unresolved cases. |
| Request queue | Published and candidate core plus UI craft | Implement the live queue task below. Render via the owned [observer](../isolated/ui-craft-observer.mjs). |
| Reading transfer | Candidate UI craft directly | Improve the editorial preview's reading flow using the same visual vocabulary. Preserve the title, headings and note text. Render separately from the queue. |

## Request queue

> Update the live Request Desk queue for a coordinator scanning a busy workspace. Use UI.md and the
> existing queue and reading previews for visual context. Make the workspace, title, scheduled UTC
> time, and status easy to scan at desktop and phone widths. Add a labeled title search (a search
> input) with a clear control and explicit empty feedback. Keep the selected scope, existing
> review dialog, permission rules, keyboard flow, and approval request behavior. After confirming
> Maple Room, the operator should be able to locate its approved state while the filter is active.
> Keep changes to the live client and its styles.

The observer starts with 12 Cedar requests and two Birch controls in a fresh database. It checks
workspace projection, title filtering, no-match recovery, keyboard confirmation, persisted status and
revision, and a Cedar viewer's read-only queue. Inspect its desktop, intermediate, and phone captures
with the reference. Assess action hierarchy, long content, status and error clarity, keyboard and
focus, contrast, overflow, zoom and relevant motion. Keep qualitative findings and owner judgment
separate from assertion results. A reading preview or screenshot does not establish a database effect.

## Before the batch

Prove the independent API checks distinguish the broken starting fixture and a corrected control.
Exercise the approved queue action and the review regression with a stored revision check. Capture
the two synthetic references through the observer's `reference` mode before the model trials.
For actual queue and reading candidates use the corresponding `queue` and `reading` modes.

## Visual direction and transfer follow-up

When the starting design is open to change, render the proposed direction before editing the
working flow. Record the owner's decision and the exact reference viewport and state. Give the
implementer the relevant images and ask for observations that explain the choices made. Check the
working queue, confirmation and recovered result through the independent observer. Review normal
viewport images and full-page captures where they clarify content and overflow.

For transfer, provide the selected queue reference and the existing operations note. Keep the
note's title, headings, prose and reading order. Carry over applicable type and color decisions
while giving the note its own measure and spacing. Render and inspect the result separately.
