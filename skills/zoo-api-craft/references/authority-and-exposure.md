# Authority and exposure

## Scope and actor authority

- Trace authenticated or server-resolved identity through the handler, service, and data-access boundary. Verify that caller-supplied identifiers resolve within the actor's authorized scope. Check the actual rule for privileged, delegated, and cross-scope paths.
- Determine whether the repository scopes the operation to the requested resource, an active scope, or a broader boundary. Where null, shared, or inherited scope exists, establish what each value permits. Check nested relations, aggregates, and follow-up reads independently of the root query.
- Verify identity, permission, ownership, and entitlements as separate checks where applicable. Trace each sensitive action or field to its own authority rule. Verify enforcement on the server even when clients hide an action.

## Exposure and request cost

- Confirm the mount and middleware order. Check authentication and resource binding for authenticated and internal routes, the intended safe projection for public routes, and source authentication, replay handling, and acknowledgement semantics for webhooks. For browser credentials, follow the repository's origin and request-forgery protections.
- Match request-size and volume checks to reachability and cost. Where relevant, check body or batch size before expensive work, bound expensive verification and query fanout, and inspect how limits are scoped. Preserve required signature inputs and allow legitimate retry and redelivery patterns within those bounds.
- For composite reads, inspect pagination, fixed limits, and nested fanout. Verify that computed values come from the authoritative records, that each collection remains scoped, and that callers can detect incomplete results.

## Contracts and disclosure

- Identify the contract owner and material consumers. Check stable identifiers, field and error semantics, nullability, and pagination for changes consumers can observe. Where consumers migrate independently, check replacement parity and evidence for retirement. Report external usage as uncertain when the available evidence covers only repository callers.
- Project only the data required by the contract. In responses, errors, and logs, check for credentials, provider internals, sensitive fields, and raw request content. Preserve enough correlation to diagnose or reconcile the operation, with outcome claims supported by the available evidence.
