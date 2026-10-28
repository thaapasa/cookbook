# Architecture

The cookbook is one Node.js server and a React app. The server stores the
recipes in PostgreSQL and the photos on disk. It serves the React app, a REST
API for the app, an integration API for other systems and an MCP server for
Claude.

## Data model

Primary keys are UUIDv7 values from PostgreSQL `uuidv7()`.

- **Recipe**: title, description, servings, active and total time,
  ingredients, steps, photo and source. Only the title is required. Servings
  is free text, such as "4–6 annosta" or "1 pelti (24 palaa)". The times are in
  minutes. The source is a URL or free text. A recipe has at most one photo and
  can have many tags.
- **Ingredient**: amount, name and note as free text, in a fixed order within
  the recipe. Only the name is required. The amount includes the unit and can
  be a range, such as "100–120 ml". The note holds extra details, such as a
  preferred brand. Ingredients can be grouped, for example "Dough" and
  "Filling".
- **Step**: one instruction as a plain-text paragraph, in a fixed order within
  the recipe. Steps can be grouped like ingredients. Step groups and ingredient
  groups are not linked.
- **Note**: a dated comment on a recipe by a user, such as how it turned out.
  Notes are not part of the recipe content and have no revisions.
- **Tag**: a free-form category, such as "dessert", "vegetarian" or "Christmas".
- **Revision**: a full snapshot of a recipe after each save, with the user,
  the source of the change (the app or MCP) and an optional note on what
  changed.
- **User**: username, display name and password hash. Users are added with
  `npm run set-user`. Each user edits their own name, password and tokens on the
  profile page.
- **Token**: a personal token of a user, one of each kind: the MCP token and the
  integration token for other systems. The database stores a hash of the token
  and its last 4 characters, to tell tokens apart.
- **Session**: a login of a user. The database stores a hash of the session
  token, not the token.

## Design decisions

### The app has no recipe importer

Importing is the hardest part of most recipe apps, because every site formats
recipes differently. Claude reads the source and calls the MCP tool that
creates the recipe, so the app only stores structured data.

### Search runs in PostgreSQL

Full-text search (`tsvector` with the `finnish` configuration) and `pg_trgm`
for fuzzy matching are enough for a few hundred recipes. No separate search
service is needed.

### The recipe list loads all recipes at once

The front page fetches every matching recipe in one request, and the photos
load as they scroll into view. With a few hundred recipes, the list is a few
tens of kilobytes compressed. Because the whole list comes from one cached
query, the browser's back button shows the page as it was, including the scroll
position. The route waits for the list before it renders, so the router can
restore the scroll position after a reload too.

Rejected alternatives:

- Pages of 12 recipes, which made browsing clumsy.
- Infinite scroll. After a reload, or once the cached pages expire, only the
  first page loads, so the scroll position is lost.

The MCP tool and the recipe search of the week plan still fetch one page at a
time.

### One set of Zod schemas validates everything

The editor form, the REST API and the MCP tools all use the same schemas. Zod
also provides the TypeScript types and the JSON Schema that MCP tool
definitions need.

## Stack

- **Runtime**: Node.js 24 LTS, in the exact version from `mise.toml`. It runs
  `.ts` files directly through type stripping, so the server has no build step.
  Type stripping does not support `enum` or `namespace`.
- **HTTP server**: [Hono](https://hono.dev), with `@hono/node-server` and
  `@hono/zod-validator`.
- **Database**: PostgreSQL. The app reads the connection from `DATABASE_URL`.
- **Database access**: hand-written SQL with
  [`postgres`](https://github.com/porsager/postgres). Its tagged templates send
  values as server-side parameters, so no custom SQL string interpolation is
  needed.
- **Migrations**: numbered `.sql` files.
- **Validation**: [Zod](https://zod.dev) 4.
- **MCP**: `@modelcontextprotocol/server` (SDK v2), served statelessly over
  HTTP at `/mcp`. Callers authenticate with a user's personal MCP token as a
  bearer token.
- **Frontend**: React, built with Vite. The server serves the built files.
- **UI components**: [React Aria Components](https://react-spectrum.adobe.com/react-aria/),
  unstyled. Also provides drag-and-drop reordering.
- **Styling**: [Tailwind CSS](https://tailwindcss.com) 4 with
  `@tailwindcss/vite`. Design tokens are defined in `@theme`.
- **Routing**: [TanStack Router](https://tanstack.com/router), with typed route
  and search params. Search params are validated with Zod.
- **Server data**: [TanStack Query](https://tanstack.com/query).
- **i18n**: `react-i18next`, with type-checked keys.
- **Forms**: `react-hook-form` with the Zod resolver.
- **Images**: stored as files on a mounted volume. The database stores the path.
  The server resizes uploads with `sharp`.

## Where the code is

The server is in `src/server`, with one folder per area: `recipes`,
`week-plan`, `auth`, `profile`, `mcp` and `integration`. The CLI scripts are
the `*-cli.ts` files in `src/server`.

The React app is in `src/client`, with the views in `pages`, the recipe editor
in `editor` and the week plan in `week`. The types and schemas that the server
and the client share are in `src/shared`. The migrations are in `migrations`.

## Related documentation

- [`specs/`](specs/README.md): what each area of the app must do.
- [`design/`](design/CLAUDE.md): the local copy of the UI design.
- [`HOSTING.md`](HOSTING.md): the server that runs the production app.
