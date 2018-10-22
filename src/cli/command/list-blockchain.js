const blockchain = require('../../blockchain/blockchain');
const logBlockchain = require('../util/table');

module.exports = function (vorpal) {
  vorpal
    .command('blockchain', 'See the current state of the blockchain.')
    .alias('bc')
    .option('-i, --index <index>',"see the block by index")
    .action(function(args, callback) {
      let bc = [];
      let obj = new Object(args.options);


      if (obj['index'] === undefined) {
        bc = blockchain.blockchain;
      } else {
        let index = obj['index'];
        let i = parseInt(index);
        bc.push(blockchain.blockchain[i]);
      }
      

      logBlockchain(bc);
      callback();
    })
};