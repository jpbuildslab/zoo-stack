# Interaction and Recovery

## Follow the Action Owner

Trace an action through the state and command owners in the repository. Keep permissions,
eligibility, record identity, and recovery with the existing owners. Presentation can render the
relevant state and invoke the existing command. Apply review or confirmation where the product
requires it.

When changing who owns a view state, derive display values from that owner when possible. Check that
selection, review identity, and confirmed results stay consistent when sibling components or responsive
layouts render the same work.

When navigation changes, establish which region scrolls and what preserves the working context.
Trace selection, focus and return across opening a record, closing it, and continuing from a result.
Check the applicable Back and reload paths and what happens when the original row or control disappears.

Trace the relevant journey through entry, validation, pending, result, and any follow-on action,
including return, cancellation, or recovery paths that apply. Follow the accepted navigation and
surface conventions when the user needs to continue or correct something.

## Validation and Recovery

- Validate at the progression boundary. Associate an actionable explanation with its control. Use
  the product's focus and scroll behavior to help users find and fix errors.
- Preserve valid input, selections, and review context through recoverable failure, back or edit
  navigation, and responsive layout changes. Respect explicit discard and the product's identity or
  authority boundaries.
- Show pending feedback near the initiating control or owning surface and use the existing
  duplicate-action protection.
- Show success, details, and next destinations from authoritative results. For partial success,
  explain what completed and what remains. For an uncertain outcome, preserve the relevant identity
  and offer the product's reconciliation path. Offer retry only when the outcome and contract
  support safe repetition.
- Check that expected continuations are reachable, eligible on the returned facts, and explain
  blockers where users need them. A failed or cancelled follow-on should preserve earlier confirmed
  results.
- Keep correction and reconciliation reachable from the owning surface. Verify keyboard access,
  status announcements, and appropriate focus after errors, completion, and close.
