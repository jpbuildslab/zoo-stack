# Review and handoff

## Independent review

Give a reviewer the exact candidate and baseline, intended behavior, affected paths, relevant
contracts, checks already run and one bounded question. Do not give an implementation helper credit
for independent review of its own changes. Use separate reviewers only when their material questions
are independent. Review is not permission to repair, commit or operate a runtime.

Keep writers off the candidate during review. Establish the boundary required by the task and
repository. Distinguish tool-enforced protection from instructions not to write; before/after
fingerprints detect changes but do not prevent them. If the required protection or reviewer is
unavailable, report that limitation rather than silently substituting a weaker gate.

Ask for concrete findings with triggers, consequences and useful source locations. A supported
static finding can stand without runtime execution. Reproduce only uncertainty that matters and
only within the available resource/effect scope.

For each finding, fix it, explain why evidence rejects it, or identify it as outside scope. Preserve
unresolved material concerns. Do not change the product merely to appease a reviewer or weaken a test
to obtain a passing result. A second opinion is useful for a consequential disagreement or conflicting
evidence, not as an automatic ceremony.

After correction, review the changed boundary and open findings. Set a bounded review budget
appropriate to the task; stop repeated inconclusive rounds for a concrete decision. Silence, timeout,
exhausted budget or a numeric score is not approval.

## Handoff

Use the repository's existing evidence location when a written handoff is requested or needed.
Include the outcome, candidate identity, owned paths, completed and remaining work, new versus reused
proof, effects/resources still held and the next decision. Link logs rather than pasting their full
contents. Exclude secrets and private data not needed by the receiver.

A handoff conveys context, not permission or writer ownership. Sending it to another person or chat
requires the user's authorization for that direction. Do not start or resume another session merely
because a handoff names it. Preserve the current work until the receiving scope is explicit.
