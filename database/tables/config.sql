CREATE TABLE IF NOT EXISTS "config" (
  "key" TEXT NOT NULL UNIQUE,
  "value" TEXT NOT NULL,
  PRIMARY KEY("key")
);
