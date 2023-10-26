CREATE TABLE IF NOT EXISTS "files" (
  "_id" INTEGER NOT NULL UNIQUE,
  "id" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "file" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "uploaded_at" TEXT NOT NULL,
  "uploaded_by" TEXT NOT NULL DEFAULT "SYSTEM",
  "ttl" INTEGER,
  "isPrivate" INTEGER NOT NULL DEFAULT 0,
  "inAlbum" TEXT,
  "albumOrder" INTEGER,
  PRIMARY KEY("_id" AUTOINCREMENT)
);
