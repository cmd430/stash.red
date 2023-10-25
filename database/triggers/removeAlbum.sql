/*
  When the last file entry for an
  album is removed also remove the album
*/
CREATE TRIGGER IF NOT EXISTS "removeAlbum" AFTER DELETE ON "files" WHEN (SELECT COUNT(*) FROM files WHERE inAlbum = OLD.inAlbum) = 0
BEGIN
  DELETE FROM "albums" WHERE "id" = OLD.inAlbum;
END;
