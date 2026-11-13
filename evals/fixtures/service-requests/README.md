# Service requests fixture

This baseline shows service requests and lets a coordinator review and approve a submitted request. The React page and Node API share a request contract. PostgreSQL stores requests for the Cedar and Birch workspaces. The seeded records, actors, and times are synthetic. Rescheduling is the exercise built on top of this baseline.

## Run the checks

Use Node 24 and a local Docker Engine 28 or newer for runtime checks. The runner uses the official PostgreSQL 16 image at the digest in [runner/database.ts](runner/database.ts). If the image is missing, fetch that exact digest into the local Docker context before running the runtime checks. The runner uses the cached image.

```sh
npm ci
npm run check
npm test
npm run test:postgres
npm run test:browser
```

`npm test` covers the target guard in isolation. `test:postgres` uses PostgreSQL and the API. `test:browser` builds the UI, starts a fresh local fixture and exercises it with a 390-pixel browser viewport and keyboard input. Install Playwright's Chromium locally or set `ZOO_BROWSER_EXECUTABLE` to an installed Chromium executable. The check creates its own headless browser and context. A missing runtime causes that command to fail.

For an interactive session, run `npm run build` and `npm start`. Open the displayed local address in a disposable browser context and set its `fixture_session` cookie to `cedar-coordinator`, `cedar-viewer`, or `birch-coordinator`. These values select synthetic session records. Press Ctrl+C to close the listener and remove the fixture database.

## Resource boundary

Each run creates a uniquely named and labeled container with a randomly assigned loopback port, temporary storage, and generated credentials. It checks container ownership before setup and checks the PostgreSQL database, user, and cluster on each new connection before making it available. The API binds to a new loopback port. The runner closes its client pool and removes only the container whose ID, name, and owner label match the run. Browser checks close their own browser, block service workers, and reject intercepted requests outside the fixture origin.

If a forced stop prevents cleanup, identify the exact container using the run label `io.zoo.fixture.run` and verify its full ID and matching `zoo-fixture-*` name before removing it. Keep evaluation evidence outside the container and the candidate checkout.
