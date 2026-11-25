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

## Week panel

A panel on the side of the recipe list, where the user plans a week by dragging recipes from the
list. Next week is the main use case.

- [ ] The panel is available only to logged-in users on desktops and tablets. Phones don't show it.
- [ ] A handle on the right edge of the list opens the panel. Clicking or dragging the handle opens
      and closes the panel.
- [ ] The panel shows one week of the [week plan](week-plan.md), with all seven days. It opens on
      next week. Arrows move to the previous and the next week.
- [ ] The panel shows all entries of each day. An entry that links to a recipe shows its photo. The
      panel doesn't show the notes.
- [ ] User adds a recipe to a day by dragging its card from the list to the day. The new entry links
      to the recipe, its text is the recipe title, and it goes to the end of the day.
- [ ] User can add the same recipe to many days, many recipes to one day, and the same recipe to one
      day more than once.
- [ ] User can drag an entry from one day to another day of the week in the panel.
- [ ] User can remove an entry from its day with the × button on the entry. There is no undo, but
      the [change history](week-plan.md#editing) records the removal.
- [ ] The app saves each change at once, as the week edit view does.
- [ ] If another user changes the week, the panel shows the change without a reload.
- [ ] A link in the panel opens the edit view of the week.
- [ ] The browser remembers whether the panel is open and which week it shows. After a day without
      use, the panel starts closed and on next week again.
