# Week plan

A shared plan of what the household eats each day. A week starts on the day the
grocery delivery arrives, so the plan matches one delivery.

The app stores the entries by date, not by week. A week is the seven days from
the week start day onwards. If the week start day changes, the existing entries
keep their dates and only the grouping into weeks changes.

## Access

- [ ] Only logged-in users can view and edit the week plan.
- [ ] All users share one plan.
- [ ] The week view is a tab next to the recipe list. The tab is hidden from
      users who are not logged in.

## Entries

- [ ] A day can have any number of entries, also none.
- [ ] Each entry has a text and an optional note.
- [ ] An entry can link to a recipe. The text is shown in the plan, not the
      recipe title.
- [ ] If the user deletes a recipe, the entries that link to it keep their
      text and lose the link.

## Viewing

- [ ] The view shows one week at a time, all seven days at once.
- [ ] The week start day is a setting that any logged-in user can change.
      Saturday is the default.
- [ ] The view opens on the current week and highlights today.
- [ ] User can move to the previous and next week, and back to the current
      week. User can browse any week in the past or the future. A week with no
      entries shows as empty.
- [ ] Each week has its own URL, so a link or a reload opens the same week.
- [ ] An entry that links to a recipe links to the recipe page.
- [ ] Today is selected by default. User can select another day by tapping it.
- [ ] The entries of the selected day that link to a recipe have a button that
      opens the cooking view.
- [ ] If another user changes the week, the view shows the change without a
      reload.

## Editing

- [ ] User edits one week at a time in a separate edit view.
- [ ] The app saves each change at once.
- [ ] User can edit any week, also past weeks.
- [ ] User adds an entry by typing into a field for that day. The field
      suggests matching recipes. If the user picks a recipe, the entry links to
      it and its text starts as the recipe title. The user can also add the
      typed text without a link.
- [ ] User can edit the text and the note of an entry, and remove the entry.
- [ ] User can add, change and remove the recipe link of an existing entry.
- [ ] User can reorder entries within a day and move them to another day of the
      same week by dragging.
- [ ] User can move an entry to any date, also in another week, by picking
      the date from a date picker.
- [ ] The app records each change with the user who made it and what changed.
- [ ] User can view the change history of a week in the edit view. The
      history is for reading only, so the user restores an old entry by hand.
