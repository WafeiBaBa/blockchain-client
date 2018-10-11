const blockchain = require('../../blockchain/blockchain');
const logBlockchain = require('../util/table.js');

module.exports = function (vorpal) {
  vorpal
    .command('blockchain', 'See the current state of the blockchain.')
    .alias('bc')
    .option('-a, --address [address]','list the blockchain')
    .action(function(args, callback) {
      let obj = new Object(args.options);
      let addr = obj['address'] || "";
      logBlockchain(blockchain.blockchain);
      callback();
    })
};