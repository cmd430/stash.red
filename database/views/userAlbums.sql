CREATE VIEW IF NOT EXISTS "userAlbums" AS
SELECT *, (
  SELECT COUNT() FROM album GROUP BY uploaded_by
) AS total FROM album;
