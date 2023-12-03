CREATE VIEW IF NOT EXISTS "userAlbums" AS
SELECT
  "id",
  "title",
  "uploadedBy",
  "uploadedAt",
  "entries",
  "isPrivate",
  (SELECT
      COUNT("id")
    FROM
      "albums"
    WHERE
      "uploadedBy" = "album"."uploadedBy"
  ) AS "total"
FROM
  "album";
