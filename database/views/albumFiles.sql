CREATE VIEW IF NOT EXISTS "albumFiles" AS
SELECT "id", "file", "type", "inAlbum" AS "album", "albumOrder" AS "order" FROM "files" WHERE "inAlbum" IS NOT NULL ORDER BY "inAlbum"
