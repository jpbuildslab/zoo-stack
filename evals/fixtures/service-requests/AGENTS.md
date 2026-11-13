# Maintain the request desk fixture

- Use `src/server/requests.ts` for request state and mutations, `src/server/session.ts` for fixture actors, and `src/client/main.tsx` for the approval flow.
- Use the checks and disposable runner in [README.md](README.md). Keep app and evaluator evidence separate. Keep the existing approval behavior available when adding another workflow.
- The fixture owns only its fresh local containers, listeners, and browser contexts. Do not point its setup at an existing database or add a provider.
