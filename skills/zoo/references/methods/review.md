# Review a candidate

Identify the candidate and its baseline. Use the requested diff, commit, or worktree together with the intended behavior and applicable repository contracts. Keep the candidate and prior work intact during review.

Trace changed behavior through its callers and effect boundaries. Look for a concrete regression a maintainer can act on. Follow evidence into adjacent code when necessary to establish the consequence. Use an authorized reproduction if it would resolve a meaningful uncertainty. A supported static finding can stand on source evidence.

For each finding, give a stable label when it will be tracked, severity based on consequence, the smallest useful source location, the trigger, and the observed or demonstrable effect. Record missing evidence that limits the review. If no actionable finding is supported, say so and name the material checks or paths that were outside the review.

Keep review and repair distinct. If the user later requests a repair, check the affected finding against the new candidate and say which evidence still applies. Claim independent review only when an independent reviewer actually assessed the identified candidate.
