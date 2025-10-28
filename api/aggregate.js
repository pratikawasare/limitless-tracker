const LimitlessScraper = require('../lib/scraper');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 300 }); // 5 min cache

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const cached = cache.get('aggregate_data');
    if (cached) {
      return res.status(200).json({
        success: true,
        cached: true,
        ...cached
      });
    }

    const scraper = new LimitlessScraper();
    
    // Get leaderboard
    const leaderboard = await scraper.getLeaderboard();
    
    // Get all user bets
    const userBets = await scraper.getAllTopUsersBets(leaderboard.users);

    // Aggregate by market
    const marketAggregation = {};
    const activeTrades = [];

    userBets.forEach((userData, address) => {
      if (!userData.bets?.activeBets) return;

      userData.bets.activeBets.forEach(bet => {
        const marketKey = bet.marketId || bet.marketTitle;
        
        if (!marketAggregation[marketKey]) {
          marketAggregation[marketKey] = {
            marketId: bet.marketId,
            title: bet.marketTitle,
            traders: [],
            totalVolume: 0,
            yesCount: 0,
            noCount: 0
          };
        }

        marketAggregation[marketKey].traders.push({
          rank: userData.rank,
          address,
          side: bet.side,
          shares: bet.shares,
          avgPrice: bet.avgPrice
        });

        marketAggregation[marketKey].totalVolume += (bet.shares * bet.avgPrice) || 0;
        if (bet.side === 'YES') marketAggregation[marketKey].yesCount++;
        else marketAggregation[marketKey].noCount++;

        activeTrades.push({
          rank: userData.rank,
          address,
          market: bet.marketTitle,
          side: bet.side,
          shares: bet.shares,
          unrealizedPnL: bet.unrealizedPnL
        });
      });
    });

    // Sort markets by trader count
    const topMarkets = Object.values(marketAggregation)
      .sort((a, b) => b.traders.length - a.traders.length)
      .slice(0, 50);

    const result = {
      timestamp: Date.now(),
      leaderboardSize: leaderboard.users.length,
      totalActiveTrades: activeTrades.length,
      topMarkets,
      recentTrades: activeTrades.slice(0, 100),
      summary: {
        mostTradedMarket: topMarkets[0]?.title,
        topTraderCount: topMarkets[0]?.traders.length
      }
    };

    cache.set('aggregate_data', result);

    res.status(200).json({
      success: true,
      cached: false,
      ...result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
