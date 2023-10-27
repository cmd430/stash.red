CREATE VIEW IF NOT EXISTS "albumFiles" AS
SELECT id, file, type, uploaded_at, uploaded_by, inAlbum AS album FROM files WHERE inAlbum IS NOT NULL ORDER BY albumOrder;
