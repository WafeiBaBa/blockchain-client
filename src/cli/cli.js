const vorpal = require('vorpal')();

module.exports = function (vorpal) {
  vorpal
    .use(require('./command/list-blockchain'))
    .use(require('./command/send'))
    .use(require('./command/open-port'))
    .use(require('./command/get-balance'))
    .use(require('./command/connect-peer'))
    .use(require('./util/welcome'))
    .delimiter('blockchain →')
    .show()
};
