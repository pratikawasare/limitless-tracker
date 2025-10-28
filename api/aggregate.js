const LimitlessScraper = require('../lib/scraper');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 300 });

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const scraper = new LimitlessScraper();
    
    // Get leaderboard
    const leaderboard = await scraper.getLeaderboard();
    
    // Log the data source
    console.log('Leaderboard source:', leaderboard.source);
    console.log('User count:', leaderboard.users.length);

    if (leaderboard.error) {
      return res.status(200).json({
        success: true,
        message: 'Using test data. Check endpoint logs in Vercel dashboard.',
        warning: leaderboard.error,
        leaderboardSize: leaderboard.users.length,
        topMarkets: [],
        recentTrades: [],
        instruction: 'Open browser DevTools on limitless.exchange/leaderboard to find real API endpoint'
      });
    }

    // Get user bets (only top 50)
    const userBets = await scraper.getAllTopUsersBets(leaderboard.users);

    // Aggregate by market
    const marketAggregation = {};
    const activeTrades = [];

    userBets.forEach((userData) => {
      if (!userData.bets?.activeBets) return;

      userData.bets.activeBets.forEach(bet => {
        const marketKey = bet.marketId || bet.marketTitle || 'Unknown';
        
        if (!marketAggregation[marketKey]) {
          marketAggregation[marketKey] = {
            marketId: bet.marketId,
            title: bet.marketTitle || marketKey,
            traders: [],
            totalVolume: 0,
            yesCount: 0,
            noCount: 0
          };
        }

        marketAggregation[marketKey].traders.push({
          rank: userData.rank,
          address: userData.address,
          side: bet.side,
          shares: bet.shares || 0
        });

        marketAggregation[marketKey].totalVolume += (bet.shares * bet.avgPrice) || 0;
        if (bet.side?.toUpperCase() === 'YES') marketAggregation[marketKey].yesCount++;
        else marketAggregation[marketKey].noCount++;

        activeTrades.push({
          rank: userData.rank,
          address: userData.address,
          market: bet.marketTitle || 'Unknown Market',
          side: bet.side,
          shares: bet.shares || 0,
          unrealizedPnL: bet.unrealizedPnL || 0
        });
      });
    });

    const topMarkets = Object.values(marketAggregation)
      .sort((a, b) => b.traders.length - a.traders.length)
      .slice(0, 50);

    res.status(200).json({
      success: true,
      timestamp: Date.now(),
      dataSource: leaderboard.source,
      leaderboardSize: leaderboard.users.length,
      totalActiveTrades: activeTrades.length,
      topMarkets,
      recentTrades: activeTrades.slice(0, 100)
    });

  } catch (error) {
    console.error('Aggregate error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      instruction: 'Check Vercel deployment logs for endpoint testing results'
    });
  }
};
