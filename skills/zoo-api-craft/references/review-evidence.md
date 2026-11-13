# Review evidence

## Trace the claim

Start with the changed behavior and follow only the relevant path. For a mounted API, this can include registration and middleware, request validation and authority inputs, service rules, persistence or external effects, response mapping, and affected consumers. Inspect applicable exceptions and tests along that path. For a plan, record decisions already established by source, any material open decision, and the check that would prove the proposed behavior.

For a review, lead with findings ordered by impact. Cite the relevant source, describe the failing condition and caller-visible consequence, and identify the smallest correction. Distinguish confirmed behavior from an inference or evidence gap. An audit can identify a needed repair or a missing check without performing it.

## Choose evidence that exercises the boundary

- Start with the smallest check that reaches the affected invariant. Use focused source or test evidence for a local change. For a shared contract, include an affected caller or a compatibility check that captures what the caller relies on.
- For persistence-sensitive invariants, inspect what the harness substitutes. Where database constraints, transaction isolation, or simultaneous claims determine the result, use authorized evidence that exercises those mechanisms. A sequence of isolated successes may miss the overlap that causes the failure.
- For mounted behavior or external effects, identify the source and controlled checks that are available now and the runtime or provider evidence needed for acceptance. Follow the repository's evidence process and obtain any separately required authorization before execution.

Record the checks actually performed, the conditions they exercised, and the material claims that remain unproven.
