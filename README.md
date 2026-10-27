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

The rest of the documentation:

- [`ARCHITECTURE.md`](ARCHITECTURE.md): the data model, the design decisions
  and the stack.
- [`specs/`](specs/README.md): the requirements for each area of the app.
- [`HOSTING.md`](HOSTING.md): the server that runs the production app.

## Development

The dev ports follow the shared local port scheme, where cookbook is app `03`:

- 10300: the server (`PORT`)
- 10310: the Vite dev server
- 10332: PostgreSQL (`DB_PORT` in docker-compose)

Install [mise](https://mise.jdx.dev) and run `mise install`. It installs the
Node.js version and the PostgreSQL client tools from `mise.toml`.

Start the local database with `docker compose up -d`. Copy `.env.example` to
`.env` for the matching `DATABASE_URL` and `PUBLIC_URL`.

Then install dependencies with `npm install` and run:

- `npm run dev`: the server, restarted on changes. It applies pending
  migrations at startup.
- `npm run dev:client`: the Vite dev server at `http://localhost:10310`. It
  proxies `/api`, `/mcp` and `/images` to the server. If the port is taken,
  Vite stops instead of picking another port.
- `npm run migrate`: applies pending migrations without starting the server.
- `npm run set-user -- <username> "<display name>"`: creates a user, or sets the
  display name and password of an existing user. Asks for the password.
- `npm run mcp-token -- <username>`: generates a personal MCP token for a user
  and replaces the old one. Prints the token once.
- With `--sql`, `set-user` and `mcp-token` print an SQL statement instead of
  writing to the database, for example for the production database. They do
  not need `DATABASE_URL` then.
- `npm run seed`: adds test recipes and the user `demo` with the password
  `demo` and the integration token `ckb_int_local_dev_token`.
  `npm run seed -- --reset` replaces all existing recipes and tags.
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
- `scripts/copy-prod-db.sh`: replaces the local database with a copy of the
  production database from `PROD_DB_URL` in `.env`, and sets every password
  to `password`. It also gives one user the integration token
  `ckb_int_local_dev_token`, so that services in local dev can call the
  integration API at `http://localhost:10300/api/v1` with a fixed token. The
  token goes to the oldest user with an integration token, or to the oldest
  user if no one has one. Needs Tailscale, and `psql` and `pg_dump` for
  PostgreSQL 18, which mise installs.
- `scripts/copy-prod-images.sh`: copies the recipe images from production to
  `data/images`. Needs Tailscale.

## Running

The app is served at `https://reseptit.pomeranssi.fi`. The MCP endpoint is
`https://reseptit.pomeranssi.fi/mcp`. The integration API is at
`https://reseptit.pomeranssi.fi/api/v1`, and its OpenAPI description at
`https://reseptit.pomeranssi.fi/api/v1/openapi.json`.

The app runs as a single Docker image, `ghcr.io/thaapasa/cookbook:<version>`,
built for `linux/arm64`. A reverse proxy such as Caddy sits in front of it and
handles TLS. PostgreSQL runs in its own container.

The container needs:

- `DATABASE_URL`: the PostgreSQL connection, such as
  `postgres://cookbook:<password>@db:5432/cookbook`. The app applies pending
  migrations at startup.
- `PUBLIC_URL`: the public address of the app, `https://reseptit.pomeranssi.fi`.
  The integration API uses it in the links that it returns. The server does not
  start without it.
- `IMAGES_DIR`: the path of the recipe images in the container. The image sets
  it to `/data/images`. Mount a host directory at `/data/images`. The container
  runs as user `node` (UID 1000), so the directory must be writable by UID 1000.

The image also sets `PORT=3000` and `NODE_ENV=production`. The health check
endpoint is `/health`.

### Releases

Run the **Release** workflow from the GitHub Actions tab. Choose the bump level
and optionally add highlights for the release notes. The workflow:

1. Bumps the version in `package.json` on a release branch.
2. Builds the image for `linux/arm64` and pushes it to GHCR with the tags
   `<version>` and `latest`.
3. Merges the release branch into `main`, tags the commit as `v<version>` and
   publishes a GitHub Release.

Versions start from 0.x.x. Use `minor` for features and `patch` for fixes.

## Administration

To add a user, run `set-user` in the container, for example
`docker exec -it <container> npm run set-user -- <username> "<display name>"`.
After that, users manage their own password and tokens on the profile page.
