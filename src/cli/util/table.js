const Table = require('cli-table2')
const logger = require('./logger.js');
const colors = require('colors/safe');

function logBlockchain(blockchain) {
  blockchain.forEach((block, index) => {
    const table = new Table({
      style:{border:[],header:[]},
      wordWrap: true,
      colWidths:[20,100],
      rowWiths:30
    });
    const object = JSON.parse(JSON.stringify(block))
    // console.log(JSON.stringify(object))
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
        for (let i = 0; i < object[key].length; i++) {
          for (const txKey in object[key][i]) {
            if (txKey === 'id') {
              let txObj = {}
              txObj[`📄  ${colors.red('Transaction')} ${colors.red('Id')}`] = JSON.stringify(object[key][i]['id'])
              table.push(txObj)
            }
            else if (txKey === 'vIn') {
              let txObj = {}
              txObj[`📄  ${colors.red('Transaction')} ${colors.red('TxInpot')}`] = JSON.stringify(object[key][i]['vIn'])
              table.push(txObj)
            }
            else if (txKey === 'vOut') {
              let txObj = {}
              txObj[`📄  ${colors.red('Transaction')} ${colors.red('TxOutpot')}`] = JSON.stringify(object[key][i]['vOut'])
              table.push(txObj)
            }
          }
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