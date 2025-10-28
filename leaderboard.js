const LimitlessScraper = require('../lib/scraper');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const scraper = new LimitlessScraper();
    const leaderboard = await scraper.getLeaderboard();
    
    res.status(200).json({
      success: true,
      data: leaderboard,
      count: leaderboard.users.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
