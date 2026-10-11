# Cookbook

A self-hosted recipe book for a family recipe collection. It stores recipes with
ingredients, steps, a photo and tags, and provides browsing and search.
Recipes can be collected from any source and adjusted to taste.

The app is built for two kinds of users:

- Cooks in the kitchen, who open a recipe on an iPad and follow it while
  cooking.
- Claude, through a built-in MCP server that can read, create and edit recipes.
  Claude imports recipes from web pages, photos and text, and adjusts existing
  recipes on request ("use oat cream instead of regular", "scale to 6
  servings"). Claude also reads the ingredients of the planned dishes to build a
  weekly shopping list.

The user interface supports i18n. Only Finnish is implemented at the start.

## Features

The requirements for each area of the app are in [`specs/`](specs/README.md).

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
- **User**: username, display name, password hash and a hash of the personal
  MCP token. Users are added with `npm run set-user`.
- **Session**: a login of a user. The database stores a hash of the session
  token, not the token.

## Design notes

**The app has no recipe importer.** Importing is the hardest part of most
recipe apps, because every site formats recipes differently. Claude reads the
source and calls the MCP tool that creates the recipe, so the app only stores
structured data.

**Search runs in PostgreSQL.** Full-text search (`tsvector` with the `finnish`
configuration) and `pg_trgm` for fuzzy matching are enough for a few hundred
recipes. No separate search service is needed.

**One set of Zod schemas validates everything.** The editor form, the REST API
and the MCP tools all use the same schemas. Zod also provides the TypeScript
types and the JSON Schema that MCP tool definitions need.

## Stack

- **Runtime**: Node.js 24 LTS. It runs `.ts` files directly through type
  stripping, so the server has no build step. Type stripping does not support
  `enum` or `namespace`.
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

## Deployment

The app is served at `https://reseptit.pomeranssi.fi`. The MCP endpoint is
`https://reseptit.pomeranssi.fi/mcp`.

The app runs as a single Docker image, `ghcr.io/thaapasa/cookbook:<version>`.
A reverse proxy such as Caddy sits in front of it and handles TLS. PostgreSQL
runs in its own container.

The container needs:

- `DATABASE_URL`: the PostgreSQL connection, such as
  `postgres://cookbook:<password>@db:5432/cookbook`. The app applies pending
  migrations at startup.
- `IMAGES_DIR`: the path of the recipe images in the container. The image sets
  it to `/data/images`. Mount a host directory at `/data/images`. The container
  runs as user `node` (UID 1000), so the directory must be writable by UID 1000.

The image also sets `PORT=3000` and `NODE_ENV=production`. The health check
endpoint is `/api/health`.

Users and MCP tokens are managed inside the container, for example
`docker exec -it <container> npm run set-user -- <username> "<display name>"`.

### Releases

Run the **Release** workflow from the GitHub Actions tab. Choose the bump level
and optionally add highlights for the release notes. The workflow:

1. Bumps the version in `package.json` on a release branch.
2. Builds the image for `linux/arm64` and pushes it to GHCR with the tags
   `<version>` and `latest`.
3. Merges the release branch into `main`, tags the commit as `v<version>` and
   publishes a GitHub Release.

Versions start from 0.x.x. Use `minor` for features and `patch` for fixes.

## Development

Start the local database with `docker compose up -d`. Copy `.env.example` to
`.env` for the matching `DATABASE_URL`. Set `DB_PORT` to use a port other
than 15432.

Then install dependencies with `npm install` and run:

- `npm run dev`: the server on port 3000, restarted on changes. It applies
  pending migrations at startup.
- `npm run dev:client`: the Vite dev server, which proxies `/api` and `/mcp` to
  the server.
- `npm run migrate`: applies pending migrations without starting the server.
- `npm run set-user -- <username> "<display name>"`: creates a user, or sets the
  display name and password of an existing user. Asks for the password.
- `npm run mcp-token -- <username>`: generates a personal MCP token for a user
  and replaces the old one. Prints the token once.
- With `--sql`, `set-user` and `mcp-token` print an SQL statement instead of
  writing to the database, for example for the production database. They do
  not need `DATABASE_URL` then.
- `npm run seed`: adds test recipes and the user `demo` with the password
  `demo`. `npm run seed -- --reset` replaces all existing recipes and tags.
- `npm run build`: builds the client into `dist/client`, which the server
  serves.
- `npm test`: runs the tests with [Vitest](https://vitest.dev).
  `npm run test:watch` reruns them on changes. The tests use the database
  `<name>_test` next to the database in `DATABASE_URL`, and create and migrate
  it when needed. They need the local database running.
- `npm run typecheck`: checks types with `tsc`.
- `npm run lint`: checks the code with ESLint. `npm run lint -- --fix` also
  sorts imports.
- `npm run format`: formats files with Prettier. `npm run format:check` only
  checks them.
