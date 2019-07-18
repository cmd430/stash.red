module.exports = (config, app, common) => {

  class queryDB {

    constructor(options = {}) {
      this.options = {
        showPrivate: options.showPrivate ? true : false,
        withThumbnail: options.withThumbnail ? true : false,
        showArtwork: options.showArtwork ? true : false,
        paginate: options.paginate ? true : false,
        page: options.paginate ? options.page || 1 : 1
      }
      this.projection = {
        _id: 0
      }
    }

    async getFile(id, opts, callback) {
      if (opts instanceof Function) {
        callback = opts
        opts = {}
      }
      if (!this.options.withThumbnail && !this.options.showArtwork) {
        this.projection['meta.thumbnail'] = 0
      }
      opts = {
        albumFiles: (opts.albumFiles ? true : false)
      }
      let query = {
        id: id,
        'meta.public': {
          $in: [
            true,
            !this.options.showPrivate
          ]
        }
      }
      if (opts.albumFiles) {
        query = {
          'meta.album': id,
          'meta.public': {
            $in: [
              true,
              !this.options.showPrivate
            ]
          }
        }
      }
      return app.db.models.file.paginate(query, {
        lean: true,
        leanWithId: false,
        sort: {
          'meta.uploaded.at': 'descending'
        },
        limit: (this.options.paginate ? config.mongo.paginate.limit : Number.MAX_SAFE_INTEGER),
        page: this.options.page,
        select: this.projection
      })
      .then(async result => {
        if (result.docs) {
          result = result.docs
        }
        if (result.length > 0) {
          if (this.options.showArtwork) {
            // handle showing art for songs
            // on file/album pages where we
            // disable thumbnails
            await common.asyncForEach(result, doc => {
              if (doc.meta.type === 'audio') {
                doc.meta.song.artwork = doc.meta.thumbnail
              }
              if (!this.options.withThumbnail) {
                delete doc.meta.thumbnail
              }
            })
          }
          if (opts.albumFiles) {
            return Promise.resolve(result)
          } else {
            return callback(null, result)
          }
        } else {
          if (opts.albumFiles) {
            return []
          } else {
            return callback({
              status: 404
            })
          }
        }
      })
    }

    async getAlbum(id, opts, callback) {
      if (opts instanceof Function) {
        callback = opts
        opts = {}
      }
      if (!this.options.withThumbnail && !this.options.showArtwork) {
        this.projection['meta.thumbnail'] = 0
      }
      opts = {
        albumMetaOnly: (opts.albumMetaOnly ? true : false)
      }
      return app.db.models.album.paginate({
        id: id,
        'meta.public': {
          $in: [
            true,
            !this.options.showPrivate
          ]
        }
      }, {
        lean: true,
        leanWithId: false,
        sort: {
          'meta.uploaded.at': 'descending'
        },
        limit: (this.options.paginate ? config.mongo.paginate.limit : Number.MAX_SAFE_INTEGER),
        page: this.options.page,
        select: this.projection
      })
      .then(async album => {
        if (album.docs) {
          album = album.docs
        }
        if (album.length === 1) {
          if (opts.albumMetaOnly) {
            return callback(null, album)
          } else {
            let files = await this.getFile(id, {
              albumFiles: true
            })
            if (files.length > 0) {
              album[0].files = files
              return callback(null, album)
            } else {
              return callback({
                status: 404
              })
            }
          }
        } else {
          return callback({
            status: 404
          })
        }
      })
    }

    async getUser(id, opts, callback) {
      if (opts instanceof Function) {
        callback = opts
        opts = {}
      }
      return app.db.models.auth.paginate({
        'username': id,
      }, {
        lean: true,
        leanWithId: false,
        select: this.projection
      })
      .then(async user => {
        if (user.docs) {
          user = user.docs
        }
        if (user.length > 0) {
          user = {
            meta: {
              username: id,
              type: 'user',
              page: this.options.page
            },
            albums: [],
            files: [],
            path: `/u/${id}`
          }
          let albums = await app.db.models.album.paginate({
            'meta.uploaded.by': id,
            'meta.public': {
              $in: [
                true,
                !this.options.showPrivate
              ]
            }
          }, {
            lean: true,
            leanWithId: false,
            sort: {
              'meta.uploaded.at': 'descending'
            },
            limit: (this.options.paginate ? config.mongo.paginate.limit : Number.MAX_SAFE_INTEGER),
            page: this.options.page,
            select: this.projection
          })
          .then(result => {
            return result.docs
          })
          await common.asyncForEach(albums, async album => {
            await app.db.models.file.paginate({
              'meta.album': album.id,
              'meta.public': {
                $in: [
                  true,
                  !this.options.showPrivate
                ]
              }
            }, {
              lean: true,
              leanWithId: false,
              sort: {
                'meta.uploaded.at': 'descending'
              },
              limit: 1,
              page: 1,
              select: {
                _id: 0,
                'meta.thumbnail': 1
              }
            })
            .then(result => {
              album.meta.thumbnail = result.docs[0].meta.thumbnail
            })
          })
          let files = await app.db.models.file.paginate({
            'meta.uploaded.by': id,
            'meta.album': {
              $exists: false
            },
            'meta.public': {
              $in: [
                true,
                !this.options.showPrivate
              ]
            }
          }, {
            lean: true,
            leanWithId: false,
            sort: {
              'meta.uploaded.at': 'descending'
            },
            limit: (this.options.paginate ? config.mongo.paginate.limit : Number.MAX_SAFE_INTEGER),
            page: this.options.page,
            select: this.projection
          })
          .then(result => {
            return result.docs
          })
          user.albums = albums
          user.files = files
          return callback(null, [user])
        } else {
          return callback({
            status: 404
          })
        }
      })
    }

  }

  return queryDB

}

/*

.catch(err => {
      if (err.message === 'Cannot read property \'meta\' of undefined') {
        // if a user hasnot uploaded anything this error will be thrown
        return callback({
          status: 404,
        })
      }
      return callback({
        status: 500,
      })
    })

*/