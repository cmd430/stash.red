import { createWriteStream, unlink, rename } from 'fs'
import { join, basename } from 'path'
import createError from 'http-errors'
import { createID } from '../utils/helpers'
import { info, debug, error } from './logger'
import database from 'better-sqlite3-helper'
import { get } from 'http'
import { get as secureGet } from 'https'
import signature from 'stream-signature'
import { getExtension } from 'mime'
import sharp from 'sharp'
import { resolve } from 'url';

const storage = join(__dirname, '..', 'storage')

sharp.cache(false)

function upload (req, res, next) {
  let upload_from = req.baseUrl.split('/').pop()
  let user = req.isAuthenticated()
  if (!user) return next(createError(401))

  debug(`${user.username}`,
    ['Started upload', {color: 'limegreen'}],
    'from', (upload_from === ''
      ? (['Homepage', {color: 'cyan'}])
      : (['Album (', {color: 'cyan'}], [`${req.url.split('/')[1]}`, {color: 'yellow'}], [')', {color: 'cyan'}])
    ), req)

  let upload_tracker = {
    parsed: 0,
    written: 0,
    removed: 0,
    options: {
      title: null,
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
      ++upload_tracker.parsed

      // TEMP
      ++upload_tracker.written
      console.log(key, value)

      req.unpipe(req.busboy)
      req.resume()
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
          in_album: uploadinfo.album.album_id,
          public: uploadinfo.album.public
        }))
      })

      try {
        const insert_album = database().prepare(`INSERT INTO albums (album_id, title, uploaded_by, uploaded_at, public)
                                                 VALUES (@album_id, @title, @uploaded_by, @uploaded_at, @public)`)
        const insert_file = database().prepare(`INSERT INTO files (file_id, uploaded_by, uploaded_at, original_filename, mimetype, filesize, in_album, public)
                                                VALUES (@file_id, @uploaded_by, @uploaded_at, @original_filename, @mimetype, @filesize, @in_album, @public)`)
        const insert_files = database().transaction(files => { for (const file of files) insert_file.run(file) })
        const create_album = database().transaction(album => {
          insert_album.run(album)
          insert_files(uploadinfo.files)
        })
        create_album(uploadinfo.album)
      } catch (err) {
        upload_tracker.status = 'abort'

        debug(err.message, req) // TEMP WILL BE BETTER DEBUG MSGS ONCE IM BACK HOME

        return res.status(409).json({ message: 'Could Not Add Database Entrys' })
      }
    } else if (upload_tracker.written === 1) {
      // Single file
      uploadinfo = Object.assign(upload_tracker.file_info[0], {
        uploaded_by: user.username,
        uploaded_at: new Date().toISOString(),
        public: +upload_tracker.options.public
      })

      if (upload_from === 'a') uploadinfo.in_album = req.url.split('/')[1] // Adding to Album

      try {
        database().insert('files', uploadinfo)
      } catch (err) {
        upload_tracker.status = 'abort'

        debug(err.message, req) // TEMP WILL BE BETTER DEBUG MSGS ONCE IM BACK HOME

        return res.status(409).json({ message: 'Could Not Add Database Entry' })
      }
    }

    if (uploadinfo.hasOwnProperty('album')) {

    } else {

    }

    upload_tracker.file_info.forEach((file, index) => {
      let type = file.mimetype.split('/')[0]
      let temp_loc = join(storage, 'temp', file.file_id)
      let final_loc = join(storage, type, `${file.file_id}.${getExtension(file.mimetype)}`)

      rename(temp_loc, final_loc, err => {
        if (!err) debug(`Moved '${file.file_id}' from 'temp' to '${type}'`, req) // TEMP WILL BE BETTER DEBUG MSGS ONCE IM BACK HOME
        if (err) debug('File', [`${file.file_id}`, {color: 'red'}], 'unable to be moved (', [`${err.code}`, {color: 'red'}], ')', req)
        if (index === temp.files.length - 1) {
          upload_tracker.status = 'complete'

          return res.status(201).json({ message: 'IT WORKS!' }) // TEMP
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

export default upload