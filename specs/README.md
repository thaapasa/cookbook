# Specs

Requirements for the app, one file per area. Agents use these files for
feature planning and implementation.

Each file has a heading, a short description of the area and a list of
requirements:

- `- [ ]` means planned.
- `- [x]` means implemented.

Keep requirements at the level of what a user or caller can do. Leave
implementation details to the code.

## Areas

- [General](general.md): requirements that apply to the whole app.
- [Recipe list](recipe-list.md): the front page with search and filters.
- [Recipe page](recipe-page.md): a single recipe.
- [Cooking view](cooking-view.md): following a recipe in the kitchen.
- [Editor](editor.md): editing recipes in the browser.
- [Revisions](revisions.md): recipe history and undo.
- [Week plan](week-plan.md): planning the meals of each week.
- [MCP server](mcp.md): managing recipes with Claude.
