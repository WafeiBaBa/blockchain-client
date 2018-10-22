const {Transaction} = require('./transaction');
const merkle = require('merkle');



module.exports = class Block {

  constructor (index, previousHash, timestamp, transactionDatas, hash, nonce) 
  {
    this.index = index;
    this.previousHash = previousHash.toString();
    this.timestamp = timestamp;
    this.transactionDatas = transactionDatas;
    this.hash = hash.toString();
    this.nonce = nonce;
    this.merkleRoot = Block.hashTransactions(this.transactionDatas);
  }

  // from object to string
  toString() {
    return JSON.stringify(this);
  }

  // from string to object
  static fromString(data) {
    let payload = JSON.parse(data);
    let block = new Block(
      payload.index,
      payload.previousHash, 
      payload.timestamp, 
      payload.transactionDatas, 
      payload.hash, 
      payload.nonce
    );
    block.transactionDatas = Transaction.txsFromString(payload.transactionDatas);
    return block;
  }
  

  // hash the transactions data using merkle tree
  static hashTransactions(transactionDatas){
    let data = [];
    transactionDatas.forEach(transaction => {
      data.push(JSON.stringify(transaction));
    });

    // use sha256 to create a merkle tree
    let tree = merkle("sha256").sync(data);

    // return the merkle root
    return tree.root();
  }
};