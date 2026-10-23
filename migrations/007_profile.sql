-- Users reset their own password on the profile page. Existing passwords were
-- set when the account was created.
ALTER TABLE users ADD COLUMN password_changed_at timestamptz NOT NULL DEFAULT now();
UPDATE users SET password_changed_at = created_at;

-- The personal tokens of each user, one of each kind. Only the hash and the last
-- characters are stored. The token itself is only shown once.
CREATE TABLE user_tokens (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('mcp', 'integration')),
  -- SHA-256 of the token.
  token_hash bytea NOT NULL UNIQUE,
  last_chars text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind)
);

-- The last characters of the existing MCP tokens are not known.
INSERT INTO user_tokens (user_id, kind, token_hash, last_chars)
SELECT id, 'mcp', mcp_token_hash, '????' FROM users WHERE mcp_token_hash IS NOT NULL;

ALTER TABLE users DROP COLUMN mcp_token_hash;
