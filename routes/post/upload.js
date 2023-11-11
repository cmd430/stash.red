import { extname } from 'node:path'
import { customAlphabet } from 'nanoid'
import { Log } from 'cmd430-utils'
import { createAzureBlob, setAzureBlob } from '../../utils/azureBlobStorage.js'
import generateThumbnail from '../../utils/generateThumbnail.js'
import { getMimetype, isValidMimetype } from '../../utils/mimetype.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Upload')
const nanoid = customAlphabet('123456789ABCDEFGHJKLMNPQRSTUVWXYZ_abcdefghijkmnpqrstuvwxyz-')

export default function (fastify, opts, done) {

  // Upload a file
  //eslint-disable-next-line complexity
  fastify.post('/upload', async (request, reply) => {

    // TODO split out the uploading/processing into seperate functions to tidy code up a bit (and hopefully allow reusing for the URL uploads)

    try {
      if (!request.session.get('authenticated')) return {
        status: 401,
        message: 'You must be logged in to upload files'
      }

      const { username } = request.session.get('session')
      const fields = {
        timeToLive: null,
        isPrivate: 0,
        dontFormAlbum: false,
        // Used when grabbing external resource
        fetchURL: null,
        // Used to tell if we are adding to an album or not
        isFromHomepage: false
      }
      const uploadedFiles = []

      for await (const part of request.parts()) {
        if (part.type === 'field') {
          // Load in field data for the upload
          switch (part.fieldname) {
            case 'timeToLive': {
              fields.timeToLive = Number(part.value) || null
              break
            }
            case 'isPrivate': {
              fields.isPrivate = Number(part.value || 0) ?? 0
              break
            }
            case 'dontFormAlbum': {
              fields.dontFormAlbum = Boolean(Number(part.value || 0) ?? 0)
              break
            }
            case 'fetchURL': {
              fields.fetchURL = part.value || null
              break
            }
            default: {
              debug('Unknown field in upload', part.fieldname)
              continue
            }
          }

          /*
            only gets set if we have at least one valid field
            only the homepage sets the fields so this should mean
            we are uploading from the homepage
          */
          fields.isFromHomepage = true
        } else if (part.type === 'file') {
          // Process the upload files
          const file = await part.toBuffer()

          if (file instanceof Buffer === false || file.byteLength === 0) {
            debug('Skipping file with no data')
            continue
          }

          const mimetype = getMimetype(file)

          if (isValidMimetype(mimetype) === false) {
            debug('Skipping file with invalid mimetype: ', mimetype)
            continue
          }

          const filename = part.filename
          const { timeToLive, isPrivate, isFromHomepage } = fields
          const thumbnail = await generateThumbnail(mimetype, file)
          const { fileBlobName, azureBlobClients } = createAzureBlob(username, filename)
          const fileID = nanoid(8)

          if (isFromHomepage) {
            fastify.betterSqlite3
              .prepare('INSERT INTO "files" ("id", "name", "file", "size", "type", "uploadedBy", "ttl", "isPrivate") VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
              .run(fileID, filename, fileBlobName, file.byteLength, mimetype, username, timeToLive, isPrivate)
          } else {
            const { albumID } = request.headers.referer.match(/\/a\/(?<albumID>[a-zA-Z0-9-]{8})\/?$/).groups

            const album = fastify.betterSqlite3
              .prepare(`SELECT * FROM (SELECT "id", "uploadedAt", "uploadedBy", "isPrivate", "entries", "ttl" FROM "albums" INNER JOIN (
                          SELECT "entries" FROM "album"
                        ) AS "entries" ON "id" = "id" GROUP BY "id") WHERE "id" = ?`)
              .get(albumID)

            if (!album) continue

            const { uploadedAt: albumUploadedAt, uploadedBy: albumUploadedBy, isPrivate: albumIsPrivate, ttl: albumTimeToLive, entries: albumEntries } = album

            if (albumUploadedBy !== username) continue

            fastify.betterSqlite3
              .prepare('INSERT INTO "files" ("id", "name", "file", "size", "type", "uploadedAt", "uploadedBy", "ttl", "isPrivate", "inAlbum", "albumOrder") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
              .run(fileID, filename, fileBlobName, file.byteLength, mimetype, albumUploadedAt, username, albumTimeToLive, albumIsPrivate, albumID, albumEntries)
          }

          await setAzureBlob(file, thumbnail, azureBlobClients)

          // Make sure we can access the file ids after the upload
          uploadedFiles.push({
            id: fileID,
            ext: extname(filename)
          })
        }
      }

      // TODO: grab file from external and "upload" it
      if (fields.fetchURL !== null) {
        debug('URL to fetch', fields.fetchURL)

        if (fields.fetchURL.startsWith(`${request.protocol}://${request.hostname}`) === false) {
          // TODO: This code should be split out into `fetchExternal.js`

        }
      }

      if (uploadedFiles.length === 0) { // no files uploaded
        debug('No valid files found in payload')

        return {
          status: 400,
          message: 'No valid files found in payload'
        }
      }

      debug('Uploaded files', uploadedFiles)

      // our field data
      const { timeToLive, isPrivate, dontFormAlbum, isFromHomepage } = fields

      // If we are adding to an album just reload the page once done
      if (isFromHomepage === false) return {
        status: 201,
        path: '.'
      }

      // If muliple files but `dontFormAlbum` is true then we dont form the album and send the user to their user page
      if (dontFormAlbum && uploadedFiles.length > 1) return {
        status: 201,
        path: `/u/${username}`
      }

      // Generate Album if muliple files
      if (uploadedFiles.length > 1) {
        const albumID = nanoid(8)

        debug('Album ID', albumID)

        const statement = fastify.betterSqlite3.prepare('UPDATE "files" SET "inAlbum" = ?, "albumOrder" = ? WHERE "id" = ?')
        const transaction = fastify.betterSqlite3.transaction((fIDs, aID) => fIDs.map((fID, index) => statement.run(aID, index, fID)))
        const updated = transaction(
          uploadedFiles
            .reduce((accumulator, currentValue) => (accumulator = [ ...accumulator, currentValue.id ]), []),
          albumID
        )
          .reduce((accumulator, currentValue) => (accumulator += currentValue.changes), 0)

        fastify.betterSqlite3
          .prepare('INSERT INTO "albums" ("id", "title", "uploadedBy", "ttl", "isPrivate") VALUES (?, ?, ?, ?, ?)')
          .run(albumID, 'Untitled Album', username, timeToLive, isPrivate)

        debug('Added', updated, 'files to album')

        return {
          status: 201,
          path: `/a/${albumID}`
        }
      }

      // Single File
      const [ { id: fileID, ext: fileExt } ] = uploadedFiles

      return {
        status: 201,
        path: `/f/${fileID}`,
        direct: `/f/${fileExt}`
      }
    } catch (err) {
      error(err.stack)

      return {
        status: 500,
        message: 'Something went wrong'
      }
    }
  })

  done()
}
