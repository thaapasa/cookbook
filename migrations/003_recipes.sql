CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE recipes (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  title text NOT NULL,
  description text,
  servings text,
  active_minutes integer CHECK (active_minutes >= 0),
  total_minutes integer CHECK (total_minutes >= 0),
  source text,
  photo_path text,
  -- Title, description, tags and ingredient names. Updated on each save.
  search_vector tsvector NOT NULL DEFAULT ''::tsvector,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX recipes_search_vector ON recipes USING gin (search_vector);
CREATE INDEX recipes_title_trgm ON recipes USING gin (title gin_trgm_ops);

-- A recipe without groups has one group with no name.
CREATE TABLE ingredient_groups (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  recipe_id uuid NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
  position integer NOT NULL,
  name text,
  UNIQUE (recipe_id, position)
);

CREATE TABLE ingredients (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  group_id uuid NOT NULL REFERENCES ingredient_groups (id) ON DELETE CASCADE,
  position integer NOT NULL,
  amount text,
  name text NOT NULL,
  note text,
  UNIQUE (group_id, position)
);

CREATE INDEX ingredients_name ON ingredients (name);

CREATE TABLE step_groups (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  recipe_id uuid NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
  position integer NOT NULL,
  name text,
  UNIQUE (recipe_id, position)
);

CREATE TABLE steps (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  group_id uuid NOT NULL REFERENCES step_groups (id) ON DELETE CASCADE,
  position integer NOT NULL,
  text text NOT NULL,
  UNIQUE (group_id, position)
);

CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  name text NOT NULL UNIQUE
);

CREATE TABLE recipe_tags (
  recipe_id uuid NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, tag_id)
);

CREATE INDEX recipe_tags_tag_id ON recipe_tags (tag_id);

CREATE TABLE notes (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  recipe_id uuid NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id),
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notes_recipe_id ON notes (recipe_id);

CREATE TABLE revisions (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  recipe_id uuid NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
  author text NOT NULL CHECK (author IN ('user', 'claude')),
  -- Set when the author is a user.
  user_id uuid REFERENCES users (id),
  note text,
  -- The recipe content after the save, in the `RecipeInput` format.
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((author = 'user') = (user_id IS NOT NULL))
);

CREATE INDEX revisions_recipe_id ON revisions (recipe_id);
