-- SHA-256 of the user's personal MCP token. The token itself is only shown once.
ALTER TABLE users ADD COLUMN mcp_token_hash bytea UNIQUE;

-- Revisions record the user and where the change was made. Revisions without a
-- user are test data, so they are removed.
DELETE FROM revisions WHERE user_id IS NULL;
ALTER TABLE revisions DROP CONSTRAINT revisions_check;
ALTER TABLE revisions RENAME COLUMN author TO source;
ALTER TABLE revisions DROP CONSTRAINT revisions_author_check;
UPDATE revisions SET source = 'app';
ALTER TABLE revisions
  ADD CONSTRAINT revisions_source_check CHECK (source IN ('app', 'mcp')),
  ALTER COLUMN user_id SET NOT NULL;
