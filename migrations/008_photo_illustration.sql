-- Marks a recipe photo as an illustration: a photo of a similar dish, not of
-- the recipe as made. Each new photo sets the flag again.
ALTER TABLE recipes ADD COLUMN photo_illustration boolean NOT NULL DEFAULT false;
