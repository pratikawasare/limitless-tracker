const axios = require('axios');
const cheerio = require('cheerio');

class LimitlessScraper {
  constructor() {
    this.baseUrl = 'https://limitless.exchange';
    this.cache = new Map();
    this.cacheTime = 5 * 60 * 1000; // 5 minutes
  }

  async getLeaderboard() {
    const cached = this.cache.get('leaderboard');
    if (cached && Date.now() - cached.timestamp < this.cacheTime) {
      return cached.data;
    }

    try {
      // Method 1: Try direct API call (check network tab)
      const apiResponse = await axios.get(`${this.baseUrl}/api/leaderboard`, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        },
        timeout: 10000
      }).catch(() => null);

      if (apiResponse?.data) {
        const data = { users: apiResponse.data.slice(0, 250), timestamp: Date.now() };
        this.cache.set('leaderboard', { data, timestamp: Date.now() });
        return data;
      }

      // Method 2: GraphQL approach (common for crypto platforms)
      const graphqlResponse = await this.tryGraphQL();
      if (graphqlResponse) {
        const data = { users: graphqlResponse.slice(0, 250), timestamp: Date.now() };
        this.cache.set('leaderboard', { data, timestamp: Date.now() });
        return data;
      }

      // Method 3: Fallback - HTML scraping with Puppeteer
      return await this.scrapeWithPuppeteer();

    } catch (error) {
      console.error('Leaderboard fetch error:', error);
      throw new Error('Failed to fetch leaderboard');
    }
  }

  async tryGraphQL() {
    try {
      const response = await axios.post(`${this.baseUrl}/graphql`, {
        query: `
          query GetLeaderboard {
            leaderboard(limit: 250) {
              rank
              address
              username
              totalVolume
              totalPnL
              winRate
              activeBets
            }
          }
        `
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        }
      });
      
      return response.data?.data?.leaderboard || null;
    } catch (error) {
      return null;
    }
  }

  async scrapeWithPuppeteer() {
    const puppeteer = require('puppeteer-core');
    const chromium = require('@sparticuz/chromium');

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });

    try {
      const page = await browser.newPage();
      
      // Intercept API calls
      const apiData = [];
      page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('leaderboard') || url.includes('api')) {
          try {
            const json = await response.json();
            apiData.push(json);
          } catch (e) {}
        }
      });

      await page.goto('https://limitless.exchange/leaderboard', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Wait for data to load
      await page.waitForTimeout(3000);

      // Extract data from page
      const leaderboardData = await page.evaluate(() => {
        const rows = [];
        document.querySelectorAll('[data-testid="leaderboard-row"], .leaderboard-item, tr').forEach((row, index) => {
          const address = row.textContent.match(/0x[a-fA-F0-9]{4}…[a-fA-F0-9]{4}/)?.[0] ||
                         row.querySelector('[data-address]')?.getAttribute('data-address') ||
                         row.textContent.match(/0x[a-fA-F0-9]{40}/)?.[0];
          
          if (address && index < 250) {
            rows.push({
              rank: index + 1,
              address: address,
              element: row.textContent
            });
          }
        });
        return rows;
      });

      await browser.close();

      // Check if we got API data
      if (apiData.length > 0) {
        return { users: apiData[0].slice(0, 250), timestamp: Date.now() };
      }

      return { users: leaderboardData, timestamp: Date.now() };

    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  async getUserBets(address) {
    const cached = this.cache.get(`bets_${address}`);
    if (cached && Date.now() - cached.timestamp < this.cacheTime) {
      return cached.data;
    }

    try {
      // Method 1: Direct API
      const response = await axios.get(`${this.baseUrl}/api/user/${address}/bets`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 5000
      }).catch(() => null);

      if (response?.data) {
        this.cache.set(`bets_${address}`, { data: response.data, timestamp: Date.now() });
        return response.data;
      }

      // Method 2: GraphQL
      const graphqlBets = await this.getUserBetsGraphQL(address);
      if (graphqlBets) {
        this.cache.set(`bets_${address}`, { data: graphqlBets, timestamp: Date.now() });
        return graphqlBets;
      }

      // Method 3: Base blockchain direct query
      return await this.getOnchainBets(address);

    } catch (error) {
      console.error(`Error fetching bets for ${address}:`, error);
      return { activeBets: [], error: error.message };
    }
  }

  async getUserBetsGraphQL(address) {
    try {
      const response = await axios.post(`${this.baseUrl}/graphql`, {
        query: `
          query GetUserBets($address: String!) {
            user(address: $address) {
              activeBets {
                marketId
                marketTitle
                side
                shares
                avgPrice
                currentPrice
                unrealizedPnL
                timestamp
              }
            }
          }
        `,
        variables: { address }
      });
      
      return response.data?.data?.user?.activeBets || null;
    } catch (error) {
      return null;
    }
  }

  async getOnchainBets(address) {
    // Query Base blockchain for user's positions
    try {
      const baseRpcUrl = 'https://mainnet.base.org';
      
      // This would need the actual Limitless contract addresses
      // You can find these by inspecting transactions on BaseScan
      const response = await axios.post(baseRpcUrl, {
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: '0xYourLimitlessContractAddress', // Replace with actual contract
          data: '0x...' // Encoded function call to get user positions
        }, 'latest'],
        id: 1
      });

      return { activeBets: [], source: 'blockchain' };
    } catch (error) {
      return { activeBets: [], error: 'Blockchain query failed' };
    }
  }

  async getAllTopUsersBets(topUsers) {
    const batchSize = 10;
    const allBets = new Map();

    for (let i = 0; i < topUsers.length; i += batchSize) {
      const batch = topUsers.slice(i, i + batchSize);
      const promises = batch.map(user => 
        this.getUserBets(user.address)
          .then(bets => ({ address: user.address, rank: user.rank, bets }))
          .catch(err => ({ address: user.address, rank: user.rank, bets: [], error: err.message }))
      );

      const results = await Promise.all(promises);
      results.forEach(result => {
        allBets.set(result.address, result);
      });

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return allBets;
  }
}

module.exports = LimitlessScraper;
