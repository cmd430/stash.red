CREATE VIEW IF NOT EXISTS "userFiles" AS
SELECT id, type, uploaded_at, uploaded_by, isPrivate, (
  SELECT COUNT() FROM file WHERE id NOT IN (
    SELECT id FROM files WHERE inAlbum NOT NULL
  ) GROUP BY uploaded_by
) AS total FROM file WHERE id NOT IN (
  SELECT id FROM files WHERE inAlbum NOT NULL
);
