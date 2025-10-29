const fs = require('fs');

const DATA_FILE = '/tmp/limitless-data.json';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    // Check if data file exists
    if (!fs.existsSync(DATA_FILE)) {
      return res.status(200).json({
        success: true,
        message: '⚠️ No data yet. Extract traders using Tampermonkey script.',
        leaderboardSize: 0,
        totalActiveTrades: 0,
        totalVolume: 0,
        topMarkets: [],
        recentTrades: []
      });
    }

    // Read data from file
    const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(fileContent);
    
    const leaderboard = data.leaderboard || [];
    const markets = data.markets || {};

    console.log(`✅ Serving ${leaderboard.length} traders from file`);

    // Calculate total volume
    const totalVolume = leaderboard.reduce((sum, t) => {
      return sum + parseFloat(t.volume?.toString().replace(/,/g, '') || 0);
    }, 0);

    // Convert markets to array
    const marketsArray = Object.values(markets);

    res.status(200).json({
      success: true,
      timestamp: data.timestamp || Date.now(),
      dataSource: 'file',
      leaderboardSize: leaderboard.length,
      totalActiveTrades: leaderboard.length,
      totalVolume: totalVolume,
      topMarkets: marketsArray.slice(0, 20),
      recentTrades: leaderboard.map(t => ({
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
