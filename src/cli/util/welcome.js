const logger = require('./logger.js');
const vorpal = require('vorpal')();

module.exports = function (vorpal) {
  logger.log("👋  Welcome to Blockchain client!");
  vorpal.exec("help")
}