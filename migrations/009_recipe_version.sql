-- Goes up by one on every change to a recipe, its photo or its notes. The
-- editor sends the version it loaded, and the server refuses the save if the
-- recipe has changed since.
ALTER TABLE recipes ADD COLUMN version integer NOT NULL DEFAULT 1;
