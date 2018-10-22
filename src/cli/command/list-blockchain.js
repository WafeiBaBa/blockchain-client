const blockchain = require('../../blockchain/blockchain');
const logBlockchain = require('../util/table');

module.exports = function (vorpal) {
  vorpal
    .command('blockchain', 'See the current state of the blockchain.')
    .alias('bc')
    .action(function(args, callback) {
      logBlockchain(blockchain.blockchain);
      callback();
    })
};