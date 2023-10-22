CREATE TABLE IF NOT EXISTS "files" (
  "_id" INTEGER NOT NULL UNIQUE,
  "id" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "file" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "thumbnail" TEXT,
  "uploaded_at" TEXT NOT NULL,
  "uploaded_by" TEXT NOT NULL DEFAULT "SYSTEM",
  "ttl" INTEGER,
  PRIMARY KEY("_id" AUTOINCREMENT)
);
