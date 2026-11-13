# Desktop host probe

This procedure describes a future picker check. The earlier bootstrap run used direct file references;
its development checkpoint is retained outside the public snapshot history.

Run this procedure only with explicit authorization for the disposable Desktop probe. The owner nominates a local Codex Desktop project and the initial and fresh sessions, and authorizes the temporary loading route, actual model and effort, allowed tools, and finite model usage. Budget one discovery/invocation turn, one ordinary follow-up, and one fresh-session turn, plus any diagnostics the owner explicitly includes. Stop new model work at the approved limit. The runner owns setup, evidence, and teardown.

## Prepare the disposable project

1. Pin the candidate by Git commit or an exact file manifest with SHA-256 digests. Open the nominated Desktop project at the root of a disposable repository. Stage the candidate's [skill directory](../skills/zoo/SKILL.md) as `.agents/skills/zoo/` there, keeping the entrypoint and reference together. Copy [the sample](../probe/sample.ts) into the project at `probe/sample.ts`. Keep this protocol and the grading notes outside the test project and candidate prompts. The repo-local location is a documented Codex discovery route to test on Desktop. [OpenAI skill loading guidance](https://learn.chatgpt.com/docs/build-skills#where-to-save-skills)
2. Record the staged paths and digests, repository root, actual Desktop build, model, effort, and tool surface where visible. Capture a baseline of project paths, types, and file digests including ignored and untracked files, excluding only Git internals. Record Git status, HEAD (or unborn state), and index entries separately. The candidate is authorized to read its loaded skill, its reference, applicable project guidance, and the sample. File writes, application execution, network tools, and delegation are outside this probe's scope.
3. In the nominated session, look for `zoo` in Desktop's available skill UI. Record the visible path or other identity and the actual explicit invocation affordance. If the selection is ambiguous, resolve it using the session's visible identity or mark it blocked. Keep other skills and global settings intact.

## Initial turn

Select the intended `zoo` skill through the Desktop affordance and submit this request. The `$zoo` below denotes the intended attachment. Use the selection or mention the actual client exposes and record how it was submitted.

```text
$zoo Read Zoo's local Codex host reference, then inspect only probe/sample.ts as application source. Explain what the exported function does and what it returns for a string containing only spaces. Cite the file and lines. Use only local read-only tools. Do not execute the sample, change files, use the network, or delegate.
```

Record discovery, explicit attachment, entrypoint load, local reference read, and sample read as separate observations. Prefer the host event or trace showing which entrypoint was read or injected and tool activity showing which reference and sample were read. Match observed paths to the staged copy. If the host hides a needed event and there is no equivalent evidence, mark the observation `BLOCKED` and record any supporting indirect evidence. A path on disk, a self-report, or a manual read alone cannot establish explicit host loading.

The answer should identify `badgeLabel`, explain that it trims the supplied string, report `"Guest"` for spaces, and cite the source. After each turn, compare both the project snapshot and Git status, HEAD, and index entries with their baselines. Record any out-of-scope attempt separately from actual effects. A successful answer alone does not establish the loading or unchanged-file observations.

## Follow-up and fresh session

After recording the initial blank-input result, retain the checkpoint below for the fresh session. In the same session, send this follow-up without reattaching the skill.

```text
What would it return for "  Ada  "? Keep the same scope and cite the source.
```

Expect `"Ada"` with a citation and the same read-only scope. Repeat the snapshot and Git comparisons.

In the nominated fresh session on the same pinned disposable project, paste the retained checkpoint and request. Withhold the prior chat and the follow-up answer.

```text
Checkpoint for probe/sample.ts in this project. The read-only investigation established that a string of spaces returns "Guest". The remaining question is what the function returns for "  Ada  ". Read the designated source with local read-only tools and answer with a citation. Do not execute the sample, change files, use the network, or delegate.
```

Record the fresh session's identity and checkpoint delivery. Require a local read event or equivalent evidence from that session matching the staged `probe/sample.ts`. If the read is hidden and no equivalent evidence is available, mark fresh-session source access `BLOCKED`. Check the cited answer separately and repeat the snapshot and Git comparisons. A verified result establishes a continuation route for this probe. Resuming partially implemented work is a later case.

## Evidence and cleanup

Store the run record under `zoo-m1b-evidence/<run-id>/` inside an owner-selected location outside the candidate repository and, if possible, outside the candidate session's readable boundary. Save the exact candidate and staged identities, before/after snapshots, and observed results with evidence pointers. Record the enforced boundary for tool access and evaluator material separately from the instructions. Keeping grading notes outside the project by itself gives no isolation guarantee. Use only harmless synthetic material for any separately authorized boundary diagnostic. If isolation remains unproved, report only the loading and capability observations supported by evidence and identify the gap before further fixture work.

Report discovery, explicit attachment, entrypoint load, reference read, source reads and answers, follow-up scope, fresh-session checkpoint delivery, unchanged files and Git state, and evaluator isolation separately. Use `PASS`, `FAIL`, `BLOCKED`, or `NOT RUN` with the evidence or specific limitation for each. After preserving the record, the runner tears down the disposable setup within the authorized scope.
