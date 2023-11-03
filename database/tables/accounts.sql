CREATE TABLE IF NOT EXISTS "accounts" (
  "id" TEXT NOT NULL UNIQUE,
  "username" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "isAdmin" INTEGER DEFAULT 0,
  UNIQUE ("username" COLLATE NOCASE),
  PRIMARY KEY("username")
);

/*
  Create internal SYSTEM account only
  if it doesnt exist, this account is not
  usable but is the default account used
  if an item is uploaded without an `uploaded_by`
  paramater set somehow
*/
INSERT INTO "accounts" ("id", "username", "email", "password", "isAdmin") SELECT 'INTERNAL', 'SYSTEM', 'SYSTEM', 'SYSTEM', '1' WHERE NOT EXISTS (
  SELECT 1 FROM "accounts" WHERE id = 'INTERNAL'
);
