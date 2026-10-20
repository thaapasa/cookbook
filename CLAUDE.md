# Cookbook

See `README.md` for the app and the stack.

## Linting

After editing code, run `npm run lint -- --fix`. It sorts imports and reports
the remaining problems. Fix every error and warning. Then, run `npm run format`
to format code with Prettier.

## Tests

Run `npm test`. The goal is confidence that the app works, not full coverage.

- No UI tests.
- Service-level tests are the main focus. They call the server functions
  against the test database and check the results.
- Unit tests only where they bring value, such as parsing or security code.
- API tests cover authentication, authorization and input validation, plus a
  few requests that check that data goes in and comes out.

## Design

The UI design is in `design/boards/`, synced from the Claude Design canvas. See
`design/CLAUDE.md` for the boards and the sync steps.

## Specs

Requirements live in `specs/`, one file per app area. See `specs/README.md` for
the format.

- Read the relevant spec before planning or implementing a feature.
- Add new requirements as unchecked items (`- [ ]`).
- Tick a requirement (`- [x]`) in the same commit that implements it.
- Ask before changing or removing an existing requirement.
