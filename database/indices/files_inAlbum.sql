CREATE INDEX IF NOT EXISTS "files_inAlbum" ON "files" (
  "inAlbum"
) WHERE "inAlbum" NOT NULL;
