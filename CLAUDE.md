# Cookbook

- `README.md`: what the app is, the dev setup, the environment variables and the admin tasks.
- `ARCHITECTURE.md`: the data model, the design decisions and the stack. Read it before you plan a
  change.
- `HOSTING.md`: the production server.

The user configures the production server, and you have no access to it. If a change affects what
the server must provide, such as a new environment variable or a volume, update "Running" in
`README.md` and tell the user.

If you make a design decision that the code cannot explain, add it to `ARCHITECTURE.md` with the
reason and the rejected alternatives.

## Linting

After editing code, run `npm run lint -- --fix`. It sorts imports and reports the remaining
problems. Fix every error and warning. Then, run `npm run format` to format code with Prettier.

## Tests

Run `npm test`. The goal is confidence that the app works, not full coverage.

- No UI tests.
- Service-level tests are the main focus. They call the server functions against the test database
  and check the results.
- Unit tests only where they bring value, such as parsing or security code.
- API tests cover authentication, authorization and input validation, plus a few requests that check
  that data goes in and comes out.

## Design

The UI design is in `design/boards/`, synced from the Claude Design canvas. See `design/CLAUDE.md`
for the boards and the sync steps. Claude Design creates the contents of `design/`, so code reviews
skip it.

## Specs

Requirements live in `specs/`, one file per app area. See `specs/README.md` for the format.

- Read the relevant spec before planning or implementing a feature.
- Add new requirements as unchecked items (`- [ ]`).
- Format the specs with Prettier after editing them: `npm run format`.
- Tick a requirement (`- [x]`) in the same commit that implements it.
- Ask before changing or removing an existing requirement.
- The "Not required" sections list what the app skips on purpose. Don't build those things, and
  don't raise them in reviews. The "Free choices" sections, and any behavior that no requirement
  names, are yours to decide.
- Each spec can end with an "Open questions" section. Ask the user before you implement anything
  that depends on an open question.

## Prose linting

Vale checks the docs (`README.md`, `ARCHITECTURE.md`, `HOSTING.md`, `assets/README.md`, and the
files in `specs/`) against the Google developer documentation style. Code comments aren't linted.

- Run `mise run lint-prose` after you edit the docs. CI runs the same check, and it fails on
  warnings and errors.
- `mise run prose [paths]` also shows suggestions.
- If Vale flags a real term, add it to `.vale/styles/config/vocabularies/Project/accept.txt`. Add
  product names for headings and known acronyms to the exceptions in `.vale/styles/Project/`. Don't
  edit `.vale/styles/Google`, which `vale sync` downloads.
