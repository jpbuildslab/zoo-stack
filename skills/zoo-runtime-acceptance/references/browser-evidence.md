# Browser evidence

Use the repository's normal deterministic browser tooling when available. Separate a component's
synthetic state from the real application route, data and permissions. Record substitutions rather
than presenting a fixture as production integration.

Exercise the states that can change the decision: entry, validation, pending, success, relevant
failure/uncertainty, recovery, cancellation and destination. Check keyboard access and focus return,
responsive information/action parity, and reachability with realistic content and viewport height.
Do not multiply viewports or rerun unrelated journeys merely to enlarge the evidence packet.

Bind consequential UI outcomes to exact records, identity and state. For a lost response, distinguish
the original committed result from a new submission; verify that recovery does not duplicate it.
Tests should observe the actual assertion, not infer success from a generic browser exit.

Use safe representative screenshots or a local review surface for hierarchy, density, rhythm and
wording. The owner accepts qualitative direction; a screenshot comparison or numeric rating cannot
supply that decision. Automated accessibility checks cover their rules, not complete accessibility
or physical-device usability. Name any remaining manual or assistive-technology checks.

Keep the selected browser/context and its data within custody. Do not clear retained user storage,
change identity or replay a business action to make a test convenient. Disposable synthetic contexts
may be reset only within their assigned test lifecycle and after effects are reconciled.
