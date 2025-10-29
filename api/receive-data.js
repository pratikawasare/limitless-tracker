// Store data in memory using global variable
if (!global.limitlessData) {
  global.limitlessData = null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const data = req.body;
      
      console.log('📥 Received data from Tampermonkey');
      console.log('Traders:', data.leaderboard?.length || 0);
      
      if (!data || !data.leaderboard) {
        return res.status(400).json({
          success: false,
          error: 'Invalid data format'
        });
      }

      data.receivedAt = Date.now();
      
      // Store in global memory
      global.limitlessData = data;
      
      console.log(`✅ Stored ${data.leaderboard.length} traders in memory`);

      return res.status(200).json({
        success: true,
        message: 'Data stored in memory',
        traders: data.leaderboard.length,
        timestamp: data.timestamp
      });

    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // GET request
  if (req.method === 'GET') {
    if (!global.limitlessData) {
      return res.status(404).json({
        success: false,
        message: 'No data yet'
      });
    }

    return res.status(200).json({
      success: true,
      data: global.limitlessData,
      traders: global.limitlessData.leaderboard?.length || 0
    });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
