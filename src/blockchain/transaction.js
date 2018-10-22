const CryptoJS = require('crypto-js');
const logger = require('../cli/util/logger');

const SUBSIDY = 10;

class Transaction {
  constructor() {
    this.id = null;
    this.vIn = [];
    this.vOut = [];
  }

  // from json string to object
  static txsFromString(data) {
    if (typeof data === 'string') {
      data = JSON.parse(data);
    }

    let txs = [];
    for (let key in data) {
      let payload = data[key];
      let tx = new Transaction();
      tx.id = payload.id;

      // create txInput
      for( let j in payload.vIn) {
        let txInput = new TXInput(payload.vIn[j].txId, payload.vIn[j].vOut, payload.vIn[j].scriptSig);
        tx.vIn.push(txInput);
      }

      // create txOutput
      for( let i in payload.vOut) {
        let txOutput = new TXOutput(payload.vOut[i].value, payload.vOut[i].scriptPubKey);
        tx.vOut.push(txOutput);
      }

      txs.push(tx);
    }

    return txs;
  }

  // create coinbase transaction
  static newCoinBaseTX(to, data) {
    if (!data || data === '') {
      data = `Reward to ${to}`;
    }

    let txIn = new TXInput(0, -1, data);
    let txOut = new TXOutput(SUBSIDY, to);
    let transaction = new Transaction();
    transaction.vIn.push(txIn);
    transaction.vOut.push(txOut);

    transaction.setId();

    return transaction; 
  }

  // create new unspent transaction output
  static newUTXOTransaction(from, to, amount, bc) {
    let inputs = [];
    let outputs = [];

    let obj = bc.findSpendableOutputs(from, amount);
    let acc = obj.amount;
    let unspentOutputs = obj.unspentOutputs;

    if (acc < amount) {
      // console.error(`ERROR: Not enough funds`);
      logger.log(`❌ ERROR: Not enough funds`)
      return;
    }

    for (let txId in unspentOutputs) {
      let outs = unspentOutputs[txId];
      for (let key in outs) {
        let outIdx = outs[key];
        let input = new TXInput(txId, outIdx, from);
        inputs.push(input);
      }
    }

    outputs.push(new TXOutput(amount, to));

    if (acc > amount) {
      outputs.push(new TXOutput(acc - amount, from));
    }

    let tx = new Transaction();
    tx.vIn = inputs;
    tx.vOut = outputs;
    tx.setId();

    return tx;
  }

  setId() {
    let data = JSON.stringify(this);
    this.id = CryptoJS.SHA256(data).toString();
  }

  isCoinBase() {
    return this.vIn.length === 1 && this.vIn[0].txId === 0 && this.vIn[0].vOut === -1;
  }
}

class TXOutput {
  constructor(value, scriptPubKey) {

    // output value
    this.value = parseInt(value);

    // the signature
    this.scriptPubKey = scriptPubKey;
  }

  canBeUnlockedWith(unlockingData) {
    return this.scriptPubKey === unlockingData;
  }
}

class TXInput {
  constructor(txId, vOut, scriptSig) {

    // can detect the output
    this.txId = txId;

    // the index of output
    this.vOut = vOut;

    // the input address
    this.scriptSig = scriptSig;
  }

  // unlockingData means address
  canUnlockOutputWith(unlockingData) {
    return this.scriptSig === unlockingData;
  }


}

module.exports = {
  Transaction,
  TXOutput,
  TXInput
};