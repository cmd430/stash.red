import { createWriteStream, unlink } from 'fs'
import { join, basename } from 'path'
import createError from 'http-errors'
import { createID } from '../utils/helpers'
import { info, debug, error } from './logger'
import database from 'better-sqlite3-helper'
import { get } from 'http'
import { get as secureGet } from 'https'
import signature from 'stream-signature'
import sharp from 'sharp'
import { resolve } from 'url';

const storage = join(__dirname, '..', 'storage')

sharp.cache(false)

function upload (req, res, next) {
  let user = req.isAuthenticated()
  if (!user) return next(createError(401))

  debug(`${user.username}`, ['Started upload', {color: 'limegreen'}], req)

  let upload_from = req.baseUrl.split('/').pop()
  if (upload_from === '') {
    debug('Upload from', ['Homepage', {color: 'cyan'}], req)
  } else if (upload_from === 'a') {
    debug('Upload from', ['Album (', {color: 'cyan'}], [`${req.url.split('/')[1]}`, {color: 'yellow'}], [')', {color: 'cyan'}], req)
  }

  let upload_tracker = {
    parsed: 0,
    written: 0,
    removed: 0,
    options: {
      title: '',
      public: true
    },
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
      uploaded_by: user.username,
      uploaded_at: new Date().toISOString(),
      file_id: createID(),
      original_filename: filename,
      mimetype: null,
      filesize: 0,
      in_album: null,
      public: null
    }
    let temp_dest = join(storage, 'temp', fileinfo.file_id)

    debug('Parsing file', [`${filename}`, {color:'cyan'}], '=>', [`${fileinfo.file_id}`, {color:'cyan'}], req)

    let writeStream = createWriteStream(temp_dest)
    let fileSignature = new signature()

    temp.streams.push(writeStream)
    temp.files.push(temp_dest)

    fileSignature.on('signature', sig => {
      mimetype = sig.mimetype
      let mime_parts = mimetype.split('/')
      if (mime_parts[0] !== 'image' && mime_parts[0] !== 'audio' && mime_parts[0] !== 'video') {
        upload_tracker.status = 'abort'

        debug('Upload of', [`${fileinfo.file_id}`, {color: 'red'}], 'rejected file magic is invaild (', [`${mimetype}`, {color: 'red'}], ')', req)

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

    let uploadinfo = {
      album: {},
      file: {}
    }

    if (upload_tracker.written > 1) uploadinfo.album.album_id = upload_from === 'a'
      ? req.url.split('/')[1]
      : createID()

    //TEMP
    console.log(uploadinfo)

    // LAST!
    //upload_tracker.status = 'complete'
  })

  /**
   * End of Request, Clean Up
   */
  req.on('close', () => {
    if (upload_tracker.status === 'complete') return debug(`${user.username}`, ['Upload completed', {color: 'limegreen'}], req)
    if (temp.files.length === 0) return debug(`${user.username}`, ['Nothing uploaded', {color: 'orange'}], req)

    debug(`${user.username}`, ['Aborted upload removing', {color: 'red'}], [`${temp.files.length}`, {color: 'cyan'}], ['files', {color: 'red'}], req)

    new Promise((resolve, reject) => {
      temp.files.forEach((file, index) => {
        temp.streams[index].end()
        unlink(file, err => {
          if (err) debug('File', [`${basename(file)}`, {color: 'red'}], 'unable to be removed', req)
          if (!err) ++upload_tracker.removed
          if (index === temp.files.length - 1) resolve()
        })
      })
    })
    .then(() => {
      debug([`${upload_tracker.removed}`, {color: 'red'}], 'Files removed', req)
    })
  })

  req.pipe(req.busboy)
}

export default upload