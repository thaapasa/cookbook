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
- [x] Users are added directly to the database. The app cannot add users.
- [x] Users edit their own name and credentials on the
      [profile page](profile.md).
- [x] Passwords are stored as Argon2id hashes (Node's built-in
      `crypto.argon2`) in PHC string format.
- [x] A login lasts 90 days from the last use. Logging out ends the session.
- [x] After logging in, the user returns to the page they were on.
- [x] Back, close, cancel and done links, and saving or deleting, return to the
      page the user came from, as it was: the same search, filters, page and
      scroll position. When there is no such page, such as in a new tab, they
      go to a default page.
- [x] A page opened from a link in another system, such as the family
      dashboard, has back and close links that go back to that system. The
      links that the integration API returns mark the page as opened this way.
      When the browser has no page to go back to, such as in a new tab, the
      links go to the default page.

## Photos

- [x] Besides the full photo, the server stores two smaller sizes of each
      recipe photo: 256 px and 768 px on the short side. Photos are cropped to
      fit their place, so the short side decides how sharp they look. The
      smaller sizes are made from the full photo and are never larger than it.
- [x] The file name of each smaller size tells its size. A change of sizes
      gives new file names, so cached old files are never shown.
- [x] At startup, the server creates the missing smaller sizes and deletes the
      smaller sizes that are no longer in use. It leaves the full photos and
      other files alone.
- [x] The small thumbnails in the week view, the week edit view and the recipe
      suggestions show the 256 px size.
- [x] The recipe list offers all three sizes, and the browser picks the
      smallest one that looks sharp on the screen, up to 4x pixel density.
- [x] The recipe page and the editor show the full photo.
- [x] Clients get the photo URLs from the server and do not build them.
