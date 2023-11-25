// PM2 Ecosystem file
// https://pm2.keymetrics.io/docs/usage/application-declaration/#generate-configuration

module.exports = {
  apps: [ {
    name: 'stash',
    script: 'main.js',
    watch: false,
    env: {
      'NODE_ENV': 'production'
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: false
  } ]
}
