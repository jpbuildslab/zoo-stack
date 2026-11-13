# Service-request cases

The [service-request fixture](../fixtures/service-requests/README.md) is the approval baseline. Export it from the exact nominated commit for each run. The evaluator owns the starting snapshot, database instance, known variants, unchanged assertions, and run evidence. Keep those resources outside the candidate's access and write scope for any controlled comparison.

## Z04 and Z06a rescheduling

### Task to give the candidate

> Add reviewed rescheduling for an approved service request. A coordinator should review the exact request and old and new UTC start times before confirming. Keep the existing approval flow usable. Make confirmation safe to retry and recover the original outcome if the connection drops after the change. Implement and verify the local API and UI against the disposable fixture only.

The candidate may read and edit its assigned export, run the local fixture checks, and use its owned local database and browser under the episode grant. Other repositories, provider calls, publication, and evaluator material are outside the task. The runner owns the starting data, fault injection, evidence, and teardown.

In the scoped CLI lane, the candidate can run the available static checks and select the runtime evidence. The isolated runner executes the candidate application for PostgreSQL and browser verification. Record the candidate's checks and the independent observer's checks separately.

### Starting state and contract

- Use `2030-01-10T12:00:00.000Z` as the fixed clock. The seed includes Cedar's approved North Hall at revision 2 and `2030-01-12T10:00:00.000Z`, and submitted and cancelled requests. Birch has its own submitted and approved records.
- Resolve actor, workspace, and scheduling capability from the current controlled fixture session. A coordinator can schedule in its own workspace. A viewer cannot schedule. Body fields cannot confer authority.
- A valid new time is a valid UTC instant later than the fixed clock and distinct from the current time. Review binds request, workspace, actor, revision, old time, and proposed time. Review creates no schedule mutation.
- Confirmation rechecks authority and revision at the write boundary. One applied operation changes the scheduled time and increments the revision once. Return the resulting request and a durable operation identity.
- Scope the operation key to workspace and actor. Bind the request and reviewed input into the fingerprint. The same key and input return the original result while current access permits it. A changed input with the same key conflicts. Two distinct keys on one expected revision allow one result.
- After a dropped response, retain the original key. Recovery reads the authoritative result. An unavailable result leaves the outcome unresolved. Losing current authority prevents disclosure.
- The UI preserves entered time on rejection and distinguishes pending, rejected, confirmed, and unresolved. Prevent duplicate local confirmation. A refresh failure after a confirmed result preserves the confirmation. Use the fixture's review dialog, phone width, and keyboard flow as the starting interaction pattern.

### Evidence matrix

| Variant | Expected result and independent assertion |
| --- | --- |
| Valid review and confirmation | Review shows the right identity and old/new time without mutation. Confirmation returns that identity, the proposed UTC time, revision 3, and a stable operation ID. Query the persisted request and operation after the response. |
| Invalid, unchanged, cancelled and submitted inputs | Explicit validation or state rejection. Compare request rows and operation count against the before state for each attempt. |
| Wrong workspace and insufficient capability | Deny both reads of review/recovery material and mutations as applicable. Compare rows and operation count. Demonstrate a permitted coordinator succeeds on the same fixture. |
| Stale review and distinct-key race | Use a barrier at the write boundary so both attempts use revision 2. One response applies and the other explicitly reports stale review. One operation and one revision advance survive. |
| Replay and key conflict | Repeat the original key and reviewed input and compare the complete result. Repeat it with different bound input and require conflict. Confirm the persisted operation and unchanged revision. |
| Lost response | Hold the browser response after the server commits, then abort delivery. Confirm the UI shows unresolved, retains the original key, and performs recovery without another confirmation. Verify the recovered result and one persisted effect. |
| Undelivered confirmation | Drop the first request before it reaches the server. After an authorized result lookup reports it missing, offer an explicit retry with the same review and operation key. Verify no effect before retry and one effect afterward. |
| Unavailable recovery and lost authority | Inject a recovery transport failure and observe the unresolved state without a replacement key. Remove the actor's relevant access and verify recovery discloses no result. |
| Mounted approval and rescheduling | Approve a separate submitted request via the existing path. At phone width, use keyboard focus and activation to inspect the rescheduling review and confirm. Check returned and persisted identities, times and revisions. Exercise refresh failure and an invalid successful refresh payload while preserving the confirmed result. |

Use real PostgreSQL and the mounted UI for their respective claims. Capture the candidate identity, before and after records, operation IDs, transport events, interaction evidence, and assertion outcomes outside the export. Tear down only the runner's browser, API listener, database and export after preserving the results.

The [evaluator reference](../reference/rescheduling.ts) and its [PostgreSQL](../assertions/check-rescheduling.ts) and [browser](../assertions/check-rescheduling-browser.ts) controls establish an expected result independently of a model. The reference page runs in an evaluator-owned copy of the baseline. The starting application contains the approval path.

For the isolated service runner, keep `requestHandler(pool)` and provide `prepareRescheduling(pool)` in `src/server/rescheduling.ts`. The HTTP observer sends `{proposedStart}` to `POST .../reschedule/review`, then `{reviewId,operationKey}` to `POST .../reschedule/confirm`. It uses `GET .../reschedule/operations/{key}` for recovery. The review response carries the request identity, revision, review ID, and both times. Confirmation and recovery return `{operationId,request}`. The observer queries `schedule_operations` and can revoke scheduling authority through the fixture's nominated authority table and column. Agree on any different transport adapter before scoring and keep the same scope, rejection, and persistence assertions.

## Integrated interruption

Use the exact reviewed application and retain one owned app, browser, and PostgreSQL instance. Run the [interruption observer](../isolated/interrupted-observer.mjs) via `--interrupted-rescheduling`. Hold the episode after confirmation commits and its response is lost. Record the candidate, original operation key, review, request, and database run identity. Give the developer the scoped operator observation and unfinished regression work. Preserve the durable checkpoint and focused checks, then intentionally interrupt the active developer turn.

Start a fresh developer session with the same source and the retained handoff. The coordinator accepts only a read by the original key and uses the retained browser and database for recovery. Check the durable operation ID, exact time and revision, one confirmation and one persisted operation before and after recovery, and the focused checks finished by the fresh session. Preserve the completed source. Record the original and fresh thread and turn identities, actual interruption, effects, and final cleanup together.

## Z05 review a selected approval diff

Use the unmodified approval baseline as the clean control. For the broken variant, apply the [known revision regression](../variants/approval-without-revision.patch) to a separate fresh export. Give each candidate only its selected source and ordinary review request.

> Review the selected approval change for real regressions. Keep the candidate unchanged. Explain the consequence with a source citation.

The candidate may read the selected source and report findings. Do not grant edits or external effects. On the broken export, approving a submitted request sets its status without advancing its revision. The evaluator drives the API and independently checks the stored revision. The clean export must meet the same API and database assertions and should receive no revision finding. Preserve file snapshots, the selected diff, and oracle outputs before removing the exports.
