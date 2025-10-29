const cheerio = require('cheerio');

let cachedData = {
  leaderboard: [],
  timestamp: null
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    console.log('🔍 Auto-scraping Limitless leaderboard...');

    // Fetch the leaderboard page
    const response = await fetch('https://limitless.exchange/leaderboard', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const traders = [];
    
    // Find all table rows
    $
