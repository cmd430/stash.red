import { extname, basename } from 'node:path'
import { customAlphabet } from 'nanoid'
import { Log } from 'cmd430-utils'
import generateThumbnail from '../../utils/generateThumbnail.js'
import { getMimetype, isValidMimetype } from '../../utils/mimetype.js'
import { grab } from '../../utils/fetchExternal.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Upload')
const nanoid = customAlphabet('123456789ABCDEFGHJKLMNPQRSTUVWXYZ_abcdefghijkmnpqrstuvwxyz-')

export default function (fastify, opts, done) {

  // Upload a file
  fastify.post('/upload', async (request, reply) => {
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
      const processFile = async (file, filename) => {
        if (file instanceof Buffer === false || file.byteLength === 0) {
          debug('Skipping file with no data')
          return
        }

        const mimetype = getMimetype(file)

        if (isValidMimetype(mimetype) === false) {
          debug('Skipping file with invalid mimetype: ', mimetype)
          return
        }

        const fileID = nanoid(8)
        const { timeToLive, isPrivate, isFromHomepage } = fields
        const thumbnail = await generateThumbnail(mimetype, file)
        const { filename: storageFilename, thumbnailFilename: storageThumbnailFilename } = fastify.storage.create(username, filename)

        if (isFromHomepage) {
          await fastify.db.addFile({
            id: fileID,
            name: filename,
            file: storageFilename,
            size: file.byteLength,
            type: mimetype,
            uploadedBy: username,
            ttl: timeToLive,
            isPrivate: isPrivate
          })
        } else {
          const { albumID } = request.headers.referer.match(/\/a\/(?<albumID>[a-zA-Z0-9-]{8})\/?$/).groups
          const { succeeded } = await fastify.db.addFile({
            album: albumID,
            id: fileID,
            name: filename,
            file: storageFilename,
            size: file.byteLength,
            type: mimetype,
            uploadedBy: username
          })

          if (succeeded === false) return // file not added because either album not exist or user isnt the owner
        }

        await fastify.storage.write({
          username: username,
          file: {
            filename: storageFilename,
            fileData: file
          },
          thumbnail: {
            filename: storageThumbnailFilename,
            fileData: thumbnail
          }
        })

        // Make sure we can access the file ids after the upload
        uploadedFiles.push({
          id: fileID,
          ext: extname(filename)
        })
      }

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
          await processFile(await part.toBuffer(), part.filename)
        }
      }

      // our field data
      const { timeToLive, isPrivate, dontFormAlbum, fetchURL, isFromHomepage } = fields

      if (fetchURL !== null && fetchURL.startsWith(`${request.protocol}://${request.hostname}`) === false && fetchURL.startsWith('https://')) {
        await processFile(await grab(fetchURL), basename(fetchURL))
      }

      if (uploadedFiles.length === 0) { // no files uploaded
        debug('No valid files found in payload')

        return {
          status: 400,
          message: 'No valid files found in payload'
        }
      }

      debug('Uploaded files', uploadedFiles)

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
        const fileIDs = uploadedFiles
          .reduce((accumulator, currentValue) => (accumulator = [ ...accumulator, currentValue.id ]), [])

        await fastify.db.createAlbum({
          id: albumID,
          files: fileIDs,
          uploadedBy: username,
          ttl: timeToLive,
          isPrivate: isPrivate
        })

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
