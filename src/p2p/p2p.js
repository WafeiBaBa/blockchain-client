const messages = require('./messages/messages');
const {
  QUERY_LATEST,
  QUERY_ALL,
  RESPONSE_BLOCKCHAIN
} = require('./messages/message-type');
const wrtc = require('wrtc');
const Exchange = require('peer-exchange');
const p2p = new Exchange('blockchain.js', { wrtc: wrtc });
const net = require('net');
const blockchain = require('../blockchain/blockchain');
const logger = require('../cli/util/logger');

class PeerToPeer {
  constructor() {
    this.peers = [];
  }

  // start a server
  startServer (port) {
    const server = net.createServer(socket => p2p.accept(socket, (err, connection) => {
      if (err) {
        logger.log(`❗  ${err}`);
      } else {
        logger.log('👥  A peer has connected to the server!');
        this.initConnection.call(this, connection)
      }
    })).listen(port);
    logger.log(`📡  listening to peers on ${server.address().address}:${server.address().port}... `);
  }

  // connect to a peer server
  connectToPeer(host, port) {
    const socket = net.connect(port, host, () => p2p.connect(socket, (err, connection) => {
      if (err) {
        logger.log(`❗  ${err}`);
      } else {
        logger.log('👥  Successfully connected to a new peer!');
        this.initConnection.call(this, connection);
      }
    }));
  }

  discoverPeers() {
    p2p.getNewPeer((err) => {
      if (err) {
        logger.log(`❗  ${err}`);
      } else {
        logger.log('👀  Discovered new peers.') //todo
      }
    })
  }

  initConnection(connection) {
    this.peers.push(connection);
    this.initMessageHandler(connection);
    this.initErrorHandler(connection);
    this.write(connection, messages.getQueryChainLengthMsg());
  }

  initMessageHandler(connection) {
    connection.on('data', data => {
      const message = JSON.parse(data.toString('utf8'));
      this.handleMessage(connection, message);
    })
  }

  handleMessage(peer, message) {
    switch (message.type) {
      case QUERY_LATEST:
        logger.log(`⬇  Peer requested for latest block.`);
        this.write(peer, messages.getResponseLatestMsg(blockchain));
        break;
      case QUERY_ALL:
        logger.log("⬇  Peer requested for blockchain.");
        this.write(peer, messages.getResponseChainMsg(blockchain));
        break;
      case RESPONSE_BLOCKCHAIN:
        this.handleBlockchainResponse(message);
        break;
      default:
        logger.log(`❓  Received unknown message type ${message.type}`)
    }
  }

  initErrorHandler(connection) {
    connection.on('error', error => logger.log(`❗  ${error}`));
  }

  broadcastLatest () {
    this.broadcast(messages.getResponseLatestMsg(blockchain))
  }

  broadcast(message) {
    this.peers.forEach(peer => this.write(peer, message))
  }

  write(peer, message) {
    peer.write(JSON.stringify(message));
  }

  closeConnection() {

  }

  handleBlockchainResponse(message) {
    // const receivedBlocks = JSON.parse(message.data).sort();
    const receivedBlocks = JSON.parse(message.data).sort((b1, b2) => (b1.index - b2.index));

    // compare the received latest block and the latest block in host
    const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
    const latestBlockHeld = blockchain.latestBlock;

    // single block or a chain
    const blockOrChain = receivedBlocks.length === 1 ? 'single block' : 'blockchain';
    logger.log(`⬇  Peer sent over ${blockOrChain}.`);

    // the host blockchain is newer
    if (latestBlockReceived.index <= latestBlockHeld.index) {
      logger.log(`💤  Received latest block is not longer than current blockchain. Do nothing`);
      return null;
    }

    // the received block is newer
    logger.log(`🐢  Blockchain possibly behind. Received latest block is #${latestBlockReceived.index}. Current latest block is #${latestBlockHeld.index}.`);
    

    /* 
    * 1. previousHash is matched the host blockchain -> append the received block
    * 2. receive a single block
    * 3. peer blockchain is longer than current blockchain
    */
    if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
      logger.log(`👍  Previous hash received is equal to current hash. Append received block to blockchain.`);
      blockchain.addBlockFromPeer(latestBlockReceived);
      this.broadcast(messages.getResponseLatestMsg(blockchain))
    } else if (receivedBlocks.length === 1) {
      logger.log(`🤔  Received previous hash different from current hash. Get entire blockchain from peer.`);
      this.broadcast(messages.getQueryAllMsg())
    } else {
      logger.log(`⛓  Peer blockchain is longer than current blockchain.`);
      blockchain.replaceChain(receivedBlocks);
      this.broadcast(messages.getResponseLatestMsg(blockchain))
    }
  }
}


module.exports = new PeerToPeer();