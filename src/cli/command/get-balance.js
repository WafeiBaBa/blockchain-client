const logger = require('../util/logger.js');
const blockchain = require('../../blockchain/blockchain');
const {Transaction} = require('../../blockchain/transaction');

module.exports = function (vorpal) {
  vorpal
    .command('getbalance', 'Get the list of connected peers.')
    .alias('g')
    .option('-a, --address <address>',"check the balance of this address")
    .action(function(args, callback) {
        let obj = new Object(args.options);
      
        let addr = obj['address'] || "";
        let UTXOs = blockchain.findUTXO(addr);
        // logger.log(UTXOs);
        let amount = 0;
        for (let i = 0; i < UTXOs.length; i ++) {
          amount += UTXOs[i].value;
        }

        logger.log(`Balance of ${addr}: ${amount}`);
        callback();
    })
};