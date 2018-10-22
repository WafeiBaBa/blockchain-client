const logger = require('./logger');
const vorpal = require('vorpal')();

module.exports = function (vorpal) {
  logger.log("👋  Welcome to Blockchain CLI!");
  vorpal.exec("help")
};