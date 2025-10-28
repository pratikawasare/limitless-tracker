const axios = require('axios');

class LimitlessScraper {
  constructor() {
    this.baseUrl = 'https://limitless.exchange';
    this.apiUrl = 'https://api.limitless.exchange'; // Might be different
    this.cache = new Map();
    this.cacheTime = 5 * 60 * 1000;
  }

  async getLeaderboard() {
    console.log('Fetching leaderboard...');
    
    try {
      // Try multiple possible endpoints
      const endpoints = [
        `${this.baseUrl}/api/leaderboard`,
        `${this.baseUrl}/api/v1/leaderboard`,
        `${this.apiUrl}/leaderboard`,
        `${this.apiUrl}/v1/leaderboard`,
        `${this.baseUrl}/api/users/leaderboard`
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`Trying: ${endpoint}`);
          const response = await axios.get(endpoint, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json',
              'Referer': 'https://limitless.exchange/leaderboard'
            },
            timeout: 10000
          });

          if (response.data && response.status === 200) {
            console.log(`✅ Success with: ${endpoint}`);
            console.log('Data structure:', Object.keys(response.data));
            
            // Parse the response based on structure
            let users = [];
            if (Array.isArray(response.data)) {
              users = response.data;
            } else if (response.data.data) {
              users = Array.isArray(response.data.data) ? response.data.data : response.data.data.users || [];
            } else if (response.data.users) {
              users = response.data.users;
            }

            return {
              users: users.slice(0, 250),
              timestamp: Date.now(),
              source: endpoint
            };
          }
        } catch (err) {
          console.log(`❌ Failed: ${endpoint} - ${err.message}`);
          continue;
        }
      }

      // If all fail, try GraphQL
      return await this.tryGraphQL();

    } catch (error) {
      console.error('All leaderboard attempts failed:', error.message);
      
      // Return mock data for testing
      return {
        users: this.getMockData(),
        timestamp: Date.now(),
        source: 'mock',
        error: 'Using mock data - please check Vercel logs for endpoint details'
      };
    }
  }

  async tryGraphQL() {
    const graphqlEndpoints = [
      `${this.baseUrl}/graphql`,
      `${this.apiUrl}/graphql`
    ];

    for (const endpoint of graphqlEndpoints) {
      try {
        console.log(`Trying GraphQL: ${endpoint}`);
        const response = await axios.post(endpoint, {
          query: `
            query {
              leaderboard(limit: 250) {
                rank
                address
                username
                volume
                pnl
                winRate
              }
            }
          `
        }, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0'
          },
          timeout: 10000
        });

        if (response.data?.data?.leaderboard) {
          console.log('✅ GraphQL Success');
          return {
            users: response.data.data.leaderboard,
            timestamp: Date.now(),
            source: endpoint
          };
        }
      } catch (err) {
        console.log(`❌ GraphQL failed: ${endpoint}`);
        continue;
      }
    }

    throw new Error('No working endpoint found');
  }

  async getUserBets(address) {
    console.log(`Fetching bets for: ${address}`);
    
    try {
      const endpoints = [
        `${this.baseUrl}/api/users/${address}/positions`,
        `${this.baseUrl}/api/users/${address}/bets`,
        `${this.baseUrl}/api/v1/users/${address}/positions`,
        `${this.apiUrl}/users/${address}/positions`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, {
            headers: {
              'User-Agent': 'Mozilla/5.0',
              'Accept': 'application/json'
            },
            timeout: 5000
          });

          if (response.data) {
            return {
              activeBets: response.data.positions || response.data.bets || response.data,
              source: endpoint
            };
          }
        } catch (err) {
          continue;
        }
      }

      // GraphQL fallback
      return await this.getUserBetsGraphQL(address);

    } catch (error) {
      return {
        activeBets: [],
        error: error.message
      };
    }
  }

  async getUserBetsGraphQL(address) {
    try {
      const response = await axios.post(`${this.baseUrl}/graphql`, {
        query: `
          query GetUserPositions($address: String!) {
            user(address: $address) {
              positions {
                marketId
                marketTitle
                side
                shares
                avgPrice
                currentPrice
              }
            }
          }
        `,
        variables: { address }
      });

      return {
        activeBets: response.data?.data?.user?.positions || []
      };
    } catch (error) {
      return { activeBets: [] };
    }
  }

  async getAllTopUsersBets(topUsers) {
    // Only fetch for top 50 to avoid timeouts
    const limitedUsers = topUsers.slice(0, 50);
    const allBets = new Map();

    for (const user of limitedUsers) {
      try {
        const bets = await this.getUserBets(user.address || user.wallet);
        allBets.set(user.address || user.wallet, {
          address: user.address || user.wallet,
          rank: user.rank,
          bets
        });
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`Error fetching bets for ${user.address}:`, err.message);
      }
    }

    return allBets;
  }

  getMockData() {
    // Mock data for testing until real API is found
    const mock = [];
    for (let i = 1; i <= 10; i++) {
      mock.push({
        rank: i,
        address: `0x${Math.random().toString(16).substr(2, 40)}`,
        username: `Trader${i}`,
        volume: Math.random() * 100000,
        pnl: Math.random() * 50000 - 10000,
        winRate: (Math.random() * 30 + 50).toFixed(2)
      });
    }
    return mock;
  }
}

module.exports = LimitlessScraper;
