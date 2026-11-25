# Specs

Requirements for the app, one file per area. Agents use these files for feature planning and
implementation.

Each file has a heading, a short description of the area and a list of requirements:

- `- [ ]` means planned.
- `- [x]` means implemented.

Keep requirements at the level of what a user or caller can do. Leave implementation details to the
code. When a requirement depends on another area, link to that area's file.

A file can have two sections that tell agents where not to spend effort. They go after the
requirements and before the technical notes:

- "Not required" lists what the app skips on purpose: features it doesn't have, failures it doesn't
  guard against and attacks it doesn't defend against. Agents don't build these, and reviews don't
  raise them. Each item gives the reason, and the change that would make it matter, if one is known.
- "Free choices" lists details that agents decide on their own. The current code is not a promise,
  so an agent can change it when there's a reason. An agent can suggest a change to the user instead
  of making it.

A behavior that no requirement names is a free choice too. Keep it unless a change has a reason.

A file can have a "Technical notes" section for plans about the code that a later feature needs,
such as a refactoring to do when that feature starts. The notes go after the requirements and before
the open questions.

A file can end with an "Open questions" section for decisions that are not made yet.

After editing a spec, format it with Prettier: `npm run format`.

## Areas

- [General](general.md): what applies to the whole app, such as security, photos, uptime, saved
  data, and logging.
- [Recipe list](recipe-list.md): the front page with search and filters.
- [Recipe page](recipe-page.md): a single recipe.
- [Cooking view](cooking-view.md): following a recipe in the kitchen.
- [Editor](editor.md): editing recipes in the browser.
- [Revisions](revisions.md): recipe history and undo.
- [Week plan](week-plan.md): planning the meals of each week.
- [MCP server](mcp.md): managing recipes with Claude.
- [Integration API](integration-api.md): the week plan for other systems, such as the family
  dashboard.
- [Profile](profile.md): the user's own name, password, and tokens.
