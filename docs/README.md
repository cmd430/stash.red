# <svg version="1.1" width="700" height="120"><text style="font-family: 'Segoe UI', 'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;font-variant: small-caps;" font-size="130" x="0" y="100" fill="red">stash<tspan font-weight="bold" font-size="110">.red</tspan></text></svg>
[![Dependencies Status](https://david-dm.org/cmd430/stash.red/status.svg)](https://david-dm.org/cmd430/stash.red)

stash.red is a Small footprint File host (Specificly for Image/Video and Audio files) It contains:
 - Simple Authentication using Auth key
 - Disable Authentication to allow anonymous uploads
 - Simple Album and Single file support
 - User pages to see files uploaded by specific users
 - Ability to easily find content by User or by Album
 - Zero loss in quality of uploaded files

Installation
============
1. Install MongoDB (version `4.0+`)
2. Install NodeJS (version `10+`)
3. Clone the repository with: git clone `https://github.com/cmd430/stash.red.git`
4. Install dependencies `npm install --only=prod`
5. Start the server with `node server` or `npm run server`

### **Notes** 
 -  `mongod` will be automatically started as a child process
 - special directories will be created if missing
 - many settings can be changed in the `config.js` file

Documentation
============
 - TODO