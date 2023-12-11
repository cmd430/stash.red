CREATE VIEW IF NOT EXISTS "userInfo" AS
SELECT
  "username",
  (
    SELECT
    COUNT("id")
  FROM
    "albums"
  WHERE
      "uploadedBy" = "accounts"."username"
  ) AS "totalAlbums",
  COUNT("files"."size") AS "totalFiles",
  COALESCE(SUM("files"."size"), 0) AS "totalSize"
FROM
  "accounts"
LEFT JOIN (
  SELECT
  "size",
  "uploadedBy"
  FROM
    "files"
) AS "files"
ON
  "uploadedBy" = "accounts"."username"
GROUP BY
  "accounts"."username";
