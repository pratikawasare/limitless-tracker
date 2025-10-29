const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    console.log('🔍 Fetching hot markets from Limitless...');

    // Scrape the markets page
    const response = await axios.get('https://limitless.exchange/markets', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });

    const html = response.data;
    
    // Extract market data from HTML
    const markets = extractMarkets(html);

    res.status(200).json({
      success: true,
      timestamp: Date.now(),
      marketsFound: markets.length,
      markets: markets.slice(0, 50) // Top 50 markets
    });

  } catch (error) {
    console.error('Markets tracker error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

function extractMarkets(html) {
  const markets = [];
  
  // Parse HTML to find markets
  // This is a simplified version - adjust based on actual HTML structure
  const marketRegex = /Will [^?]+\?/g;
  const matches = html.match(marketRegex) || [];
  
  matches.forEach((title, index) => {
    markets.push({
      rank: index + 1,
      title: title,
      volume: 0,
      traders: 0
    });
  });

  return markets;
}
