module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    // Fetch data from receive-data endpoint WITHIN same request
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;
    
    console.log('Fetching from:', `${baseUrl}/api/receive-data`);
    
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`${baseUrl}/api/receive-data`);
    const result = await response.json();

    console.log('Fetch result:', result.success, 'Traders:', result.traders);

    if (!result.success || !result.data) {
      return res.status(200).json({
        success: true,
        message: '⚠️ No data yet. Extract traders using Tampermonkey.',
        leaderboardSize: 0,
        totalActiveTrades: 0,
        totalVolume: 0,
        topMarkets: [],
        recentTrades: []
      });
    }

    const data = result.data;
    const leaderboard = data.leaderboard || [];
    const markets = data.markets || {};

    console.log(`✅ Processing ${leaderboard.length} traders`);

    const totalVolume = leaderboard.reduce((sum, t) => {
      return sum + parseFloat(t.volume?.toString().replace(/,/g, '') || 0);
    }, 0);

    const marketsArray = Object.values(markets);

    res.status(200).json({
      success: true,
      timestamp: data.timestamp || Date.now(),
      dataSource: 'memory',
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
