CREATE VIEW IF NOT EXISTS "userFiles" AS
SELECT
  "id",
  "type",
  "uploadedBy",
  "uploadedAt",
  "isPrivate"
FROM
 "file"
WHERE
  "inAlbum" IS NULL;
