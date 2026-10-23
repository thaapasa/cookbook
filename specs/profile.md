# Profile

A page where a logged-in user edits their own name and manages their
credentials: the password, the MCP token and the integration token.

Users are still added directly to the database. The profile page only changes
the user who is logged in.

## Access

- [ ] Only logged-in users can open the profile page.
- [ ] The user menu in the header has a link to the profile page.

## Name

- [ ] User can change their display name. The name cannot be empty.
- [ ] The page shows when the account was created.

## Password

- [ ] The page shows when the password was last reset.
- [ ] User can reset their password. The server generates a random password of
      20 letters and digits and saves it. The page then shows it once, with a
      button that copies it. The user cannot choose the password.
- [ ] Resetting the password ends the user's other sessions. The current
      session stays.

## Tokens

- [ ] Each user has a personal MCP token and a personal integration token. The
      integration token is for an integration API for other systems, which is
      not built yet.
- [ ] Each kind of token starts with a short prefix that tells the kind.
- [ ] For each token, the page shows whether the user has one, when it was
      generated and its last 4 characters.
- [ ] User can generate each token. The server generates the token and saves
      it, which replaces the old one. The page then shows it once, with a
      button that copies it.
- [ ] Changes made with the integration token are recorded as made by the
      token's user, and marked as made through the integration API.

## Confirmation

- [ ] User must enter their current password to reset the password or to
      generate a token.
