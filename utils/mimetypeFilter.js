// Fix some mimetypes downloading, might be a better way to handle

export default function mimetypeFilter (mimetype) {
  mimetype = mimetype.replace('x-matroska', 'webm')

  return mimetype
}
