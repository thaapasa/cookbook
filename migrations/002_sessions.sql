CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  -- SHA-256 of the session token. The token itself is only in the cookie.
  token_hash bytea NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX sessions_user_id ON sessions (user_id);
