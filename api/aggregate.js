const cache = require('../lib/dataStore');
const axios = require('axios');

// Limitless might have GraphQL or REST API
const LIMITLESS_API = 'https://limitless.exchange/api';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    // Get trader data
    const data = cache.get('limitless_data');

    if (!data || !data.leaderboard || data.leaderboard.length === 0) {
      return res.status(200).json({
        success: true,
        message: '⚠️ No data yet. Extract traders using Tampermonkey.',
        leaderboardSize: 0,
        totalActiveTrades: 0,
        topMarkets: [],
        recentTrades: []
      });
    }

    const leaderboard = data.leaderboard;
    const addresses = leaderboard.map(t => t.address);

    console.log(`📊 Fetching positions for ${addresses.length} traders`);

    // Try to query positions for each trader
    const enrichedTraders = [];
    let totalBets = 0;
    const allMarkets = {};

    for (const trader of leaderboard) {
      try {
        // Try to fetch trader's positions from Limitless API
        const positions = await fetchTraderPositions(trader.address);
        
        trader.bets = positions;
        totalBets += positions.length;

        // Aggregate markets
        positions.forEach(pos => {
          if (!allMarkets[pos.market]) {
            allMarkets[pos.market] = {
              title: pos.market,
              traders: [],
              yesCount: 0,
              noCount: 0,
              totalVolume: 0
            };
          }

          allMarkets[pos.market].traders.push({
            address: trader.address,
            username: trader.username,
            rank: trader.rank
          });

          if (pos.side === 'YES') allMarkets[pos.market].yesCount++;
          if (pos.side === 'NO') allMarkets[pos.market].noCount++;
          allMarkets[pos.market].totalVolume += parseFloat(pos.value || 0);
        });

        enrichedTraders.push(trader);

      } catch (error) {
        console.error(`Error fetching positions for ${trader.address}:`, error.message);
        enrichedTraders.push(trader);
      }
    }

    // Sort markets by trader count
    const topMarkets = Object.values(allMarkets)
      .sort((a, b) => b.traders.length - a.traders.length)
      .slice(0, 20);

    const totalVolume = leaderboard.reduce((sum, t) => {
      return sum + parseFloat(t.volume?.toString().replace(/,/g, '') || 0);
    }, 0);

    res.status(200).json({
      success: true,
      timestamp: Date.now(),
      dataSource: 'limitless-api',
      leaderboardSize: enrichedTraders.length,
      totalActiveTrades: totalBets,
      totalVolume: totalVolume,
      topMarkets: topMarkets,
      recentTrades: enrichedTraders.map(t => ({
        rank: t.rank,
        address: t.address,
        username: t.username,
        volume: t.volume,
        activeBets: t.bets?.length || 0
      }))
    });

  } catch (error) {
    console.error('Aggregate error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

async function fetchTraderPositions(address) {
  // Try multiple API endpoints
  const endpoints = [
    `https://limitless.exchange/api/users/${address}/positions`,
    `https://limitless.exchange/api/v1/positions/${address}`,
    `https://api.limitless.exchange/positions/${address}`
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        }
      });

      if (response.data) {
        // Parse response
        const positions = Array.isArray(response.data) ? response.data : response.data.positions || [];
        
        return positions.map(p => ({
          market: p.market || p.marketTitle || p.question || 'Unknown',
          side: p.side || p.outcome || 'Unknown',
          value: p.value || p.shares || p.amount || 0
        }));
      }
    } catch (error) {
      // Try next endpoint
      continue;
    }
  }

  // No API worked, return empty
  return [];
}
