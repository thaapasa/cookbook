# General

Requirements that apply to the whole app.

- [x] The UI supports i18n. Finnish is the only implemented language.
- [ ] The UI works on an iPad in both orientations.
- [x] Anyone can browse and view recipes without authentication.
- [ ] All actions that modify data require authentication. This includes
      creating, editing and deleting recipes, uploading photos and restoring
      revisions.
- [ ] Users log in with a username and password.
- [x] Users are added directly to the database. The app has no user editor.
- [x] Passwords are stored as Argon2id hashes (Node's built-in
      `crypto.argon2`) in PHC string format.
- [x] A login lasts 90 days from the last use. Logging out ends the session.
