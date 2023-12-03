CREATE VIEW IF NOT EXISTS "userInfo" AS
SELECT
  "username",
  (SELECT
      COUNT(id)
    FROM
      "albums"
    WHERE
      "uploadedBy" = "accounts"."username"
  ) AS "totalAlbums",
  (SELECT
      COUNT(id)
    FROM
      "files"
    WHERE
      "uploadedBy" = "accounts"."username"
  ) AS "totalFiles",
  (SELECT
      SUM("size")
    FROM
      "files"
    WHERE
      "uploadedBy" = "accounts"."username"
  ) AS "totalSize"
FROM
  "accounts";
