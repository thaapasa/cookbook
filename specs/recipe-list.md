# Recipe list

The front page. Shows the recipes that match the current search and filters.

- [x] User can search recipes with full-text search.
- [x] User can filter recipes by tags.
- [x] The page shows all matching recipes at once, without pages. The photos load as they scroll
      into view.
- [x] Once the user scrolls down the page, a floating button scrolls back to the top.
- [x] Search matches the title, tags, description, ingredients, and steps.
- [x] Search matches parts of compound words. For example, "keitto" matches "kanakeitto" too.
- [x] While the user types a search, a dropdown below the search field shows the best matching
      recipes. Selecting one opens the recipe. On a tablet, the on-screen keyboard can hide the
      recipe grid, but the dropdown stays visible above it.
- [x] On a phone, the search field is on the page above the tags. On wider screens, it's in the app
      header, and the tags take the full width of the page.
- [x] On wider screens, the header search is on every page except the login page. On another page,
      typing in it shows the matches only in the dropdown, and the user stays on the page.
- [x] The search on another page is in the `q` search param of that page, so it stays after a
      reload.
- [x] Selecting a recipe in the dropdown on another page opens the recipe. Going back shows the
      earlier page without the search.
- [x] Pressing Enter on another page, with no recipe highlighted in the dropdown, opens the recipe
      list with the search.
- [x] On a tablet, the header hides the text of the logo and of the new recipe button to give the
      search more room.
