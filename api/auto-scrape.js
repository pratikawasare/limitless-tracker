const cheerio = require('cheerio');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    console.log('🔍 Auto-scraping Limitless leaderboard...');

    const response = await fetch('https://limitless.exchange/leaderboard', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const traders = [];
    let rank = 1;
    
    // Find table rows
    $('tr').each((index, element) => {
      if (index === 0) return; // Skip header
      
      const $row = $(element);
      
      // Find address link
      const addressLink = $row.find('a[href*="/profile/0x"]').attr('href');
      if (!addressLink) return;
      
      const addressMatch = addressLink.match(/0x[a-fA-F0-9]{40}/);
      if (!addressMatch) return;
      
      const address = addressMatch[0];
      const username = $row.find('a[href*="/profile/"]').text().trim();
      
      // Find volume (last cell)
      const cells = $row.find('td');
      const lastCell = cells.last().text().trim();
      const volumeMatch = lastCell.match(/[\d,]+/);
      const volume = volumeMatch ? volumeMatch[0].replace(/,/g, '') : '0';
      
      traders.push({
        rank: rank++,
        address: address,
        username: username,
        volume: volume,
        timestamp: Date.now()
      });
    });

    console.log(`✅ Scraped ${traders.length} traders`);

    res.status(200).json({
      success: true,
      timestamp: Date.now(),
      traders: traders.length,
      data: {
        leaderboard: traders,
        markets: {},
        timestamp: Date.now()
      }
    });

  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
