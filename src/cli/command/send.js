const blockchain = require('../../blockchain/blockchain');
const p2p = require('../../p2p/p2p');
const {Transaction} = require('../../blockchain/transaction');

module.exports = function (vorpal) {
  vorpal
    .command('send', 'send value to someone')
    .alias('s')
    .option('-f, --sendAddress <sendAddress>',"Which address to use")
    .option('-t, --toAddress <toAddress>',"Which address to send")
    .option('-v, --value [value]',"Value")
    .action(function(args, callback) {

      let obj = new Object(args.options);
      
      let sendAddress = obj['sendAddress'];
      let toAddrress = obj['toAddress'];
      let value = obj['value'];
  
      let bc = blockchain;
      
      try {
        let tx = Transaction.newUTXOTransaction(sendAddress, toAddrress, value, bc);
        bc.mine([tx]);
        p2p.broadcastLatest();
      } catch (e) {
        console.log(e.message);
      }

      callback();
    })
};