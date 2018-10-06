#!/usr/bin/env node

const vorpal = require('vorpal')();
// const Blockchain = require('./src/blockchain/blockchain')
// let blockchain = Blockchain.newBlockChain()
vorpal.use(require('./src/cli/cli'));

