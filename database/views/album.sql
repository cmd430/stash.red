CREATE VIEW IF NOT EXISTS "album" AS
SELECT "albums.id", "title", "albums.uploadedBy", "albums.uploadedAt", GROUP_CONCAT("files.file") AS "files", COUNT("files.id") AS "entries", "albums.isPrivate", 'thumbnail/thumbnail_'||replace("files.file", ltrim("files.file", replace("files.file", '.', '' ) ), '')||'.webp' AS "thumbnail" FROM "albums" INNER JOIN (
  SELECT * FROM "files" ORDER BY "albumOrder" ASC
) AS "files" ON "inAlbum" = "albums.id" GROUP BY "albums.id";
