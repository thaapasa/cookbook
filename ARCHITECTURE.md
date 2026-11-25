# Architecture

The cookbook is one Node.js server and a React app. The server stores the recipes in PostgreSQL and
the photos on disk. It serves the React app, a REST API for the app, an integration API for other
systems, and an MCP server for Claude.

## Data model

Primary keys are UUIDv7 values from PostgreSQL `uuidv7()`.

- **Recipe**: title, description, servings, active and total time, ingredients, steps, photo, and
  source. Only the title is required. Servings is free text, such as "4–6 annosta" or "1 pelti (24
  palaa)." The times are in minutes. The source is a URL or free text. A recipe has at most one
  photo and can have many tags. The photo can be marked as an illustration, which means it shows a
  similar dish and not the recipe as made. The version is a number that goes up on every change to
  the recipe, its photo, or its notes.
- **Ingredient**: amount, name, and note as free text, in a fixed order within the recipe. Only the
  name is required. The amount includes the unit and can be a range, such as "100–120 ml." The note
  holds extra details, such as a preferred brand. Ingredients can be grouped, for example "Dough"
  and "Filling."
- **Step**: one instruction as a plain-text paragraph, in a fixed order within the recipe. Steps can
  be grouped like ingredients. Step groups and ingredient groups aren't linked.
- **Note**: a dated comment on a recipe by a user, such as how it turned out. Notes aren't part of
  the recipe content and have no revisions.
- **Tag**: a free-form category, such as "dessert," "vegetarian," or "Christmas."
- **Revision**: a full snapshot of a recipe after each save, with the user, the source of the change
  (the app or MCP) and an optional note on what changed.
- **User**: username, display name, and password hash. The `npm run set-user` command adds users.
  Each user edits their own name, password, and tokens on the profile page.
- **Token**: a personal token of a user, one of each kind: the MCP token and the integration token
  for other systems. The database stores a hash of the token and its last 4 characters, to tell
  tokens apart.
- **Session**: a login of a user. The database stores a hash of the session token, not the token.

## Design decisions

### The app has no recipe importer

Importing is the hardest part of most recipe apps, because every site formats recipes differently.
Claude reads the source and calls the MCP tool that creates the recipe, so the app only stores
structured data.

### Search runs in PostgreSQL

Full-text search (`tsvector` with the `finnish` configuration) and `pg_trgm` for fuzzy matching are
enough for a few hundred recipes. The app needs no separate search service.

### The recipe list loads all recipes at once

The front page fetches every matching recipe in one request, and the photos load as they scroll into
view. With a few hundred recipes, the list is a few tens of kilobytes compressed. Because the whole
list comes from one cached query, the browser's back button shows the page as it was, including the
scroll position. The route waits for the list before it renders, so the router can restore the
scroll position after a reload too.

Rejected alternatives:

- Pages of 12 recipes, which made browsing clumsy.
- Infinite scroll. After a reload, or once the cached pages expire, only the first page loads, so
  the page loses the scroll position.

The MCP tool and the recipe search of the week plan still fetch one page at a time.

### One set of Zod schemas validates everything

The editor form, the REST API and the MCP tools all use the same schemas. Zod also provides the
TypeScript types and the JSON Schema that MCP tool definitions need.

### The server counts login attempts in memory

The server counts login attempts per username and per client address, and refuses a login before it
checks the password. Each password check takes about 40 ms of Argon2 work in the libuv thread pool,
which also serves the file reads, so a flood of logins would slow down the whole site. The server
counts the attempt before the check, so that parallel requests can't all get through before the
first one fails.

The counts are in the memory of the one server process, and a restart clears them. That's enough for
one instance and a family's users.

The client address is the last entry of `X-Forwarded-For`, which Caddy adds. The earlier entries
come from the client, and the server ignores them.

Rejected alternatives:

- A table in PostgreSQL. It would keep the counts over restarts, but one instance doesn't need that.
- Rate limiting in Caddy. The standard Caddy build has no rate limit module.
- A limit per username only. Requests with a new username each time would get around it.
- Locking the account until an administrator unlocks it. Anyone who knows a username could then lock
  a family member out.

### The cooking view keeps its state in `localStorage`

If the user leaves the cooking view to check something and comes back, the ticked ingredients and
the highlighted step are still there. The browser keeps them in `localStorage`, one entry per
recipe. Each entry expires 12 hours after the last change, so the next time the user cooks the
recipe, the view starts empty. Only a change saves the entry, so opening the view doesn't extend its
lifetime.

The browser stores the ticks by the position of the ingredient. If someone edits the recipe during
cooking, a tick can move to another ingredient. This is rare, and the user can clear the ticks.

Rejected alternatives:

- `sessionStorage`. Safari clears it when it closes a background tab on an iPad. If the user opens
  the app in a new tab, the new tab starts without it. It also doesn't expire on its own.
- Storing the state on the server. It would follow the user to another device, but the state is only
  needed on the device the user cooks with.
- Dropping the ticks of ingredients whose text has changed. It handles the rare edit at the cost of
  more code.

### Drag and drop uses pointer events

The editor, the week edit view, and the week panel of the recipe list share one drag-and-drop
implementation in `src/client/editor/sortable.tsx`. It follows the pointer events of a mouse, a
finger, or a pen, moves a copy of the item under the pointer, and asks the drop target under the
pointer to take the item.

A drag from a grip handle or from an entry in the week panel starts as soon as the pointer moves.
Scrolling with a finger is off on those elements. The recipe cards fill the page, so a swipe over
them must still scroll. On a touchscreen, a card drag starts only after the user touches and holds
the card. A finger that moves before that scrolls the page as usual. While the panel is open,
touching and holding a card drags it instead of opening the link menu of the browser.

Rejected alternatives:

- The HTML drag-and-drop API. On an iPad, Safari decides when a drag starts and how the dragged item
  looks, so the app can't make it work the same as the editor's drag code.
- A drag-and-drop library. The app already had a small implementation for the editor, and extending
  it was less code than adapting a library to the existing lists.

### The recipe search moves to the header on wider screens

On phones, the search field is on the recipe list page. From the `md` width (768 px) up, it's in the
app header, and the page has no title, so more recipes fit on the screen. A media query hook decides
where the field goes, so only one search field exists at a time. The header field changes the search
params of the recipe list, so the list page and the header share the search without any other shared
state.

On other pages, the header search keeps its text in the `q` search param of the current page, and
the matches show only in the dropdown. The user can look up a recipe without leaving the page. The
`q` param belongs to the layout route of the pages with the header, so every such page accepts it.
Typing replaces the history entry and keeps the scroll position and the history state, so the back
link of the page still works. Before the app opens a recipe from the dropdown, it removes `q` from
the current entry, so going back shows the page without the search.

Rejected alternatives:

- Rendering the field in both places and hiding one with CSS. Two inputs with the same label confuse
  screen readers and the focus order.
- Moving the search to the header on phones too. The header already wraps on phones and has no room
  for it.
- Opening the recipe list when the user types on another page. The user loses the page they were on.
- Keeping the text of the header search in component state. The header stays mounted across pages,
  so the text would follow the user to the next page.

### The illustration flag belongs to the photo

Whether a photo is an illustration depends on the image, not on the recipe text. The flag is a
column next to the photo path, and every upload sets it. If an upload leaves the flag out, the new
photo counts as a photo of the recipe, so a flag set for an old stock photo doesn't carry over to a
real one. Like the photo, the flag isn't part of the revisions. The editor and the
`set_recipe_photo_illustration` MCP tool change the flag of a saved photo without an upload.

Rejected alternatives:

- A field of the recipe content, saved with `update_recipe`. Claude would have to send the flag back
  on every edit, and a revision restore could pair the flag with the wrong photo.

### The editor saves only over the version it loaded

Two users, or a user and Claude, can change a recipe at the same time. The editor loads the recipe
with its version, and the save sends that version back. If the recipe has another version, the
server refuses the save with 409 and changes nothing. The editor keeps the form and offers to load
the recipe again.

The version is an integer column of `recipes`. Every change to the recipe content, the photo, the
illustration flag and the notes increases it, so a note that someone adds on the recipe page while
the editor is open counts as a change.

A save is a series of requests: the recipe, then the photo, then each note. Only the recipe request
checks the version, but each request returns the new version. The editor keeps the version from the
last response, so its own steps don't count as changes by someone else when the user retries after a
failed step. The editor also compares the notes in the form with the notes that it loaded, not with
the current data on the server, so it never deletes a note that it didn't show.

In MCP, `update_recipe` takes the version as an optional field. Agents that leave it out keep
working and replace the recipe as before. The editor still notices their change, because it
increases the version.

Rejected alternatives:

- Comparing the notes and the content field by field. It covers only the compared fields, and every
  new field needs its own check.
- Last write wins. A save from an editor that someone opened earlier deletes the notes and
  overwrites the changes that others made meanwhile.
- `updated_at` as the version. Notes and the photo don't change it, and two changes in the same
  moment could look the same.
- A required version in MCP. Agents that don't send it would stop working.

## Stack

- **Runtime**: Node.js 24 LTS, in the exact version from `mise.toml`. It runs `.ts` files directly
  through type stripping, so the server has no build step. Type stripping doesn't support `enum` or
  `namespace`.
- **HTTP server**: [Hono](https://hono.dev), with `@hono/node-server` and `@hono/zod-validator`.
- **Database**: PostgreSQL. The app reads the connection from `DATABASE_URL`.
- **Database access**: hand-written SQL with [`postgres`](https://github.com/porsager/postgres). Its
  tagged templates send values as server-side parameters, so the code needs no custom SQL string
  interpolation.
- **Migrations**: numbered `.sql` files.
- **Validation**: [Zod](https://zod.dev) 4.
- **MCP**: `@modelcontextprotocol/server` (SDK v2), served over HTTP at `/mcp` in stateless mode.
  Callers authenticate with a user's personal MCP token as a bearer token.
- **Frontend**: React, built with Vite. The server serves the built files.
- **UI components**: [React Aria Components](https://react-spectrum.adobe.com/react-aria/),
  unstyled.
- **Styling**: [Tailwind CSS](https://tailwindcss.com) 4 with `@tailwindcss/vite`. The design tokens
  are in `@theme`.
- **Routing**: [TanStack Router](https://tanstack.com/router). Route and search params are typed,
  and Zod validates the search params.
- **Server data**: [TanStack Query](https://tanstack.com/query).
- **i18n**: `react-i18next`, with type-checked keys.
- **Forms**: `react-hook-form` with the Zod resolver.
- **Images**: stored as files on a mounted volume. The database stores the path. The server resizes
  uploads with `sharp`.

## Where the code is

The server is in `src/server`, with one folder per area: `recipes`, `week-plan`, `auth`, `profile`,
`mcp`, and `integration`. The command-line scripts are the `*-cli.ts` files in `src/server`.

The React app is in `src/client`, with the views in `pages`, the recipe editor in `editor`, and the
week plan in `week`. The types and schemas that the server and the client share are in `src/shared`.
The migrations are in `migrations`.

## Related documentation

- [`specs/`](specs/README.md): what each area of the app must do.
- [`design/`](design/CLAUDE.md): the local copy of the UI design.
- [`HOSTING.md`](HOSTING.md): the server that runs the production app.
