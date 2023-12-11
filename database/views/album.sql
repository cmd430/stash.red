CREATE VIEW IF NOT EXISTS "album" AS
SELECT
  "albums"."id",
  "title",
  "albums".
  "uploadedBy",
  "albums"."uploadedAt",
  GROUP_CONCAT("files"."file") AS "files",
  SUM("files"."size") AS "size",
  COUNT("files"."id") AS "entries",
  "albums"."isPrivate",
  'thumbnail/thumbnail_'||replace("files"."file", ltrim("files"."file", replace("files"."file", '.', '' ) ), '')||'.webp' AS "thumbnail"
FROM
  "albums"
INNER JOIN
  (SELECT
    "id",
    "file",
    "size",
    "inAlbum"
  FROM
    "files"
  ORDER BY
    "albumOrder"
  ) AS "files"
ON
  "inAlbum" = "albums"."id"
GROUP BY
  "albums"."id";
