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
- [x] Claude can edit a recipe, with a note on what changed.
- [x] Changes made through MCP are recorded as made by the token's user, and
      marked as made through MCP.
- [x] Claude can upload a photo for a recipe.
- [x] Claude can get the ingredients of several recipes in one call.
- [x] Claude can list the existing ingredient names, to keep names consistent
      across recipes.
- [x] Claude can list the existing tags with the number of recipes for each.
- [x] Claude can delete a recipe.
- [x] Claude can add a note to a recipe.
