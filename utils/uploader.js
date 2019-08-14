import { createWriteStream, unlink, rename, writeFile } from 'fs'
import { join, basename, extname } from 'path'
import createError from 'http-errors'
import { createID } from '../utils/helpers'
import { debug, error } from './logger'
import database from 'better-sqlite3-helper'
import { get } from 'http'
import { get as secureGet } from 'https'
import signature from 'stream-signature'
import { path as ffmpeg } from 'ffmpeg-static'
import simpleThumbnail from 'simple-thumbnail'
import { read as jsmediatags } from 'jsmediatags'
import sharp from 'sharp'

const storage = join(__dirname, '..', 'storage')

sharp.cache(false)

function upload (req, res, next) {
  if (!req.busboy) return next(createError(400))
  let upload_from = req.baseUrl.split('/').pop()
  let user = req.isAuthenticated()
  if (!user) return res.status(401).json({ message: 'Unauthorized' })

  if (upload_from === '') debug(`${user.username}`,
                                 ['Started upload', {color: 'limegreen'}],
                                 'from', ['Homepage', {color: 'cyan'}], req)
  if (upload_from === 'a') {
    let album_id = req.url.split('/')[1]
    let album_owner = database().queryFirstCell(`SELECT uploaded_by FROM albums WHERE album_id=?`, album_id)

    if (album_owner !== user.username) return res.status(401).json({ message: 'Unauthorized' })

    debug(`${user.username}`,
      ['Started upload', {color: 'limegreen'}],
      'from', ['Album', {color: 'cyan'}],
      '(', [`${album_id}`, {color: 'yellow'}], ')', req)
  }

  let upload_tracker = {
    parsed: 0,
    written: 0,
    removed: 0,
    options: {
      title: null,
      formAlbum: true,
      public: true
    },
    file_info: [],
    status: 'parsing'
  }
  let temp = {
    streams: [],
    files: []
  }

  /**
   * Upload Options or URL to use for Remote Upload
   */
  req.busboy.on('field', (key, value) => {
    if (key === 'options') Object.assign(upload_tracker.options, JSON.parse(value))
    if (key === 'url') {
      if (value.startsWith('http')) {
        ++upload_tracker.parsed

        let urlinfo = {
          file_id: createID(),
          original_filename: value,
          mimetype: null,
          filesize: 0
        }

        debug('Parsing url', [`${value}`, {color:'cyan'}], req)

        let httpReq = value.startsWith('https')
          ? secureGet
          : get

        let rstream = httpReq(value, response => {
          if (response.statusCode === 200) {
            let filename = response.req.path.split('/').pop()

            debug('Found file', [`${filename}`, {color:'cyan'}], '=>', [`${urlinfo.file_id}`, {color:'cyan'}], req)

            let contentLength = response.headers['content-length'] || 0
            let contentType = response.headers['content-type']
            let type = contentType.split('/').reverse().pop()

            if (['image','audio','video','application','binary'].includes(type)) {
              if (contentLength <= config.upload.limits.fileSize && contentLength > 0) {

                debug('Downloading', [`${urlinfo.file_id}`, {color: 'cyan'}], '(',['0%', {color: 'cyan'}], ')', req)

                let download_progress = {
                  total: parseInt(response.headers['content-length'], 10),
                  received: 0,
                  __current: 0
                }

                response.on('data', chunk => {
                  download_progress.received += chunk.length
                  let percent = Math.round(100 * download_progress.received / download_progress.total)
                  if (percent !== download_progress.__current && percent % 10 === 0) {
                    download_progress.__current = percent

                    debug('Downloading', [`${urlinfo.file_id}`, {color: 'cyan'}], '(',[`${percent}%`, {color: 'cyan'}], ')', req)

                    if (percent === 100 && urlinfo === null) {
                      upload_tracker.status = 'abort'

                      debug('Upload of', [`${urlinfo.file_id}`, {color: 'red'}], 'rejected unprocessable entity', req)

                      rstream.abort()
                      req.unpipe(req.busboy)
                      req.resume()

                      return res.status(422).json({ message: 'Unprocessable Entity' })
                    }
                  }
                })

                let temp_dest = join(storage, 'temp', urlinfo.file_id)
                let writeStream = createWriteStream(temp_dest)
                let fileSignature = new signature()

                temp.streams.push(writeStream)
                temp.files.push(temp_dest)

                fileSignature.on('signature', sig => {
                  urlinfo.mimetype = sig.mimetype

                  let mime_parts = sig.mimetype.split('/')
                  if (mime_parts[0] !== 'image' && mime_parts[0] !== 'audio' && mime_parts[0] !== 'video') {
                    upload_tracker.status = 'abort'

                    debug('Upload of', [`${urlinfo.file_id}`, {color: 'red'}], 'rejected file magic is invaild (', [`${sig.mimetype}`, {color: 'red'}], ')', req)

                    rstream.abort()
                    req.unpipe(req.busboy)
                    req.resume()

                    return res.status(422).json({ message: 'Invaild File Type' })
                  } else {
                    if (extname(urlinfo.original_filename) === '') urlinfo.original_filename = `${urlinfo.original_filename}.${sig.extensions[0]}`
                  }
                })

                writeStream.on('close', () => {
                  if (upload_tracker.status !== 'abort') {
                    debug('Saved file', [`${urlinfo.file_id}`, {color: 'cyan'}], req)

                    ++upload_tracker.written
                    urlinfo.filesize = writeStream.bytesWritten
                    upload_tracker.file_info.push(urlinfo)

                    if (upload_tracker.status === 'parsed' && upload_tracker.parsed === upload_tracker.written) req.emit('process')
                  }
                })

                response.pipe(fileSignature).pipe(writeStream)
              } else {
                upload_tracker.status = 'abort'

                rstream.abort()
                req.unpipe(req.busboy)
                req.resume()

                if (contentLength > 0) {
                  debug('Upload of', [`${urlinfo.file_id}`, {color: 'red'}], 'aborted size limit reached', req)

                  return res.status(413).json({ message: 'Payload Too Large' })
                } else {
                  debug('Upload of', [`${urlinfo.file_id}`, {color: 'red'}], 'rejected unprocessable entity', req)

                  return res.status(422).json({ message: 'Unprocessable Entity' })
                }
              }
            } else {
              upload_tracker.status = 'abort'

              debug('Upload of', [`${urlinfo.file_id}`, {color: 'red'}], 'rejected file magic is invaild (', [`${contentType}`, {color: 'red'}], ')', req)

              rstream.abort()
              req.unpipe(req.busboy)
              req.resume()

              return res.status(422).json({ message: 'Invaild File Type' })
            }
          } else {
            upload_tracker.status = 'abort'

            debug('Parsing of', [`${value}`, {color: 'red'}], 'aborted invalid url', req)

            rstream.abort()
            req.unpipe(req.busboy)
            req.resume()

            return res.status(422).json({ message: 'Invaild URL' })
          }
        })
      } else {
        upload_tracker.status = 'abort'

        debug('Parsing of', [`${value}`, {color: 'red'}], 'aborted invalid url', req)

        req.unpipe(req.busboy)
        req.resume()

        return res.status(422).json({ message: 'Invaild URL' })
      }
    }
  })

  /**
   * Upload a File
   */
  req.busboy.on('file', (key, file, filename, encoding, mimetype) => {
    ++upload_tracker.parsed

    let fileinfo = {
      file_id: createID(),
      original_filename: filename,
      mimetype: null,
      filesize: 0
    }
    let temp_dest = join(storage, 'temp', fileinfo.file_id)

    debug('Parsing file', [`${filename}`, {color:'cyan'}], '=>', [`${fileinfo.file_id}`, {color:'cyan'}], req)

    let writeStream = createWriteStream(temp_dest)
    let fileSignature = new signature()

    temp.streams.push(writeStream)
    temp.files.push(temp_dest)

    fileSignature.on('signature', sig => {
      fileinfo.mimetype = sig.mimetype
      let mime_parts = sig.mimetype.split('/')
      if (mime_parts[0] !== 'image' && mime_parts[0] !== 'audio' && mime_parts[0] !== 'video') {
        upload_tracker.status = 'abort'

        debug('Upload of', [`${fileinfo.file_id}`, {color: 'red'}], 'rejected file magic is invaild (', [`${sig.mimetype}`, {color: 'red'}], ')', req)

        req.unpipe(req.busboy)
        req.resume()

        return res.status(422).json({ message: 'Invaild File Type' })
      } else {
        if (extname(fileinfo.original_filename) === '') fileinfo.original_filename = `${fileinfo.original_filename}.${sig.extensions[0]}`
      }
    })

    writeStream.on('close', () => {
      if (upload_tracker.status !== 'abort') {
        debug('Saved file', [`${fileinfo.file_id}`, {color: 'cyan'}], req)

        ++upload_tracker.written
        fileinfo.filesize = writeStream.bytesWritten
        upload_tracker.file_info.push(fileinfo)

        if (upload_tracker.status === 'parsed' && upload_tracker.parsed === upload_tracker.written) req.emit('process')
      }
    })

    file.once('limit', () => {
      upload_tracker.status = 'abort'

      debug('Upload of', [`${fileinfo.id}`, {color: 'red'}], 'aborted size limit reached', req)

      req.unpipe(req.busboy)
      req.resume()

      return res.status(413).json({ message: 'File Too Large' })
    })

    file.pipe(fileSignature).pipe(writeStream)
  })

  /**
   * Upload Parsing Completed
   */
  req.busboy.on('finish', () => {
    if (upload_tracker.status !== 'abort') upload_tracker.status = 'parsed'
    if (upload_tracker.parsed === upload_tracker.written) req.emit('process')
  })

  /**
   * All Files Saved to Disk (Temp Folder)
   * Time to Move them to final dest. and create
   * Database entries for them
   */
  req.on('process', () => {
    debug('Processing', [`${upload_tracker.written}`, {color: 'cyan'}],'uploads', req)

    let uploadinfo = {}
    if (upload_tracker.written > 1) {
      // New album
      uploadinfo = {
        album: {
          album_id: createID(),
          title: upload_tracker.options.title,
          uploaded_by: user.username,
          uploaded_at: new Date().toISOString(),
          public: +upload_tracker.options.public
        },
        files: []
      }
      upload_tracker.file_info.forEach((info, index) => {
        uploadinfo.files.push(Object.assign(info, {
          uploaded_by: uploadinfo.album.uploaded_by,
          uploaded_at: uploadinfo.album.uploaded_at,
          in_album: upload_tracker.options.formAlbum
            ? uploadinfo.album.album_id
            : undefined,
          public: uploadinfo.album.public
        }))
      })

      try {
        if (upload_tracker.options.formAlbum) debug('Creating album with id of', [`${uploadinfo.album.album_id}`, {color: 'cyan'}], req)

        const insert_album = database().prepare(`INSERT INTO albums (album_id, title, uploaded_by, uploaded_at, public)
                                                 VALUES (@album_id, @title, @uploaded_by, @uploaded_at, @public)`)
        const insert_file = database().prepare(`INSERT INTO files (file_id, uploaded_by, uploaded_at, original_filename, mimetype, filesize, in_album, public)
                                                VALUES (@file_id, @uploaded_by, @uploaded_at, @original_filename, @mimetype, @filesize, @in_album, @public)`)
        const insert_files = database().transaction(files => { for (const file of files) insert_file.run(file) })
        const create_album = database().transaction(album => {
          insert_album.run(album)
          insert_files(uploadinfo.files)
        })
        if (upload_tracker.options.formAlbum) create_album(uploadinfo.album)
        if (!upload_tracker.options.formAlbum) insert_files(uploadinfo.files)
      } catch (err) {
        upload_tracker.status = 'abort'

        error(err.message)
        debug('Upload aborted album', [`${uploadinfo.album.album_id}`, {color: 'red'}], 'could not be created (', [`${err.message}`, {color: 'red'}], ')', req)

        return res.status(409).json({ message: 'Could Not Add Database Entrys' })
      }
    } else if (upload_tracker.written === 1) {
      // Single file
      uploadinfo = Object.assign(upload_tracker.file_info[0], {
        uploaded_by: user.username,
        uploaded_at: new Date().toISOString(),
        public: +upload_tracker.options.public
      })

      if (upload_from === 'a') {
        uploadinfo.in_album = req.url.split('/')[1]

        debug('Adding file', [`${uploadinfo.file_id}`, {color: 'cyan'}], 'to album', [`${uploadinfo.in_album}`, {color: 'cyan'}], req)
      }

      try {
        database().insert('files', uploadinfo)
      } catch (err) {
        upload_tracker.status = 'abort'

        error(err.message)
        debug('Upload aborted file', [`${uploadinfo.file_id}`, {color: 'red'}], 'could not be created (', [`${err.message}`, {color: 'red'}], ')', req)

        return res.status(409).json({ message: 'Could Not Add Database Entry' })
      }
    }

    upload_tracker.file_info.forEach(async (file, index) => {
      let type = file.mimetype.split('/')[0]
      let temp_loc = join(storage, 'temp', file.file_id)
      let final_loc = join(storage, type, `${file.file_id}${extname(file.original_filename)}`)

      if (type === 'image') {
        try {
          let metadata = await sharp(temp_loc).metadata()

          if (metadata.orientation !== 0 && metadata.orientation !== undefined) {
            try {
              debug('Rotating image', [`${file.file_id}`, {color: 'cyan'}], req)

              await new Promise((resolve, reject) => {
                sharp(temp_loc).withMetadata().rotate().toBuffer((err, buffer) => {
                  if (err) reject(err)
                  writeFile(temp_loc, buffer, err => {
                    if (err) reject(err)
                    resolve()
                  })
                })
              })

              debug('Rotated image', [`${file.file_id}`, {color: 'cyan'}], req)
            } catch (err) {
              error(err.message)
              debug('Could not rotate image', [`${file.file_id}`, {color: 'red'}], '(', [`${err.message}`, {color: 'red'}], ')', req)
            }
          }
        } catch (err) {
          error(err.message)
        }
      }

      rename(temp_loc, final_loc, err => {
        if (err) debug('File', [`${file.file_id}`, {color: 'red'}], 'unable to be moved (', [`${err.code}`, {color: 'red'}], ')', req)
        if (!err) {
          debug('Moved', [`${file.file_id}`, {color: 'cyan'}], 'from', ['temp', {color: 'cyan'}], 'to', [`${type}`, {color: 'cyan'}], req)

          createThumbnail({
            id: file.file_id,
            type: type,
            path: final_loc
          }, req)
        }
        if (index === temp.files.length - 1) {
          upload_tracker.status = 'complete'

          if (!upload_tracker.options.formAlbum && temp.files.length > 1) return res.status(201).json({
            message: 'Upload Complete',
            id: user.username,
            type: 'user',
            ext: null
          })

          return res.status(201).json({
            message: 'Upload Complete',
            id: file.hasOwnProperty('in_album')
              ? file.in_album
              : file.file_id,
            type: file.hasOwnProperty('in_album')
              ? 'album'
              : type,
            ext: file.hasOwnProperty('in_album')
              ? null
              : extname(file.original_filename)
          })
        }
      })
    })
  })

  /**
   * End of Request, Clean Up
   */
  req.on('close', () => {
    if (upload_tracker.status === 'complete') return debug(`${user.username}`, ['Upload completed', {color: 'limegreen'}], req)
    if (temp.files.length === 0) return debug(`${user.username}`, ['Nothing uploaded', {color: 'orange'}], req)

    debug(`${user.username}`, ['Aborted upload removing', {color: 'red'}], [`${temp.files.length}`, {color: 'cyan'}], ['files', {color: 'red'}], req)

    temp.files.forEach((file, index) => {
      temp.streams[index].end()
      unlink(file, err => {
        if (err) debug('File', [`${basename(file)}`, {color: 'red'}], 'unable to be removed (', [`${err.code}`, {color: 'red'}], ')', req)
        if (!err) ++upload_tracker.removed
        if (index === temp.files.length - 1) debug('Removed', [`${upload_tracker.removed}`, {color: 'cyan'}], 'files', req)
      })
    })
  })

  req.pipe(req.busboy)
}

async function createThumbnail (fileinfo, req) {
  let temp_thumbnail = null

  debug('Creating thumbnail for', [`${fileinfo.id}`, {color: 'cyan'}], req)

  try {
    switch (fileinfo.type) {
      case 'video':
        temp_thumbnail = await new Promise((resolve, reject) => {
          simpleThumbnail(fileinfo.path, null, '100%', { path: ffmpeg })
            .then(stream => {
              let image = []
              stream.on('data', chunk => image.push(chunk))
              stream.on('end', () => resolve(Buffer.concat(image)))
              stream.on('error', reject)
            })
        })
        break
      case 'audio':
        temp_thumbnail = await new Promise((resolve, reject) => {
          jsmediatags(fileinfo.path, {
            onSuccess: data => {
              let picture = data.tags.picture || { data: [ 0 ]}
              resolve(Buffer.from(picture.data))
            },
            onError: reject
          })
        })
        break
      case 'image':
        temp_thumbnail = fileinfo.path
    }

    await sharp(temp_thumbnail)
      .resize({
        width: config.upload.thumbnail.size,
        height: config.upload.thumbnail.size,
        fit: config.upload.thumbnail.fit,
        position: config.upload.thumbnail.position,
        background: config.upload.thumbnail.background,
        kernel: config.upload.thumbnail.kernel,
        withoutEnlargement: config.upload.thumbnail.withoutEnlargement,
        fastShrinkOnLoad: config.upload.thumbnail.fastShrinkOnLoad
      })
      .webp({ quality: config.upload.thumbnail.quality })
      .toFile(join(storage, 'thumbnail', `${fileinfo.id}.webp`))
  } catch (err) {
    error(err.message)
    debug('Failed to create thumbnail for', [`${fileinfo.id}`, {color: 'red'}], '(', [`${err.message}`, {color: 'red'}],')', req)
  }
}

export default upload
