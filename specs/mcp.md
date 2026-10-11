# MCP server

Lets Claude manage recipes on behalf of a user. Claude imports recipes from web
pages, photos and text, adjusts existing recipes on request, and builds weekly
shopping lists from the ingredients of planned dishes.

- [x] Each user has a personal MCP token. The token is shown once when it is
      generated. Generating a new token replaces the old one.
- [x] Callers authenticate with the token as a bearer token. The token
      identifies the user.
- [x] Claude can search and list recipes.
- [x] Claude can read a recipe.
- [x] Claude can create a recipe.
- [ ] Claude can edit a recipe, with a note on what changed.
- [ ] Changes made through MCP are recorded as made by the token's user, and
      marked as made through MCP.
- [ ] Claude can upload a photo for a recipe.
- [ ] Claude can get the ingredients of several recipes in one call.
- [ ] Claude can list the existing ingredient names, to keep names consistent
      across recipes.
