const LimitlessScraper = require('../lib/scraper');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { address } = req.query;

  if (!address) {
    return res.status(400).json({ success: false, error: 'Address required' });
  }

  try {
    const scraper = new LimitlessScraper();
    const bets = await scraper.getUserBets(address);
    
    res.status(200).json({
      success: true,
      address,
      data: bets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
