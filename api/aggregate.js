const cache = require('../lib/dataStore');


module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    // Get data from Tampermonkey
    const tampermonkeyData = cache.get('limitless_data');

    if (!tampermonkeyData || !tampermonkeyData.leaderboard) {
      return res.status(200).json({
        success: true,
        message: '⚠️ No data yet. Waiting for Tampermonkey to send data.',
        instruction: 'Steps:\n1. Visit limitless.exchange/leaderboard\n2. Click "Extract Data Now"\n3. Click "Send to Vercel"',
        leaderboardSize: 0,
        totalActiveTrades: 0,
        topMarkets: [],
        recentTrades: []
      });
    }

    // Process the data
    const leaderboard = tampermonkeyData.leaderboard || [];
    const markets = Object.values(tampermonkeyData.markets || {});

    console.log(`📊 Serving data: ${leaderboard.length} traders`);

    // Create market aggregation
    const marketAggregation = markets.map((market, index) => ({
      title: market.title || `Market ${index + 1}`,
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
      totalActiveTrades: leaderboard.length,
      topMarkets: marketAggregation.slice(0, 50),
      recentTrades: leaderboard.slice(0, 100).map(trader => ({
        rank: trader.rank,
        address: trader.address,
        market: 'Leaderboard Position',
        side: 'N/A',
        shares: 0,
        unrealizedPnL: 0
      })),
      rawData: {
        sampleTraders: leaderboard.slice(0, 5)
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

