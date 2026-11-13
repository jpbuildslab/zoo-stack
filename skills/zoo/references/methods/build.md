# Build an approved change

Start from the requested behavior, current source, and the work the repository already owns. Identify the normal caller or operator path, the owner of each changed invariant, and a check that can distinguish the old behavior from the requested one.

For a routine fix, read the owning file and the nearest relevant check. Make the scoped edit and run that check. Add further planning or review when a repository requirement, a user request, or a material risk calls for it.

For a change that spans several layers, trace the caller through the affected owner before editing. Preserve existing callers, data, and authority where the request leaves them in place. For mutations, check who can act, which resource the effect applies to, what can change between review and confirmation, and how a caller can recover when the result is uncertain. Use the existing storage and state boundaries when they support the required behavior.

Use [verification selection](verify.md) when proof depends on a runtime, persistent effect, or several consumers. Check the normal entry point and the most consequential rejection or recovery case. Keep an unmet proof requirement visible when access or tooling is missing.

Finish with the change, the evidence that applies, and the smallest remaining decision or check. If the user pauses or the outcome of an operation is unclear, preserve the current candidate and operation identity so work can continue safely.
