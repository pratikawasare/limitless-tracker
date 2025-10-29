const cache = require('../lib/dataStore');
const axios = require('axios');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    // Get trader data from Tampermonkey
    const tampermonkeyData = cache.get('limitless_data');
    
    // Get scraped markets
    let scrapedMarkets = [];
    try {
      const baseUrl = `https://${req.headers.host}`;
      const marketsResponse = await axios.get(`${baseUrl}/api/scrape-markets`, {
        timeout: 10000
      });
      
      if (marketsResponse.data.success) {
        scrapedMarkets = marketsResponse.data.markets || [];
        console.log(`✅ Loaded ${scrapedMarkets.length} markets from scraper`);
      }
    } catch (error) {
      console.log('⚠️ Markets scraper not available:', error.message);
    }

    // If no trader data, still show markets
    if (!tampermonkeyData || !tampermonkeyData.leaderboard || tampermonkeyData.leaderboard.length === 0) {
      return res.status(200).json({
        success: true,
        message: scrapedMarkets.length > 0 ? 
          '✅ Showing hot markets. Add traders from Tampermonkey to track their bets!' : 
          '⚠️ No data yet. Run Tampermonkey script to extract traders.',
        timestamp: Date.now(),
        dataSource: 'markets-only',
        leaderboardSize: 0,
        totalActiveTrades: 0,
        totalVolume: 0,
        topMarkets: scrapedMarkets.slice(0, 20),
        recentTrades: []
      });
    }

    const leaderboard = tampermonkeyData.leaderboard || [];
    const trackedMarkets = tampermonkeyData.markets || {};
    
    console.log(`📊 Processing ${leaderboard.length} traders`);

    // Calculate total volume
    const totalVolume = leaderboard.reduce((sum, t) => {
      return sum + parseFloat(t.volume?.toString().replace(/,/g, '') || 0);
    }, 0);

    // Merge tracked markets with scraped markets
    const allMarkets = {};
    
    // Add scraped markets
    scrapedMarkets.forEach(market => {
      allMarkets[market.title] = {
        ...market,
        source: 'scraped',
        traders: [],
        yesCount: 0,
        noCount: 0
      };
    });
    
    // Add/merge tracked markets from Tampermonkey
    Object.keys(trackedMarkets).forEach(key => {
      const tracked = trackedMarkets[key];
      
      if (allMarkets[key]) {
        // Merge data
        allMarkets[key].traders = tracked.traders || [];
        allMarkets[key].yesCount = tracked.yesCount || 0;
        allMarkets[key].noCount = tracked.noCount || 0;
        allMarkets[key].source = 'tracked';
      } else {
        allMarkets[key] = {
          ...tracked,
          source: 'tracked'
        };
      }
    });

    // Convert to array and sort
    const topMarkets = Object.values(allMarkets)
      .sort((a, b) => {
        // Prioritize markets with tracked traders
        if (a.traders.length !== b.traders.length) {
          return b.traders.length - a.traders.length;
        }
        // Then by volume
        return (b.volume || 0) - (a.volume || 0);
      })
      .slice(0, 20);

    // Count total bets from tracked traders
    const totalBets = leaderboard.reduce((sum, t) => {
      return sum + (t.bets?.length || 0);
    }, 0);

    res.status(200).json({
      success: true,
      timestamp: tampermonkeyData.timestamp || Date.now(),
      dataSource: 'combined',
      leaderboardSize: leaderboard.length,
      totalActiveTrades: totalBets,
      totalVolume: totalVolume,
      marketsScraped: scrapedMarkets.length,
      marketsTracked: Object.keys(trackedMarkets).length,
      topMarkets: topMarkets,
      recentTrades: leaderboard.map(t => ({
        rank: t.rank,
        address: t.address,
        username: t.username,
        volume: t.volume,
        activeBets: t.bets?.length || 0,
        pnl: t.pnl || '0',
        winRate: t.winRate || '0'
      })),
      summary: {
        message: `Tracking ${leaderboard.length} traders across ${Object.keys(allMarkets).length} markets`,
        tradersVolume: totalVolume,
        hotMarkets: topMarkets.length
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
