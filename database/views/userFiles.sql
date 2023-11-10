CREATE VIEW IF NOT EXISTS "userFiles" AS
SELECT "id", "type", "uploadedAt", "uploadedBy", "isPrivate", (
  SELECT COUNT() FROM "file" WHERE "id" NOT IN (
    SELECT "id" FROM "files" WHERE "inAlbum" NOT NULL
  ) GROUP BY "uploadedBy"
) AS "total" FROM "file" WHERE "id" NOT IN (
  SELECT "id" FROM "files" WHERE "inAlbum" NOT NULL
);
