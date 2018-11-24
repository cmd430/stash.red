# TheShed.red ![](./img/logo.png)
[![Dependencies Status](https://david-dm.org/cmd430/TheShed.red/status.svg)](https://david-dm.org/cmd430/TheShed.red)

TheShed.red is a Small footprint File host (Specificly for Image/Video and Audio files) It contains:
 - Simple Authentication using Auth key
 - Disable Authentication to allow anonymous uploads
 - Simple Album and Single file support
 - User pages to see files uploaded by specific users
 - Ability to easily find content by User or by Album

Installation
============
1. Install MongoDB (version `4.0+`)
2. Install NodeJS (version `10+`)
3. Clone the repository with: git clone `https://github.com/cmd430/TheShed.red.git`
4. Install dependencies `npm install`
5. Start the server with `node server` or `npm run server`

### **Notes** 
 -  `mongod` will be automatically started as a child process
 - special directories will be created if missing
 - many settings can be changed in the `config.js` file

Documentation
============
 - TODO