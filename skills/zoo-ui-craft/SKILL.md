---
name: zoo-ui-craft
description: Plan, design, implement, or review substantial UI changes in an existing product using its design system, accepted examples, and interaction contracts. Use for extending a screen or component family, bringing a prototype into production, or repairing responsive or visual drift.
---

# Zoo UI Craft

Develop the target's visual direction within the product's task, behavior, and recovery contracts.
Match the deliverable to the request. Plans and reviews can use source and preview evidence without
changing product code. Implementation and runtime actions follow the authority granted for the task.

## Find the Relevant Product Context

Start with the receiving repository's own instructions for the affected area. Follow its entry
points to the current product decisions, design tokens, components, pattern guidance, and closest
accepted examples. Read the target's code and relevant tests to identify who owns data, permissions,
actions, recovery, and navigation. Use history when it resolves a question about the current
direction.

Identify the user, task, and relevant family of surfaces. For a substantial comparison, record the
reference, the presentation decisions to carry forward, the target-specific behavior, and the states
or widths that could change the decision. Use the repository's existing formats when they serve that
purpose.

Use accepted references for the dimensions they govern. Treat the current implementation as evidence
of existing behavior and presentation. Establish which choices have actually been accepted. For a
substantial visual change, establish a direction with representative content and states before
applying it to the working flow. Do this when new capabilities change the hierarchy, navigation,
or working surfaces, even if the visual vocabulary is already accepted. Resolve the composition
of the affected family before extending individual treatments. Keep a small fix within its
requested surface. Inspect rendered images when making visual judgments. If you cannot view them,
leave visual fit pending.

## Visible Copy

Start with precise labels and actions. Read the whole rendered state, including its title, controls,
values, notices, and available actions, then test whether removing a supporting line costs the user
information needed to choose, anticipate a consequence, or recover. Remove the line when the same
informed choice and recovery remain clear. Put a non-obvious consequence at the decision it informs
and translate implementation terms into the user's language. Preserve accessible names, input formats,
scope and timing, actionable blockers, and clear disclosure when the outcome is uncertain. Check the
copy at its working size, including long titles and status or date labels viewed out of context.

## Choose the Relevant Reference

- Resolve competing visual references or carry an accepted evolution forward. [Style lineage](references/style-lineage.md)
- Extend shared presentation across surfaces, states, or viewports. [Family parity](references/family-parity.md)
- Handle actions, forms, pending states, results, and follow-on work. [Interaction and recovery](references/interaction-and-recovery.md)
- Choose evidence for an implementation or review. [Visual acceptance](references/visual-acceptance.md)
