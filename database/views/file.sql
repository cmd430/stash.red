CREATE VIEW IF NOT EXISTS "file" AS
SELECT id, name, file, type, uploaded_at, uploaded_by, isPrivate, 'thumbnail/thumbnail_'||replace(file, ltrim(file, replace(file, '.', '' ) ), '')||'.webp' AS thumbnail FROM files;
