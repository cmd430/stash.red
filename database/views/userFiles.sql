CREATE VIEW IF NOT EXISTS "userFiles" AS
SELECT
  "id",
  "type",
  "uploadedBy",
  "uploadedAt",
  "isPrivate",
  (SELECT
      COUNT("id")
    FROM
      "files"
    WHERE
      "uploadedBy" = "file"."uploadedBy"
    AND
      "inAlbum" IS NULL
  ) AS "total"
FROM
 "file"
WHERE
  "inAlbum" IS NULL;
