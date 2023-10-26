CREATE VIEW IF NOT EXISTS "userFiles" AS
SELECT *, (
  SELECT COUNT() FROM file WHERE id NOT IN (
    SELECT id FROM files WHERE inAlbum NOT NULL
  ) GROUP BY uploaded_by
) AS total FROM file WHERE id NOT IN (
  SELECT id FROM files WHERE inAlbum NOT NULL
);

/*

Usage would be (for user.js)

SELECT id, file, type, isPrivate, total FROM userFiles WHERE uploaded_by = "testAccount" AND type LIKE '%' ORDER BY uploaded_at ASC LIMIT 35 OFFSET 0
SELECT id, file, type, isPrivate, total FROM userFiles WHERE uploaded_by = "testAccount" AND NOT isPrivate = 1 AND type LIKE '%' ORDER BY uploaded_at ASC LIMIT 35 OFFSET 0

`SELECT id, file, type, isPrivate, total FROM userFiles WHERE uploaded_by = ? AND type LIKE '${filter}%' ORDER BY uploaded_at ${order} LIMIT ? OFFSET ?`
`SELECT id, file, type, isPrivate, total FROM userFiles WHERE uploaded_by = ? AND NOT isPrivate = 1 AND type LIKE '${filter}%' ORDER BY uploaded_at ${order} LIMIT ? OFFSET ?`

*/
