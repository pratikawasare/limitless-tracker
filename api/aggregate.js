module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    // Check if data exists in global storage
    if (!global.limitlessData) {
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

    const tampermonkeyData = global.limitlessData;
    const leaderboard = tampermonkeyData.leaderboard || [];
    const markets = Object.values(tampermonkeyData.markets || {});

    console.log(`✅ Serving data: ${leaderboard.length} traders from global storage`);

    // Create summary of top markets
    const topMarkets = markets.length > 0 ? 
      markets.slice(0, 50).map((market, index) => ({
        title: market.title || `Market ${index + 1}`,
        traders: [],
        totalVolume: 0,
        yesCount: 0,
        noCount: 0
      })) : 
      [{
        title: 'Leaderboard Tracking Active',
        traders: leaderboard.slice(0, 10).map(t => ({ address: t.address, rank: t.rank })),
        totalVolume: 0,
        yesCount: 0,
        noCount: 0
      }];

    // Format trader data for display
    const recentTrades = leaderboard.map(trader => ({
      rank: trader.rank || 0,
      address: trader.address || 'Unknown',
      market: 'Limitless Exchange',
      side: 'Tracked',
      shares: 0,
      unrealizedPnL: 0
    }));

    res.status(200).json({
      success: true,
      timestamp: tampermonkeyData.timestamp || Date.now(),
      dataSource: 'tampermonkey',
      leaderboardSize: leaderboard.length,
      totalActiveTrades: leaderboard.length,
      topMarkets: topMarkets,
      recentTrades: recentTrades,
      summary: {
        message: `Successfully tracking ${leaderboard.length} top traders from Limitless Exchange`,
        lastUpdate: new Date(tampermonkeyData.timestamp).toLocaleString(),
        dataAge: Math.round((Date.now() - tampermonkeyData.receivedAt) / 1000) + ' seconds ago'
      }
    });

  } catch (error) {
    console.error('Aggregate error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
};
