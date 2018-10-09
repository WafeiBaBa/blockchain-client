const Block = require('./block');
const CryptoJS = require('crypto-js');
const logger = require('../cli/util/logger');
const spinner = require('../cli/util/spinner');
const logBlockchain = require('../cli/util/table');
const InCache = require('incache');

class Blockchain {
  constructor () {
    this.blockchain = [];
    this.difficulty = 2
  }

  static newBlockChain() {
    let store = new InCache({
      storeName: "blockchain",
      autoSave: true,
      autoSaveMode: "timer"
    })

    let bc

    let blocksNum = store.count()
    if (blocksNum == 0) {
      let genesis = Block.genesis
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


    console.log(bc.blockchain.toString())
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
      timestamp + this.hashTransactions(transactionDatas) + nonce).toString()
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

  hashTransactions(transactionDatas){
    let data
    transactionDatas.forEach(transaction => {
      data += transaction
    });
    return CryptoJS.SHA256(data).toString()
  }
}

module.exports = Blockchain.newBlockChain()