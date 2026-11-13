# Runtime identity and cleanup

Record the identity needed to reproduce the claim: assigned checkout, baseline and relevant dirty
files; build/dependency inputs; executable artifact; processes and command roots; listeners; database
or storage target; input marker; effect controls; and evidence/cleanup ownership. A commit alone does
not identify an uncommitted source tree or an older running build.

Before a mutation or reset, prove that the actual target matches the assigned resource. For a database
behind a container or port mapping, connect the process/mapping identity to the effective database
used by setup and application clients. An assumed name or environment variable is not target proof.
Refuse foreign listeners, shared data or unresolved ownership rather than taking them over.

Use private output locations for logs, screenshots and disposable browser state. Keep authentication
artifacts, credentials and unredacted sensitive payloads out of exported evidence. A fake data set
does not make real provider credentials or external endpoints harmless.

Validate the actual isolation mechanism when the claim depends on it. Record what the host enforces
and what remains instruction-bound. A denied operation and a policy-compliant agent are different
observations; a forbidden attempt is not excused merely because the host denied it.

For cleanup, account for processes and descendants, listeners, created data, storage and browser
resources. Use exact ownership identities; never broad paths, globs, shared roots or process-name
matches as a substitute. Preserve evidence of incomplete cleanup or ambiguous effects before deciding
on further action. Stop only resources owned by this task.

If a check changes the candidate or encounters a product defect, retain the failed receipt and
reconcile effects before returning to local correction. The next gate must identify the corrected
candidate. Do not rewrite the old result as a pass.
