const Block = require('./block');
const CryptoJS = require('crypto-js');
const logger = require('../cli/util/logger');
const spinner = require('../cli/util/spinner');
const logBlockchain = require('../cli/util/table');
const InCache = require('incache');
const {Transaction} = require('./transaction');

const genesisCoinBaseData = "Genesis Block";

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

  // create a new chain or load the chain from database
  static newBlockChain(address) {
    let store = new InCache({
      storeName: "blockchain",
      autoSave: true,
      autoSaveMode: "timer"
    });

    let bc;

    let blocksNum = store.count();
    if (blocksNum === 0) {
      let transaction = Transaction.newCoinBaseTX(address, genesisCoinBaseData);
      let genesis = this.genesisBlock([transaction]);
      bc = new Blockchain();
      bc.blockchain.push(genesis);

      store.set(genesis.index.toString(), genesis.toString())
    } 
    else{
      bc = new Blockchain();
      for (let i = 0; i < blocksNum; i++) {
        let indexString = i.toString();
        let currBlockString = store.get(indexString);
        let currBlock = Block.fromString(currBlockString);
        bc.blockchain.push(currBlock)
      }
    }
    bc.db = store;

    return bc
  }

  // get the current blockchain instance
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

  // replace the whole chain and store in database
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
      json.index, json.previousHash, json.timestamp, Transaction.txsFromString(json.transactionDatas), json.hash, json.nonce
    ));

    this.blockchain.forEach(newBlock => {
      let newIndexString = newBlock.index.toString();
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

  // add a new block to the chain
  addBlock (newBlock) {
    if (this.isValidNewBlock(newBlock, this.latestBlock)) {
      this.blockchain.push(newBlock);

      let newIndexString = newBlock.index.toString();
      this.db.set(newIndexString, newBlock.toString());
      return true;
    }
    return false;
  }

  // add block from peer
  addBlockFromPeer(json) {
    if (this.isValidNewBlock(json, this.latestBlock)) {
      let txs = Transaction.txsFromString(json.transactionDatas);
      let newBlock = new Block(
        json.index, 
        json.previousHash, 
        json.timestamp, 
        txs,
        json.hash, 
        json.nonce
      );
      this.blockchain.push(newBlock);

      let newIndexString = newBlock.index.toString();
      this.db.set(newIndexString, newBlock.toString())
    }
  }

  // set the block hash
  static calculateHashForBlock (block) {
    return Blockchain.calculateHash(block.index, block.previousHash,
      block.timestamp, block.transactionDatas, block.nonce)
  }

  static calculateHash (index, previousHash, timestamp, transactionDatas, nonce) {
    return CryptoJS.SHA256(index + previousHash + 
      timestamp + Block.hashTransactions(transactionDatas) + nonce).toString()
  }


  // validate the new block
  isValidNewBlock (newBlock, previousBlock) {
    const blockHash = Blockchain.calculateHashForBlock(newBlock);

    if (previousBlock.index + 1 !== newBlock.index) {
      logger.log('❌  new block has invalid index');
      return false
    } else if (previousBlock.hash !== newBlock.previousHash) {
      logger.log('❌  new block has invalid previous hash');
      return false
    } else if (blockHash !== newBlock.hash) {
      logger.log(`❌  invalid hash: ${blockHash} ${newBlock.hash}`);
      return false
    } else if (!this.isValidHashDifficulty(Blockchain.calculateHashForBlock(newBlock))) {
      logger.log(`❌  invalid hash does not meet difficulty requirements: ${Blockchain.calculateHashForBlock(newBlock)}`);
      return false;
    }
    return true
  }

  // generate next block by proof of work
  generateNextBlock (transactionDatas) {
    const previousBlock = this.latestBlock;
    const nextIndex = previousBlock.index + 1;
    const nextTimestamp = new Date().getTime();
    let nonce = 0;
    let nextHash = '';
    const randSpinner = spinner.getRandomSpinner();
    while(!this.isValidHashDifficulty(nextHash)) {     
      nonce = nonce + 1;
      nextHash = Blockchain.calculateHash(nextIndex, previousBlock.hash, nextTimestamp, transactionDatas, nonce);
      spinner.draw(randSpinner);
    }
    spinner.clear();
    const nextBlock = new Block(nextIndex, previousBlock.hash, nextTimestamp, transactionDatas, nextHash, nonce);
    logBlockchain([nextBlock]);
    return nextBlock;
  }

  // compare the new hash and the difficulty value
  isValidHashDifficulty(hash) {
    for (var i = 0, b = hash.length; i < b; i ++) {
      if (hash[i] !== '0') {
        break;
      }
    }
    return i === this.difficulty;
  }

  // find unspent transactions
  findUnspentTransactions(address) {
    let unspentTXs = [];
    let spentTXOs = {};

    for (let blockIndex = this.blockchain.length -1 ; blockIndex >= 0 ; blockIndex--) {
      let block = this.blockchain[blockIndex];
      
      for (let txIndex = 0; txIndex < block.transactionDatas.length; txIndex++) {
        let tx = block.transactionDatas[txIndex];
        let txId = tx.id;

        for (let outIndex = 0; outIndex < tx.vOut.length; outIndex++) {

          // if the output spent, then break
          let needToBreak = false;

          // determine whether the output is being spent
          if (spentTXOs[txId] != null && spentTXOs[txId] !== undefined) {
            for (let j = 0; j < spentTXOs[txId].length; j++) {
              if (spentTXOs[txId][j] === outIndex) {
                needToBreak = true;
                break;
              }
            }
          }

          if (needToBreak) {
            continue;
          }

          // if not be spent, put into the unspentTXs
          let out = tx.vOut[outIndex];
          
          if (out.canBeUnlockedWith(address)) {
            unspentTXs.push(tx);
          }
        }

        // if the transaction is not the coinbase transaction, calculate the input
        if (tx.isCoinBase() === false) {
          for (let inputIndex = 0; inputIndex < tx.vIn.length; inputIndex ++) {
            let vIn = tx.vIn[inputIndex];
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

  // find the unspent transaction outputs
  findUTXO(address) {
    let UTXOs = [];
    let txs = this.findUnspentTransactions(address);

    for (let txIndex = 0; txIndex < txs.length; txIndex ++) {
      for (let outIndex = 0; outIndex < txs[txIndex].vOut.length; outIndex ++) {
        if (txs[txIndex].vOut[outIndex].canBeUnlockedWith(address)) {
          UTXOs.push(txs[txIndex].vOut[outIndex]);
        }
      }
    }
    return UTXOs;
  }

  // find the spendable outputs
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

module.exports = Blockchain.newBlockChain("wafei");