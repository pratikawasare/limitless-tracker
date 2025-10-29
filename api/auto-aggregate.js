const cache = require('../lib/dataStore');
const axios = require('axios');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    // Get trader data from Tampermonkey
    const tampermonkeyData = cache.get('limitless_data');

    if (!tampermonkeyData || !tampermonkeyData.leaderboard) {
      return res.status(200).json({
        success: true,
        message: '⚠️ No trader data yet. Run Tampermonkey script first.',
        leaderboardSize: 0,
        totalActiveTrades: 0,
        topMarkets: [],
        recentTrades: []
      });
    }

    const leaderboard = tampermonkeyData.leaderboard || [];
    
    console.log(`📊 Processing ${leaderboard.length} traders`);

    // Extract addresses
    const addresses = leaderboard.map(t => t.address);

    // Query blockchain for their positions
    try {
      const blockchainData = await queryBlockchainPositions(addresses);
      
      // Merge blockchain data with trader data
      const enrichedLeaderboard = leaderboard.map(trader => {
        const blockchainInfo = blockchainData.find(b => b.address === trader.address);
        return {
          ...trader,
          onChainBets: blockchainInfo?.bets || [],
          onChainActivity: blockchainInfo?.txCount || 0
        };
      });

      // Aggregate markets
      const markets = aggregateMarkets(enrichedLeaderboard);

      res.status(200).json({
        success: true,
        timestamp: Date.now(),
        dataSource: 'blockchain',
        leaderboardSize: enrichedLeaderboard.length,
        totalActiveTrades: blockchainData.reduce((sum, t) => sum + (t.txCount || 0), 0),
        topMarkets: markets.slice(0, 20),
        recentTrades: enrichedLeaderboard.map(t => ({
          rank: t.rank,
          address: t.address,
          username: t.username,
          volume: t.volume,
          onChainBets: t.onChainBets.length
        }))
      });

    } catch (error) {
      console.error('Blockchain query failed:', error);
      
      // Fallback to basic data
      res.status(200).json({
        success: true,
        timestamp: Date.now(),
        dataSource: 'cache',
        leaderboardSize: leaderboard.length,
        totalActiveTrades: 0,
        topMarkets: [],
        recentTrades: leaderboard.map(t => ({
          rank: t.rank,
          address: t.address,
          username: t.username,
          volume: t.volume,
          onChainBets: 0
        })),
        warning: 'Blockchain data unavailable - showing cached data'
      });
    }

  } catch (error) {
    console.error('Aggregate error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

async function queryBlockchainPositions(addresses) {
  // This is a placeholder - will implement actual blockchain queries
  const results = [];
  
  for (const address of addresses) {
    // Query Base blockchain for this address
    // For now, return mock structure
    results.push({
      address: address,
      txCount: 0,
      bets: []
    });
  }
  
  return results;
}

function aggregateMarkets(traders) {
  const markets = {};
  
  traders.forEach(trader => {
    if (trader.onChainBets && trader.onChainBets.length > 0) {
      trader.onChainBets.forEach(bet => {
        if (!markets[bet.market]) {
          markets[bet.market] = {
            title: bet.market,
            traders: [],
            yesCount: 0,
            noCount: 0
          };
        }
        
        markets[bet.market].traders.push(trader);
        if (bet.side === 'YES') markets[bet.market].yesCount++;
        if (bet.side === 'NO') markets[bet.market].noCount++;
      });
    }
  });
  
  return Object.values(markets).sort((a, b) => b.traders.length - a.traders.length);
}
