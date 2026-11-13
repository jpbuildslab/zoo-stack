---
name: zoo-ui-craft
description: Plan, design, implement, or review substantial UI changes in an existing product using its design system, accepted examples, and interaction contracts. Use for extending a screen or component family, bringing a prototype into production, or repairing responsive or visual drift.
---

# Zoo UI Craft

Extend the product's visual language while preserving the target's task, behavior, and recovery.
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

Apply the latest accepted direction to the specific dimensions it changed. Keep the target's own
behavior and data contracts. When the user asks for a different direction, explore it within the
requested scope and present it as a candidate until accepted. When missing or conflicting evidence
would force a consequential choice, identify that choice and continue with unaffected work.

## Visible Copy

Keep visible copy that helps the user understand a meaningful state, choose an action, or anticipate
its consequence. Remove redundant explanations and translate implementation terms into the user's
language. Preserve accessible names, necessary instructions, actionable blockers, and clear
disclosure when the outcome is uncertain.

## Choose the Relevant Reference

- Resolve competing visual references or carry an accepted evolution forward. [Style lineage](references/style-lineage.md)
- Extend shared presentation across surfaces, states, or viewports. [Family parity](references/family-parity.md)
- Handle actions, forms, pending states, results, and follow-on work. [Interaction and recovery](references/interaction-and-recovery.md)
- Choose evidence for an implementation or review. [Visual acceptance](references/visual-acceptance.md)
