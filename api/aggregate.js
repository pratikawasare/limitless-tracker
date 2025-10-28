const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 });

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    // Get data from Tampermonkey
    const tampermonkeyData = cache.get('limitless_data');

    if (!tampermonkeyData || !tampermonkeyData.leaderboard) {
      return res.status(200).json({
        success: true,
        message: '⚠️ No data yet. Please run Tampermonkey script on limitless.exchange/leaderboard',
        instruction: '1. Install Tampermonkey script\n2. Visit limitless.exchange\n3. Click "Extract Data Now"\n4. Click "Send to Vercel"',
        leaderboardSize: 0,
        totalActiveTrades: 0,
        topMarkets: [],
        recentTrades: []
      });
    }

    // Process the data
    const leaderboard = tampermonkeyData.leaderboard;
    const markets = Object.values(tampermonkeyData.markets || {});

    // Create market aggregation
    const marketAggregation = markets.map((market, index) => ({
      title: market.title,
      traders: [],
      totalVolume: 0,
      yesCount: 0,
      noCount: 0,
      rank: index + 1
    }));

    res.status(200).json({
      success: true,
      timestamp: tampermonkeyData.timestamp,
      dataSource: 'tampermonkey',
      leaderboardSize: leaderboard.length,
      totalActiveTrades: 0, // Will be populated when we track individual bets
      topMarkets: marketAggregation.slice(0, 50),
      recentTrades: [],
      rawData: {
        sampleTraders: leaderboard.slice(0, 10),
        sampleMarkets: markets.slice(0, 5)
      }
    });

  } catch (error) {
    console.error('Aggregate error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
