module.exports = class Block {

  // genesis block
  static get genesis () {
    return new Block(
      0,
      '0',
      new Date().getTime(),
      ['Genesis Block', 'I am Wafei! welcome to the blockchain world!'],
      '0000018035a828da0878ae92ab6fbb16be1ca87a02a3feaa9e3c2b6871931046',
      12345
    )
  }
  constructor (
    index = 0,
    previousHash = '0',
    timestamp = new Date().getTime(),
    transactionDatas = [],
    hash = '',
    nonce = 0
  ) 
  {
    this.index = index
    this.previousHash = previousHash.toString()
    this.timestamp = timestamp
    this.transactionDatas = transactionDatas
    this.hash = hash.toString()
    this.nonce = nonce
  }

  toString() {
    return JSON.stringify(this);
  }

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
    return block;
  }
}