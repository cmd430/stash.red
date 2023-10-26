CREATE VIEW IF NOT EXISTS "userAlbums" AS
SELECT id, title, uploaded_at, uploaded_by, entries, isPrivate, (
  SELECT COUNT() FROM album GROUP BY uploaded_by
) AS total FROM album;
