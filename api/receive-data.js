const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10 min cache

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const data = req.body;
      
      console.log('📥 Received data from Tampermonkey');
      console.log('Traders:', data.leaderboard?.length || 0);
      
      // Validate data
      if (!data || !data.leaderboard) {
        return res.status(400).json({
          success: false,
          error: 'Invalid data format'
        });
      }

      // Store in cache
      cache.set('limitless_data', data);
      
      console.log(`✅ Stored data: ${data.leaderboard.length} traders`);

      return res.status(200).json({
        success: true,
        message: 'Data received successfully',
        traders: data.leaderboard.length,
        markets: Object.keys(data.markets || {}).length,
        timestamp: data.timestamp
      });

    } catch (error) {
      console.error('Error receiving data:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // GET request - return stored data
  if (req.method === 'GET') {
    const data = cache.get('limitless_data');
    
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'No data available yet. Please extract data from Tampermonkey first.'
      });
    }

    return res.status(200).json({
      success: true,
      data: data,
      traders: data.leaderboard?.length || 0
    });
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
};
