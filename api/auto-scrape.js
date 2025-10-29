module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    console.log('🔍 Fetching from Limitless API...');

    // Try multiple possible API endpoints
    const endpoints = [
      'https://api.limitless.exchange/v1/leaderboard',
      'https://api.limitless.exchange/api/v1/leaderboard',
      'https://api.limitless.exchange/leaderboard',
      'https://api.limitless.exchange/users/leaderboard',
      'https://api.limitless.exchange/api-v1/leaderboard',
    ];

    let traders = [];
    let successfulEndpoint = null;

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Response:', JSON.stringify(data).substring(0, 200));
          
          // Try to parse the response
          if (Array.isArray(data)) {
            traders = data;
            successfulEndpoint = endpoint;
            break;
          } else if (data.leaderboard || data.users || data.traders || data.data) {
            traders = data.leaderboard || data.users || data.traders || data.data;
            successfulEndpoint = endpoint;
            break;
          }
        }
      } catch (error) {
        console.log(`Failed ${endpoint}:`, error.message);
        continue;
      }
    }

    if (traders.length === 0) {
      // Return empty but successful response
      return res.status(200).json({
        success: false,
        error: 'Could not find working API endpoint',
        hint: 'Please check https://api.limitless.exchange/api-v1 for documentation',
        testedEndpoints: endpoints
      });
    }

    // Parse trader data
    const parsedTraders = traders.slice(0, 250).map((trader, index) => ({
      rank: trader.rank || index + 1,
      address: trader.address || trader.wallet || trader.user || 'Unknown',
      username: trader.username || trader.name || trader.displayName || `User ${index + 1}`,
      volume: trader.volume || trader.totalVolume || trader.traded || 0,
      pnl: trader.pnl || trader.profit || 0,
      timestamp: Date.now()
    }));

    console.log(`✅ Fetched ${parsedTraders.length} traders from ${successfulEndpoint}`);

    res.status(200).json({
      success: true,
      timestamp: Date.now(),
      traders: parsedTraders.length,
      endpoint: successfulEndpoint,
      data: {
        leaderboard: parsedTraders,
        markets: {},
        timestamp: Date.now()
      }
    });

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
