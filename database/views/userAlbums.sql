CREATE VIEW IF NOT EXISTS "userAlbums" AS
SELECT id, title, uploadedAt, uploadedBy, entries, isPrivate, (
  SELECT COUNT() FROM album GROUP BY uploadedBy
) AS total FROM album;
