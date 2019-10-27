// PM2 Ecosystem file
// https://pm2.keymetrics.io/docs/usage/application-declaration/#generate-configuration

module.exports = {
  apps: [{
    name: "stash",
    script: "loader.js",
    watch: true,
    watch_delay: 1000,
    ignore_watch : [
      "node_modules",
      "docs",
      "storage",
      "logs"
    ],
    watch_options: {
      "followSymlinks": false
    },
    "args": [
      "--color"
    ],
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: false
  }]
}
