const p2p = require('../../p2p/p2p');
const logger = require('../util/logger');

module.exports = function (vorpal) {
  vorpal
    .command('open <port>', 'Open port to accept incoming connections. Eg: open 12345')
    .alias('o')
    .action(function(args, callback) {
      if (args.port) {
        if(typeof args.port === 'number') {
          p2p.startServer(args.port);
        } else {
          logger.log(`❌  invalid port!`)
        }
      }
      callback();
    })
};