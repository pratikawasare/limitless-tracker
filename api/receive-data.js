const fs = require('fs');
const path = require('path');

const DATA_FILE = '/tmp/limitless-data.json';

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

      // Add received timestamp
      data.receivedAt = Date.now();

      // Write to file
      fs.writeFileSync(DATA_FILE, JSON.stringify(data));
      
      console.log(`✅ Stored ${data.leaderboard.length} traders to file`);

      return res.status(200).json({
        success: true,
        message: 'Data received and stored successfully',
        traders: data.leaderboard.length,
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
    try {
      if (!fs.existsSync(DATA_FILE)) {
        return res.status(404).json({
          success: false,
          message: 'No data available yet. Please extract data from Tampermonkey first.'
        });
      }

      const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
      const data = JSON.parse(fileContent);

      return res.status(200).json({
        success: true,
        data: data,
        traders: data.leaderboard?.length || 0
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
};
