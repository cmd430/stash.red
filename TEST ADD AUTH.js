const mongoose = require('mongoose')
const crypto = require('crypto')

const config = require('./config.js')
const app = {
  db: mongoose
}

if (config.mongo.auth.enabled) {
  app.db.connect(`mongodb://${config.mongo.user}:${config.mongo.pass}@${config.mongo.host}:${config.mongo.port}/${config.mongo.db}`, {
    useCreateIndex: true,
    useNewUrlParser: true
  })
} else {
  app.db.connect(`mongodb://${config.mongo.host}:${config.mongo.port}/${config.mongo.db}`, {
    useCreateIndex: true,
    useNewUrlParser: true
  })
}

const models = require('./routes/models.js')(app)

new models.auth({
  key: crypto.randomBytes(10).toString('hex'),
  user: 'user'
})
.save((err, product) => {
  if (err) {
    console.error(err)
  } else {
    console.log(product)
  }
})

models.auth.aggregate([{
  $project: {
    _id: 0
  }
}])
.exec()
.then(docs => {
  console.log(docs)
})
.catch(err => {
  console.error(err)
})


