const Block = require('./block');
const CryptoJS = require('crypto-js');
const logger = require('../cli/util/logger');
const spinner = require('../cli/util/spinner');
const logBlockchain = require('../cli/util/table');
const InCache = require('incache')
// const level = require('level');
// const chainDB = './chainData';
// const db = level(chainDB);

class Blockchain {
  constructor () {
    this.blockchain = [];
    this.difficulty = 4
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

    return bc
  }

  get () {
    return Blockchain.newBlockChain()
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
      json.index, json.previousHash, json.timestamp, json.data, json.hash, json.nonce
    ))
  }

  isValidChain (blockchainToValidate) {
    if (JSON.stringify(blockchainToValidate[0]) !== JSON.stringify(Block.genesis)) {
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
      let newIndexString = newBlock.index.toString()
      this.db.set(newIndexString, newBlock.toString())
      this.blockchain.push(newBlock);
      return true;
    }
    return false;
  }

  addBlockFromPeer(json) {
    if (this.isValidNewBlock(json, this.latestBlock)) {
      this.blockchain.push(new Block(
        json.index, json.previousHash, json.timestamp, json.data, json.hash, json.nonce
      ))
    }
  }

  calculateHashForBlock (block) {
    return this.calculateHash(block.index, block.previousHash, block.timestamp, block.data, block.nonce)
  }

  calculateHash (index, previousHash, timestamp, data, nonce) {
    return CryptoJS.SHA256(index + previousHash + timestamp + data + nonce).toString()
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

  generateNextBlock (blockData) {
    const previousBlock = this.latestBlock;
    const nextIndex = previousBlock.index + 1;
    const nextTimestamp = new Date().getTime() / 1000;
    let nonce = 0;
    let nextHash = '';
    const randSpinner = spinner.getRandomSpinner();
    while(!this.isValidHashDifficulty(nextHash)) {     
      nonce = nonce + 1;
      nextHash = this.calculateHash(nextIndex, previousBlock.hash, nextTimestamp, blockData, nonce);
      spinner.draw(randSpinner);
    }
    spinner.clear();
    const nextBlock = new Block(nextIndex, previousBlock.hash, nextTimestamp, blockData, nextHash, nonce);
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

  // async getBlock(index){
  //   return JSON.parse(await this.getBlockFromDB(index))
  // }

  // getBlockFromDB(key){
  //   return new Promise((resolve,reject) => {
  //       db.get(key,(error,value) => {
  //         if (error) {
  //           reject(error);
  //         }
  //         resolve(value);
  //       })
  //     })
  // }

  // async addBlock(newBlock){
  //   if (newBlock.index > 0) {
  //       if (this.isValidNewBlock(newBlock, this.latestBlock)) {
  //           await this.addBlockToDB(newBlock.index, JSON.stringify(newBlock));
  //           this.blockchain.push(newBlock);
  //           return true
  //       }else {
  //           return false
  //       }
  //   }else if (newBlock.index == 0) {
  //       await this.addBlockToDB(newBlock.index, JSON.stringify(newBlock));
  //       return true
  //   }
  // }

  // addBlockToDB(key,value){
  //   // db.put(key, value, function(err) {
  //   //   if (err) return console.log('Block ' + key + ' submission failed', err);
  //   // })
  //   return new Promise((resolve, reject) => {
  //     db.put(key,value,(error) => {
  //       if (error) {
  //         reject(error);
  //       }
  //       resolve(`Add block #${key}`);
  //     })
  //   })
  // }

  // async getBlockIndex(){
  //   return await this.getBlockIndexFromDB()
  // }

  // getBlockIndexFromDB(){
  //   return new Promise((resolve,reject) => {
  //       let index = -1;
  //       db.createReadStream().on('data',(data) => {
  //         index++
  //       }).on('error',(error) => {
  //         reject(error)
  //       }).on('close',() => {
  //         resolve(index)
  //       })
  //     })
  // }

  // loadBlockFromDB(){
  //   return new Promise((resolve, reject) => {
  //     db.createReadStream().on('data',(data) => {
  //       this.blockchain.push(JSON.parse(data.value))
  //     }).on('error',(error) => {
  //         reject(error)
  //     }).on('close',() => {
  //         resolve(this.blockchain)
  //     })
  //   })
  // }
}

// function newBlockChain() {
//   return db.get('l')
//     .then(() => {
//       return Promise.resolve(new BlockChain(db));
//     })
//     .catch((e) => {
//       const genesis = BlockChain.newGenesisBlock();
//       return db.put('l', genesis.hash)
//         .then(() => {
//           return db.put(genesis.hash, genesis.serialize());
//         })
//         .then(() => {
//           return Promise.resolve(new BlockChain(db));
//         })
//     })
// }

module.exports = Blockchain.newBlockChain()