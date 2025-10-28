const NodeCache = require('node-cache');

// Single shared cache instance
const sharedCache = new NodeCache({ 
  stdTTL: 600, // 10 minutes
  checkperiod: 60 
});

module.exports = sharedCache;
