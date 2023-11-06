CREATE VIEW IF NOT EXISTS "file" AS
SELECT id, name, file, size, type, uploadedAt, uploadedBy, isPrivate, 'thumbnail/thumbnail_'||replace(file, ltrim(file, replace(file, '.', '' ) ), '')||'.webp' AS thumbnail FROM files;
