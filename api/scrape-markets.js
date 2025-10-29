const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    console.log('🔍 Scraping hot markets from Limitless...');

    // Fetch the markets page
    const response = await axios.get('https://limitless.exchange/markets', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 15000
    });

    const html = response.data;
    const $ = cheerio.load(html);
    
    const markets = [];
    
    // Try to find market cards/items
    $('a, div, article, section').each((index, element) => {
      const text = $(element).text();
      const href = $(element).attr('href');
      
      // Look for market questions
      if (text.includes('?') && text.length > 20 && text.length < 300) {
        // Extract market title
        const questionMatch = text.match(/([A-Z][^?]+\?)/);
        if (questionMatch) {
          const title = questionMatch[1].trim();
          
          // Extract volume if available
          const volumeMatch = text.match(/\$?([\d,]+)/) || text.match(/([\d,]+)\s*vol/i);
          const volume = volumeMatch ? volumeMatch[1].replace(/,/g, '') : '0';
          
          // Extract percentage if available
          const percentMatch = text.match(/(\d+)%/);
          const probability = percentMatch ? percentMatch[1] : '50';
          
          // Check if not duplicate
          const exists = markets.find(m => m.title === title);
          
          if (!exists && title.length > 20) {
            markets.push({
              title: title,
              volume: parseFloat(volume) || 0,
              probability: parseInt(probability),
              url: href || '',
              yesCount: 0,
              noCount: 0,
              traders: []
            });
          }
        }
      }
    });
    
    // Sort by volume
    markets.sort((a, b) => b.volume - a.volume);
    
    console.log(`✅ Found ${markets.length} markets`);

    res.status(200).json({
      success: true,
      timestamp: Date.now(),
      marketsFound: markets.length,
      markets: markets.slice(0, 50)
    });

  } catch (error) {
    console.error('Markets scraper error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      markets: []
    });
  }
};
