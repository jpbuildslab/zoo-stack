---
name: zoo-api-craft
description: Plan, implement, or review API source behavior and API-owned contracts. Use for route exposure, actor or resource authorization, writes and side effects, retries and concurrency, or changes to requests and responses consumed by other clients.
---

# Zoo API Craft

Use the user's request to choose the work. A plan describes decisions and verification. A review or audit identifies findings and evidence gaps. An implementation changes the authorized source and verifies it. Keep plans and audits read-only unless the user also requests repairs.

## Discover the API rules

Start with the receiving repository's instructions for the affected code and follow any linked API profile or feature decisions. Use the smallest relevant set of route, authentication, service, data-access, contract, consumer, and test sources. Trace the real entry point and applicable exceptions before assuming the usual layering applies.

Use the repository's own rules for actor and resource scope, exposed surfaces, state transitions, side effects, compatibility, and evidence. If a material rule is missing or sources disagree, state the precise unresolved decision and its impact. Continue independent work where possible and leave dependent changes pending.

## Read the reference that matches the change

- For authorization, exposure, request cost, data projection, and consumer compatibility, read [Authority and exposure](references/authority-and-exposure.md).
- For state transitions, transaction boundaries, external effects, retries, or conflicts, read [Mutation integrity](references/mutation-integrity.md).
- For planning, findings, and choosing verification that proves the affected behavior, read [Review evidence](references/review-evidence.md).

Follow each affected invariant through the layers that can violate it. Check the narrowest evidence that can establish the result and expand verification when risk, shared contracts, or acceptance criteria warrant it. The user's authorization and repository rules govern runtime, database, provider, and release actions independently of source work.
