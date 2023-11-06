CREATE VIEW IF NOT EXISTS "albumFiles" AS
SELECT id, file, type, uploadedAt, uploadedBy, inAlbum AS album FROM files WHERE inAlbum IS NOT NULL ORDER BY albumOrder;
