const Table = require('cli-table2')
const logger = require('./logger.js');
const colors = require('colors/safe');

function logBlockchain(blockchain) {
  blockchain.forEach((block, index) => {
    const table = new Table({
      style:{border:[],header:[]},
      wordWrap: true,
      colWidths:[20,120],
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
        let obj = [];

        // console.log(JSON.stringify(object[key]))
        for (let i = 0; i < object[key].length; i++) {
          obj[i] = {}
          let txObj = []
          for (const txKey in object[key][i]) {
            if (txKey === 'id') {
              console.log(JSON.stringify(object[key][i]['id']))
              obj[i][`📄  ${colors.red('Transaction')} ${colors.red(i.toString())} id`] = JSON.stringify(object[key][i]['id'])
            }
            else if (txKey === 'vIn') {
              console.log(JSON.stringify(object[key][i]['vIn']))
              obj[i][`📄  ${colors.red('Transaction')} TxInpot`] = JSON.stringify(object[key][i]['vIn'])
            }
            else if (txKey === 'vOut') {
              console.log(JSON.stringify(object[key][i]['vOut']))
              obj[i][`📄  ${colors.red('Transaction')} TxOutput`] = JSON.stringify(object[key][i]['vOut'])
            }
          }
          // obj[i][`📄  ${colors.red('Transaction')} ${colors.red(i.toString())}`] = JSON.stringify(object[key][i])
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