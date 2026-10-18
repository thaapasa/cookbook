-- The entries of the week plan, stored by date. Positions run from 0 within a
-- date. The uniqueness check is deferred, so a transaction can renumber them.
CREATE TABLE week_plan_entries (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  date date NOT NULL,
  position integer NOT NULL,
  text text NOT NULL,
  note text,
  -- Deleting the recipe keeps the entry and its text.
  recipe_id uuid REFERENCES recipes (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX week_plan_entries_recipe_id ON week_plan_entries (recipe_id);

-- One row per change to an entry. `before` and `after` hold the entry in the
-- `WeekPlanSnapshot` format: `before` is null when the entry was added, and
-- `after` is null when it was removed. The entry id has no foreign key, so the
-- history outlives the entry.
CREATE TABLE week_plan_changes (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  entry_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES users (id),
  source text NOT NULL CHECK (source IN ('app', 'mcp')),
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (before IS NOT NULL OR after IS NOT NULL)
);

CREATE INDEX week_plan_changes_entry_id ON week_plan_changes (entry_id);
