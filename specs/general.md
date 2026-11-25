# General

The requirements and the decisions that apply to the whole app.

- [x] The UI supports i18n. Finnish is the only implemented language.
- [ ] The UI works on an iPad in both orientations.
- [x] User can switch between a light theme, a dark theme, and following the system setting. The
      choice is stored in the browser.
- [x] After logging in, the user returns to the page they were on.
- [x] Back, close, cancel, and done links, and saving or deleting, return to the page the user came
      from, as it was: the same search, filters, page, and scroll position. When there is no such
      page, such as in a new tab, they go to a default page.
- [x] A page opened from a link in another system, such as the family dashboard, has back and close
      links that go back to that system. The links that the integration API returns mark the page as
      opened this way. When the browser has no page to go back to, such as in a new tab, the links
      go to the default page.
- [x] When the app comes back to the foreground, such as when the user returns to the tab or to the
      iPad home screen app, it checks whether a new version is deployed. If there is one, the page
      reloads to it, also in the editor.
- [ ] A single request can't use up the memory or the processor of the server. This requirement
      doesn't cover a flood of requests, because rate limits are a [free choice](#free-choices). It
      doesn't limit what users store either, as [Storage](#storage) describes.
- [ ] The server log shows what happened, in one or a few lines for each API call. A call that the
      app makes often, such as the version check, can stay out of the log.

## Security

- [x] Anyone can browse and view recipes without authentication.
- [x] All actions that modify data require authentication. This includes creating, editing, and
      deleting recipes, uploading photos, and restoring revisions.
- [x] Users log in with a username and password. A user can't log in without the password.
- [x] Users are added directly to the database. The app can't add users.
- [x] Users edit their own name and credentials on the [profile page](profile.md).
- [x] Passwords are stored as Argon2id hashes in PHC string format. The hashes come from Node's
      built-in `crypto.argon2`.
- [x] A login lasts 90 days from the last use. Logging out ends the session.
- [x] After 10 failed logins with one username, or 30 from one address, the server refuses further
      logins from them for up to 15 minutes. Successful logins don't count.
- [x] Besides the recipes, a user can see only what a login gives: the shared
      [week plan](week-plan.md#access) and their own [profile](profile.md#access) and tokens.
- [ ] The app guards against flaws that a single request can exploit, such as injection, cross-site
      scripting (XSS), path traversal, cross-site request forgery (CSRF), server-side request
      forgery (SSRF) through the photo download, and ways around the login.

## Photos

- [x] Besides the full photo, the server stores two smaller sizes of each recipe photo: 256 px and
      768 px on the short side. Photos are cropped to fit their place, so the short side decides how
      sharp they look. The smaller sizes are made from the full photo and are never larger than it.
- [x] The filename of each smaller size shows its size. A change of sizes gives new filenames, so
      cached old files are never shown.
- [x] At startup, the server creates the missing smaller sizes and deletes the smaller sizes that
      are no longer in use. It leaves the full photos and other files alone.
- [x] The small thumbnails in the week view, the week edit view, and the recipe suggestions show the
      256 px size.
- [x] The recipe list offers all three sizes, and the browser picks the smallest one that looks
      sharp on the screen, up to 4x pixel density.
- [x] The recipe page and the editor show the full photo.
- [x] Clients get the photo URLs from the server and don't build them.
- [x] A photo can be marked as an illustration ("Mallikuva"), when it shows a similar dish and not
      the recipe as made. The flag is set with each upload, and a new photo without the flag is a
      photo of the recipe.
- [x] The recipe list, the recipe page, and the editor show an illustration in grayscale, toned with
      the accent color, with the label "Mallikuva" in the bottom-left corner. The small thumbnails
      show it as it is.

## Saved data

The format of the saved data changes while the app is being developed, and the recipes, the
[revisions](revisions.md) and the week plan history that users have already saved must keep working.
The revisions and the week plan history keep copies of old content, so they keep the format of the
version that saved them.

- [ ] Data saved with an older version of the app works in the latest version. The app upgrades it
      to the latest format on its own.
- [ ] If the app can't upgrade one item to the latest format, such as an old revision, it shows that
      item as broken. The other items work as before.
- [ ] Tests cover the upgrades of the saved data, because a bug there breaks the data that users
      have saved.

## Not required

The users who matter are the family and the agents that the family uses, so the app gets little
traffic. The family may show the recipes to friends. The items here are decisions, not gaps. Agents
don't build guards for them, and reviews don't raise them. If one becomes a real problem, the owner
fixes it then.

### Attacks by volume

The server must resist security issues that are easy to exploit, but it doesn't defend against
targeted attacks from an attacker with large resources, such as a botnet, a distributed
denial-of-service (DDoS) attack or an attacker with many addresses. For example, a denial of service
from a million IPv6 addresses is out of scope. Don't add code to the server to mitigate such
attacks.

### Uptime and bugs

The app keeps the saved data working, as [Saved data](#saved-data) describes. The service itself
makes no promises:

- The app makes no promise to stay up. There is no service level agreement (SLA). The app runs when
  it works, and the owner can take it down at any time.
- The app can be down during a deploy.
- A failed deploy or a bug in production, even one that stops the service, gets fixed when the owner
  finds it. The app doesn't need monitoring, alerts, or code that guards against such bugs.
- Losing unsaved edits on a deploy is fine, because the owner controls both the deploys and the
  editing. The apps must still update to the new version, as the version check above describes.

### Storage

The app doesn't limit what users store or upload, such as the number of recipes or photos. The users
are the family, and the server scales each uploaded photo down, which keeps the storage small
enough.

### Backups

The owner cares about backups and sets them up for the database and the photos later. Until then,
agents don't raise missing backups in plans, reviews, or reports.

### Speed

The app has no targets for speed, such as a load time or a response time. If it works well on the
owner's devices, it's fast enough. Agents don't optimize before a slow case shows up.

## Free choices

- The code's internals, such as the API between the client and the server, the database schema, and
  the split into modules. They follow good practices of software architecture, and they keep to the
  rules of [Saved data](#saved-data). The owner asks for changes when needed. The
  [integration API](integration-api.md) and the [MCP server](mcp.md) are not internal, because other
  systems call them.
- What the server logs, within the log requirement above, and the wording of the log messages. Log
  messages need no translations.
- Rate limits other than the login limit above. The app doesn't need limits on other requests.
- How much of the code the tests cover, beyond the tests of the saved data upgrades.
