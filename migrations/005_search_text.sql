-- All searchable text in one string, for substring matches inside compound
-- words ("keitto" in "kanakeitto"). Updated on each save with search_vector.
ALTER TABLE recipes ADD COLUMN search_text text NOT NULL DEFAULT '';

CREATE INDEX recipes_search_text_trgm ON recipes USING gin (search_text gin_trgm_ops);

-- Recomputes search_vector and search_text from the recipe content. Steps share
-- the lowest weight with the description.
CREATE FUNCTION refresh_recipe_search(recipe_id uuid) RETURNS void
LANGUAGE sql AS $$
  WITH content AS (
    SELECT
      r.id,
      r.title,
      coalesce(r.description, '') AS description,
      coalesce(
        (SELECT string_agg(t.name, ' ') FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id
         WHERE rt.recipe_id = r.id), '') AS tags,
      coalesce(
        (SELECT string_agg(i.name, ' ' ORDER BY g.position, i.position) FROM ingredients i
         JOIN ingredient_groups g ON g.id = i.group_id WHERE g.recipe_id = r.id), '') AS ingredients,
      coalesce(
        (SELECT string_agg(s.text, ' ' ORDER BY g.position, s.position) FROM steps s
         JOIN step_groups g ON g.id = s.group_id WHERE g.recipe_id = r.id), '') AS steps
    FROM recipes r
    WHERE r.id = refresh_recipe_search.recipe_id
  )
  UPDATE recipes r SET
    search_vector =
      setweight(to_tsvector('finnish', c.title), 'A')
      || setweight(to_tsvector('finnish', c.tags), 'B')
      || setweight(to_tsvector('finnish', c.ingredients), 'C')
      || setweight(to_tsvector('finnish', c.description || ' ' || c.steps), 'D'),
    search_text = concat_ws(' ', c.title, c.tags, c.ingredients, c.description, c.steps)
  FROM content c
  WHERE r.id = c.id;
$$;

SELECT refresh_recipe_search(id) FROM recipes;
