module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    console.log('🔍 Returning sample hot markets...');

    // Sample hot markets (we'll make this dynamic later)
    const markets = [
      {
        title: "Will Bitcoin reach $100,000 in 2025?",
        volume: 125000,
        probability: 68,
        yesCount: 0,
        noCount: 0,
        traders: [],
        source: 'sample'
      },
      {
        title: "Will Ethereum surpass $5,000 in Q1 2025?",
        volume: 98000,
        probability: 55,
        yesCount: 0,
        noCount: 0,
        traders: [],
        source: 'sample'
      },
      {
        title: "Will Trump win the 2024 election?",
        volume: 250000,
        probability: 52,
        yesCount: 0,
        noCount: 0,
        traders: [],
        source: 'sample'
      },
      {
        title: "Will AI replace programmers by 2026?",
        volume: 45000,
        probability: 35,
        yesCount: 0,
        noCount: 0,
        traders: [],
        source: 'sample'
      },
      {
        title: "Will SpaceX reach Mars in 2025?",
        volume: 85000,
        probability: 15,
        yesCount: 0,
        noCount: 0,
        traders: [],
        source: 'sample'
      }
    ];

    res.status(200).json({
      success: true,
      timestamp: Date.now(),
      marketsFound: markets.length,
      markets: markets
    });

  } catch (error) {
    console.error('Markets error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      markets: []
    });
  }
};
