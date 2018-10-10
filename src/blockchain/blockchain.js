const Block = require('./block');
const CryptoJS = require('crypto-js');
const logger = require('../cli/util/logger');
const spinner = require('../cli/util/spinner');
const logBlockchain = require('../cli/util/table');
const InCache = require('incache');
const {Transaction,TXInput,TXOutput} = require('./transaction');

const genesisCoinbaseData = "Genesis Block"

class Blockchain {
  constructor () {
    this.blockchain = [];
    this.difficulty = 2
  }

    // genesis block
  static genesisBlock(transactionDatas) {
    return new Block(
      0,
     '0',
      new Date().getTime(),
      transactionDatas,
      Block.hashTransactions(transactionDatas),
      12345
    )
  }

  static newBlockChain(address) {
    let store = new InCache({
      storeName: "blockchain",
      autoSave: true,
      autoSaveMode: "timer"
    })

    let bc

    let blocksNum = store.count()
    if (blocksNum == 0) {
      let transaction = Transaction.NewCoinbaseTX(address, genesisCoinbaseData);
      let genesis = this.genesisBlock([transaction])
      bc = new Blockchain()
      bc.blockchain.push(genesis)

      store.set(genesis.index.toString(), genesis.toString())
    } 
    else{
      bc = new Blockchain();
      for (let i = 0; i < blocksNum; i++) {
        let indexString = i.toString()
        let currBlockString = store.get(indexString)
        let currBlock = Block.fromString(currBlockString)
        bc.blockchain.push(currBlock)
      }
    }
    bc.db = store;


    // console.log(bc.blockchain.toString())
    return bc
  }

  get () {
    return this.blockchain
  }

  get latestBlock () {
    return this.blockchain[this.blockchain.length - 1]
  }

  mine (seed) {
    const newBlock = this.generateNextBlock(seed);
    if(this.addBlock(newBlock)) {
      logger.log("🎉  Congratulations! A new block was mined. 💎")
    }
  }

  replaceChain (newBlocks) {
    if (!this.isValidChain(newBlocks)) {
      logger.log("❌ Replacement chain is not valid. Won't replace existing blockchain.");
      return null;
    }

    if (newBlocks.length <= this.blockchain.length) {
      logger.log("❌  Replacement chain is shorter than original. Won't replace existing blockchain.");
      return null;
    }

    logger.log('✅  Received blockchain is valid. Replacing current blockchain with received blockchain');
    this.blockchain = newBlocks.map(json => new Block(
      json.index, json.previousHash, json.timestamp, json.transactionDatas, json.hash, json.nonce
    ))

    this.blockchain.forEach(newBlock => {
      let newIndexString = newBlock.index.toString()
      this.db.set(newIndexString, newBlock.toString())
    });
  }

  // validate the received chain
  isValidChain (blockchainToValidate) {
    if ((blockchainToValidate[0].hash) !== (Block.genesis.hash)) {
      return false
    }

    const tempBlocks = [blockchainToValidate[0]];
    for (let i = 1; i < blockchainToValidate.length; i = i + 1) {
      if (this.isValidNewBlock(blockchainToValidate[i], tempBlocks[i - 1])) {
        tempBlocks.push(blockchainToValidate[i])
      } else {
        return false
      }
    }
    return true
  }

  addBlock (newBlock) {
    if (this.isValidNewBlock(newBlock, this.latestBlock)) {
      this.blockchain.push(newBlock);

      let newIndexString = newBlock.index.toString()
      this.db.set(newIndexString, newBlock.toString())
      return true;
    }
    return false;
  }

  // from peer
  addBlockFromPeer(json) {
    if (this.isValidNewBlock(json, this.latestBlock)) {
      let newBlock = new Block(
        json.index, 
        json.previousHash, 
        json.timestamp, 
        json.transactionDatas, 
        json.hash, 
        json.nonce
      )
      this.blockchain.push(newBlock)

      let newIndexString = newBlock.index.toString()
      this.db.set(newIndexString, newBlock.toString())
    }
  }

  calculateHashForBlock (block) {
    return this.calculateHash(block.index, block.previousHash, 
      block.timestamp, block.transactionDatas, block.nonce)
  }

  calculateHash (index, previousHash, timestamp, transactionDatas, nonce) {
    return CryptoJS.SHA256(index + previousHash + 
      timestamp + Block.hashTransactions(transactionDatas) + nonce).toString()
  }

  isValidNewBlock (newBlock, previousBlock) {
    const blockHash = this.calculateHashForBlock(newBlock);

    if (previousBlock.index + 1 !== newBlock.index) {
      logger.log('❌  new block has invalid index');
      return false
    } else if (previousBlock.hash !== newBlock.previousHash) {
      logger.log('❌  new block has invalid previous hash');
      return false
    } else if (blockHash !== newBlock.hash) {
      logger.log(`❌  invalid hash: ${blockHash} ${newBlock.hash}`);
      return false
    } else if (!this.isValidHashDifficulty(this.calculateHashForBlock(newBlock))) {
      logger.log(`❌  invalid hash does not meet difficulty requirements: ${this.calculateHashForBlock(newBlock)}`);
      return false;
    }
    return true
  }

  generateNextBlock (transactionDatas) {
    const previousBlock = this.latestBlock;
    const nextIndex = previousBlock.index + 1;
    const nextTimestamp = new Date().getTime();
    let nonce = 0;
    let nextHash = '';
    const randSpinner = spinner.getRandomSpinner();
    while(!this.isValidHashDifficulty(nextHash)) {     
      nonce = nonce + 1;
      nextHash = this.calculateHash(nextIndex, previousBlock.hash, nextTimestamp, transactionDatas, nonce);
      spinner.draw(randSpinner);
    }
    spinner.clear();
    const nextBlock = new Block(nextIndex, previousBlock.hash, nextTimestamp, transactionDatas, nextHash, nonce);
    logBlockchain([nextBlock]);
    return nextBlock;
  }

  isValidHashDifficulty(hash) {
    for (var i = 0, b = hash.length; i < b; i ++) {
      if (hash[i] !== '0') {
        break;
      }
    }
    return i === this.difficulty;
  }

  findUnspentTransactions(address) {
    let unspentTXs = [];
    let spentTXOs = {};

    for (let blockIndex = 0; blockIndex < this.blockchain.length; blockIndex++) {
      let block = this.blockchain[blockIndex]
      
      for (let i = 0; i < block.transactionDatas.length; i++) {
        let tx = block.transactionDatas[i];
        let txId = tx.id;

        for (let outIdx = 0; outIdx < tx.vOut.length; outIdx++) {

          // 如果被花费掉了
          let needToBreak = false;

          // 任何tx，只要有输入，都会被放在spentTXOs里。在稍下面代码里。这里要判断是否已经花费
          if (spentTXOs[txId] != null && spentTXOs[txId] != undefined) {
            for (let j = 0; j < spentTXOs[txId].length; j++) {
              if (spentTXOs[txId][j] == outIdx) {
                needToBreak = true;
                break;
              }
            }
          }

          if (needToBreak) {
            continue;
          }

          let out = tx.vOut[outIdx];

          console.log(out)
          
          if (out.canBeUnlockedWith(address)) {
            unspentTXs.push(tx);
          }
        }

        if (tx.isCoinbase() == false) {
          for (let k = 0; k < tx.vIn.length; k ++) {
            let vIn = tx.vIn[k];
            if (vIn.canUnlockOutputWith(address)) {
              let vInId = vIn.txId;
              if (!spentTXOs[vInId]) {
                spentTXOs[vInId] = [];
              }
              spentTXOs[vInId].push(vIn.vOut);
            }
          }
        }
      }
    }

    return unspentTXs;
  }

  findUTXO(address) {
    let UTXOs = [];
    let txs = this.findUnspentTransactions(address);

    for (let i = 0; i < txs.length; i ++) {
      for (let j = 0; j < txs[i].vOut.length; j ++) {
        if (txs[i].vOut[j].canBeUnlockedWith(address)) {
          UTXOs.push(txs[i].vOut[j]);
        }
      }
    }
    return UTXOs;
  }

  findSpendableOutputs(address, amount) {
    let unspentOutputs = {};
    let unspentTxs = this.findUnspentTransactions(address);
    let accumulated = 0;

    for (let key in unspentTxs) {
      let tx = unspentTxs[key];
      let txId = tx.id;

      let needBreak = false;
      for (let outIdx = 0; outIdx < tx.vOut.length; outIdx ++) {
        let output = tx.vOut[outIdx];
        if (output.canBeUnlockedWith(address) && accumulated < amount) {
          accumulated += output.value;
          if (!unspentOutputs[txId]) 
            unspentOutputs[txId] = [];
          unspentOutputs[txId].push(outIdx);
          if (accumulated >= amount) {
            needBreak = true;
            break;
          }
        }
      }

      if (needBreak)
        break;
    }

    return {
      amount: accumulated,
      unspentOutputs: unspentOutputs
    };
  }

}

module.exports = Blockchain