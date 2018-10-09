const blockchain = require('../../blockchain/blockchain');
const p2p = require('../../p2p/p2p');

module.exports = function (vorpal) {
  vorpal
    .command('mine <data>', 'Mine a new block. Eg: mine hello!')
    .alias('m')
    .action(function(args, callback) {
      if (args.data) {
        let dataInputs = []
        dataInputs.push(args.data)
        console.log(dataInputs)
        blockchain.mine(dataInputs);
        p2p.broadcastLatest(); 
      }
      callback();
    })
}