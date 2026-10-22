# General

Requirements that apply to the whole app.

- [x] The UI supports i18n. Finnish is the only implemented language.
- [ ] The UI works on an iPad in both orientations.
- [x] User can switch between a light theme, a dark theme and following the
      system setting. The choice is stored in the browser.
- [x] Anyone can browse and view recipes without authentication.
- [x] All actions that modify data require authentication. This includes
      creating, editing and deleting recipes, uploading photos and restoring
      revisions.
- [x] Users log in with a username and password.
- [x] Users are added directly to the database. The app has no user editor.
- [x] Passwords are stored as Argon2id hashes (Node's built-in
      `crypto.argon2`) in PHC string format.
- [x] A login lasts 90 days from the last use. Logging out ends the session.
- [x] After logging in, the user returns to the page they were on.
- [x] Back, close, cancel and done links, and saving or deleting, return to the
      page the user came from, as it was: the same search, filters, page and
      scroll position. When there is no such page, such as in a new tab, they
      go to a default page.
