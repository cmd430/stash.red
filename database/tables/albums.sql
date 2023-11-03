CREATE TABLE IF NOT EXISTS "albums" (
  "id" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL DEFAULT "Untitled Album",
  "uploaded_at" DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
  "uploaded_by" TEXT NOT NULL DEFAULT "SYSTEM",
  "ttl" INTEGER,
  "isPrivate" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY("id")
);
