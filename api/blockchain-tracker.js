const axios = require('axios');

// Base blockchain explorer API
const BASESCAN_API = 'https://api.basescan.org/api';
const BASESCAN_KEY = 'YourAPIKeyHere'; // Free from basescan.org

// Limitless Exchange contract (you'll need to find this)
const LIMITLESS_CONTRACT = '0x...'; // We'll find this

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    // Get trader addresses from request
    const { addresses } = req.body || {};
    
    if (!addresses || addresses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No addresses provided'
      });
    }

    console.log(`🔍 Querying blockchain for ${addresses.length} addresses`);

    const marketsData = {};
    const traderBets = [];

    // Query each address
    for (const address of addresses) {
      try {
        // Get transactions for this address on Base
        const txResponse = await axios.get(BASESCAN_API, {
          params: {
            module: 'account',
            action: 'txlist',
            address: address,
            startblock: 0,
            endblock: 99999999,
            page: 1,
            offset: 100, // Last 100 transactions
            sort: 'desc',
            apikey: BASESCAN_KEY
          },
          timeout: 10000
        });

        if (txResponse.data.status === '1' && txResponse.data.result) {
          const transactions = txResponse.data.result;
          
          // Filter for Limitless-related transactions
          const limitlessTxs = transactions.filter(tx => 
            tx.to?.toLowerCase().includes('limitless') || 
            tx.input?.includes('bet') ||
            tx.input?.length > 138 // Smart contract interaction
          );

          console.log(`Found ${limitlessTxs.length} potential bets for ${address.substring(0, 10)}`);

          // Parse transactions to extract bet data
          limitlessTxs.slice(0, 10).forEach(tx => {
            // Basic bet info from transaction
            traderBets.push({
              address: address,
              hash: tx.hash,
              timestamp: tx.timeStamp,
              value: tx.value,
              gasUsed: tx.gasUsed
            });
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`Error querying ${address}:`, error.message);
      }
    }

    res.status(200).json({
      success: true,
      traders: addresses.length,
      transactions: traderBets.length,
      markets: Object.keys(marketsData).length,
      data: {
        bets: traderBets,
        markets: marketsData
      }
    });

  } catch (error) {
    console.error('Blockchain tracker error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
