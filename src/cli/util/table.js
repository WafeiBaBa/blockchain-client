const Table = require('cli-table2')
const logger = require('./logger.js');
const colors = require('colors/safe');

function logBlockchain(blockchain) {
  blockchain.forEach((block, index) => {
    const table = new Table({
      style:{border:[],header:[]},
      wordWrap: true,
      colWidths:[20,66]
    });
    const object = JSON.parse(JSON.stringify(block))
    for(let key in object) {
      if (key === 'index') {
        const blockNumber = object[key]
        if (blockNumber === 0) {
          table.push([{colSpan:2,content:colors.green.bold("🏆  Genesis Block"), hAlign:'center'}])
        } else {
          table.push([{colSpan:2,content:colors.green.bold(`⛓  Block #${object[key]}`), hAlign:'center'}])
        }
      } 
      else if (key === 'transactionDatas') {
        // obj[`📄  ${colors.red('Transaction')}`] = object[key].toString()
        let obj = [];
        for (let i = 0; i < object[key].length; i++) {
          obj[i] = {}
          obj[i][`📄  ${colors.red('Transaction')} ${colors.red(i.toString())}`] = object[key][i].toString()
          table.push(obj[i])
        }
      }
      else {
        const obj = {};
        if (key === 'previousHash') {
          obj[`⏮  ${colors.red('Previous Hash')}`] = object[key]
        } else if (key === 'timestamp') {
          obj[`📅  ${colors.red('Timestamp')}`] = new Date(object[key]).toUTCString()
        }  else if (key === 'hash') {
          obj[`📛  ${colors.red('Hash')}`] = object[key]
        } else if (key === 'nonce') {
          obj[`🔨  ${colors.red('Nonce')}`] = object[key]
        }
        table.push(obj)
      }
    }
    logger.log(table.toString())
  })
}

module.exports = logBlockchain;