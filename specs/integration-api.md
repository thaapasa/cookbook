# Integration API

A read-only HTTP API for other household systems, such as the family dashboard.
It returns the week plan, so that a client can show the planned dishes like the
week view does. Clients link to the cookbook to show a recipe.

## Access

- [x] Callers authenticate with a user's personal integration token as a bearer
      token. Generating the token is part of the [profile](profile.md) spec.
- [x] The API refuses session cookies and MCP tokens.
- [x] Any user's integration token can read the shared plan.
- [ ] Changes made with the integration token are recorded as made by the
      token's user, and marked as made through the integration API.
- [x] The API publishes an OpenAPI description of itself, generated from the
      same schemas that validate the requests and responses.

## Settings

- [x] Caller can read the week start day, as a weekday name such as
      `saturday`.
- [x] The week start day is the same one that the week view uses.

## Week

- [x] Caller can get the week that contains a given date. The server decides
      which dates belong to the week, so a client never works out the week
      itself.
- [x] Without a date, the server uses today in its own time zone.
- [x] The response has the start and end dates of the week, the week start day
      and all seven days in order, also the days without entries.

## Date range

- [x] Caller can get the entries from one date to another, both included, up
      to 366 days.
- [x] The response has each date in the range in order, also the dates without
      entries.

## Entries

- [x] Each date has its entries in plan order, also the free-text entries
      without a recipe.
- [x] Each entry has the text and the note of the plan entry.
- [x] An entry that links to a recipe also has the recipe title, the URL of
      the recipe page, the URL of the cooking view, and the URL of the recipe
      photo and the URLs of its smaller sizes, with the size of each smaller
      size. The photo is null when the recipe has no photo.
- [x] All URLs are absolute. The server reads the public address of the app
      from an environment variable.
