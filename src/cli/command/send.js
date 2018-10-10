const Blockchain = require('../../blockchain/blockchain');
const p2p = require('../../p2p/p2p');
const {Transaction} = require('../../blockchain/transaction')

module.exports = function (vorpal) {
  vorpal
    .command('send', 'send value')
    .alias('s')
    .option('-s, --sendAddress <sendAddress>',"Which address to use")
    .option('-t, --toAddress <toAddress>',"Which address to send")
    .option('-v, --value [value]',"Value")
    .action(function(args, callback) {

      let obj = new Object(args.options)
      
      let sendAddr = obj['sendAddress'];
      let toAddr = obj['toAddress'];
      let value = obj['value'];
  
      let bc = Blockchain.newBlockChain();
      
      let tx = Transaction.NewUTXOTransaction(sendAddr, toAddr, value, bc);
      bc.mine([tx]);
  
      p2p.broadcastLatest()
      callback();
    })
}