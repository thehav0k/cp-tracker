/**
 * API Manager - Handles all platform API integrations
 * Supports: Codeforces, LeetCode, AtCoder, CodeChef, HackerRank, and more
 */

const PlatformAPI = {
  /**
   * Fetch with timeout and error handling
   */
  async fetchWithTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },

  /**
   * CODEFORCES API
   */
  codeforces: {
    async getUserInfo(handle) {
      try {
        const url = `https://codeforces.com/api/user.info?handles=${handle}`;
        const response = await PlatformAPI.fetchWithTimeout(url);
        const data = await response.json();
        
        if (data.status !== 'OK') {
          throw new Error(data.comment || 'Failed to fetch user info');
        }
        
        const user = data.result[0];
        return {
          username: user.handle,
          rating: user.rating || 0,
          max_rating: user.maxRating || 0,
          rank: user.rank || 'Unrated',
          max_rank: user.maxRank || 'Unrated',
          avatar: user.avatar || user.titlePhoto,
          contribution: user.contribution || 0
        };
      } catch (error) {
        console.error('Codeforces getUserInfo error:', error);
        throw error;
      }
    },

    async getUserStatus(handle, count = 1000) {
      try {
        const url = `https://codeforces.com/api/user.status?handle=${handle}&from=1&count=${count}`;
        const response = await PlatformAPI.fetchWithTimeout(url);
        const data = await response.json();
        
        if (data.status !== 'OK') {
          throw new Error(data.comment || 'Failed to fetch user status');
        }
        
        const submissions = data.result;
        const solved = new Set();
        const problemDistribution = {};
        const tagDistribution = {};
        const solvedProblems = [];
        
        submissions.forEach(sub => {
          if (sub.verdict === 'OK' && sub.problem) {
            const problemId = `${sub.problem.contestId}-${sub.problem.index}`;
            
            if (!solved.has(problemId)) {
              solved.add(problemId);
              
              // Count by difficulty
              const rating = sub.problem.rating || 800;
              const ratingKey = Math.floor(rating / 100) * 100;
              problemDistribution[ratingKey] = (problemDistribution[ratingKey] || 0) + 1;
              
              // Count by tags (only count each tag once per problem)
              if (sub.problem.tags && sub.problem.tags.length > 0) {
                sub.problem.tags.forEach(tag => {
                  tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
                });
              }
              
              solvedProblems.push({
                contestId: sub.problem.contestId,
                index: sub.problem.index,
                name: sub.problem.name,
                rating: sub.problem.rating || 0,
                tags: sub.problem.tags || [],
                solvedAt: sub.creationTimeSeconds
              });
            }
          }
        });
        
        return {
          problems_solved: solved.size,
          problem_distribution: problemDistribution,
          tag_distribution: tagDistribution,
          solved_problems: solvedProblems.slice(0, 50),
          recent_submissions: submissions.slice(0, 10).map(sub => ({
            problem: sub.problem ? sub.problem.name : 'Unknown',
            verdict: sub.verdict,
            time: new Date(sub.creationTimeSeconds * 1000).toISOString(),
            language: sub.programmingLanguage
          }))
        };
      } catch (error) {
        console.error('Codeforces getUserStatus error:', error);
        throw error;
      }
    },

    async getRatingHistory(handle) {
      try {
        const url = `https://codeforces.com/api/user.rating?handle=${handle}`;
        const response = await PlatformAPI.fetchWithTimeout(url);
        const data = await response.json();
        
        if (data.status !== 'OK') {
          throw new Error(data.comment || 'Failed to fetch rating history');
        }
        
        return data.result.map(contest => ({
          contest_name: contest.contestName,
          rank: contest.rank,
          old_rating: contest.oldRating,
          new_rating: contest.newRating,
          rating_change: contest.newRating - contest.oldRating,
          date: new Date(contest.ratingUpdateTimeSeconds * 1000).toISOString()
        }));
      } catch (error) {
        console.error('Codeforces getRatingHistory error:', error);
        throw error;
      }
    }
  },

  /**
   * LEETCODE API (GraphQL)
   */
  leetcode: {
    async getUserProfile(username) {
      try {
        const query = `
          query getUserProfile($username: String!) {
            matchedUser(username: $username) {
              username
              profile {
                realName
                userAvatar
                ranking
                reputation
                starRating
              }
              submitStats: submitStatsGlobal {
                acSubmissionNum {
                  difficulty
                  count
                  submissions
                }
              }
              badges {
                id
                displayName
                icon
              }
            }
          }
        `;
        
        const response = await PlatformAPI.fetchWithTimeout('https://leetcode.com/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            variables: { username }
          })
        });
        
        const data = await response.json();
        
        if (data.errors) {
          throw new Error(data.errors[0].message);
        }
        
        const user = data.data.matchedUser;
        
        if (!user) {
          throw new Error('User not found');
        }
        
        const stats = {
          Easy: 0,
          Medium: 0,
          Hard: 0,
          total: 0
        };
        
        user.submitStats.acSubmissionNum.forEach(item => {
          if (item.difficulty === 'All') {
            stats.total = item.count;
          } else {
            stats[item.difficulty] = item.count;
          }
        });
        
        return {
          username: user.username,
          real_name: user.profile.realName,
          avatar: user.profile.userAvatar,
          ranking: user.profile.ranking,
          reputation: user.profile.reputation,
          star_rating: user.profile.starRating,
          problems_solved: stats.total,
          easy_solved: stats.Easy,
          medium_solved: stats.Medium,
          hard_solved: stats.Hard,
          badges: user.badges
        };
      } catch (error) {
        console.error('LeetCode getUserProfile error:', error);
        throw error;
      }
    },

    async getRecentSubmissions(username) {
      try {
        const query = `
          query getRecentSubmissions($username: String!, $limit: Int!) {
            recentAcSubmissionList(username: $username, limit: $limit) {
              id
              title
              titleSlug
              timestamp
            }
          }
        `;
        
        const response = await PlatformAPI.fetchWithTimeout('https://leetcode.com/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            variables: { username, limit: 20 }
          })
        });
        
        const data = await response.json();
        
        if (data.errors) {
          throw new Error(data.errors[0].message);
        }
        
        return data.data.recentAcSubmissionList.map(sub => ({
          problem: sub.title,
          slug: sub.titleSlug,
          timestamp: parseInt(sub.timestamp) * 1000
        }));
      } catch (error) {
        console.error('LeetCode getRecentSubmissions error:', error);
        throw error;
      }
    }
  },

  /**
   * ATCODER API (Web Scraping - requires CORS proxy or background fetch)
   */
  atcoder: {
    async getUserInfo(username) {
      try {
        // Note: This requires a CORS proxy or background script fetch
        const url = `https://atcoder.jp/users/${username}`;
        const response = await PlatformAPI.fetchWithTimeout(url);
        const html = await response.text();
        
        // Parse HTML (basic parsing, can be enhanced)
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Extract rating (this is a simplified example)
        const ratingElement = doc.querySelector('.user-rating');
        const rating = ratingElement ? parseInt(ratingElement.textContent) : 0;
        
        return {
          username,
          rating,
          rank: this.getRankFromRating(rating)
        };
      } catch (error) {
        console.error('AtCoder getUserInfo error:', error);
        // Return mock data for now
        return {
          username,
          rating: 0,
          rank: 'Unrated',
          note: 'AtCoder requires web scraping - implement in background script'
        };
      }
    },

    getRankFromRating(rating) {
      if (rating >= 2800) return 'Red';
      if (rating >= 2400) return 'Orange';
      if (rating >= 2000) return 'Yellow';
      if (rating >= 1600) return 'Blue';
      if (rating >= 1200) return 'Cyan';
      if (rating >= 800) return 'Green';
      if (rating >= 400) return 'Brown';
      return 'Gray';
    }
  },

  /**
   * CODECHEF API (Web Scraping)
   */
  codechef: {
    async getUserInfo(username) {
      try {
        const url = `https://www.codechef.com/users/${username}`;
        const response = await PlatformAPI.fetchWithTimeout(url);
        const html = await response.text();
        
        const ratingMatch = html.match(/rating-number">(\d+)</i);
        const starsMatch = html.match(/rating-star"><span>(\d+)/i);
        const problemsMatch = html.match(/problems-solved[\s\S]*?<h3>(\d+)<\/h3>/i);
        
        return {
          username,
          rating: ratingMatch ? parseInt(ratingMatch[1]) : 0,
          stars: starsMatch ? parseInt(starsMatch[1]) : 0,
          problems_solved: problemsMatch ? parseInt(problemsMatch[1]) : 0,
          rank: this.getRankFromRating(ratingMatch ? parseInt(ratingMatch[1]) : 0)
        };
      } catch (error) {
        console.error('CodeChef getUserInfo error:', error);
        return {
          username,
          rating: 0,
          stars: 0,
          problems_solved: 0,
          error: 'Could not fetch data'
        };
      }
    },
    
    getRankFromRating(rating) {
      if (rating >= 2500) return '7⭐';
      if (rating >= 2200) return '6⭐';
      if (rating >= 2000) return '5⭐';
      if (rating >= 1800) return '4⭐';
      if (rating >= 1600) return '3⭐';
      if (rating >= 1400) return '2⭐';
      if (rating >= 1200) return '1⭐';
      return 'Unrated';
    }
  },

  /**
   * HACKERRANK API
   */
  hackerrank: {
    async getUserInfo(username) {
      try {
        const url = `https://www.hackerrank.com/rest/hackers/${username}/scores_elo`;
        const response = await PlatformAPI.fetchWithTimeout(url);
        const data = await response.json();
        
        let totalSolved = 0;
        const models = data.models || [];
        
        models.forEach(model => {
          if (model.count) totalSolved += model.count;
        });
        
        return {
          username,
          problems_solved: totalSolved,
          tracks: models.map(m => ({
            name: m.category || 'Unknown',
            solved: m.count || 0
          }))
        };
      } catch (error) {
        console.error('HackerRank getUserInfo error:', error);
        return {
          username,
          problems_solved: 0,
          error: 'Could not fetch data'
        };
      }
    }
  },
  
  /**
   * CSES Problem Set
   */
  cses: {
    async getUserInfo(username) {
      try {
        return {
          username,
          problems_solved: 0,
          note: 'CSES does not provide public API'
        };
      } catch (error) {
        console.error('CSES getUserInfo error:', error);
        return { username, problems_solved: 0, error: 'No API available' };
      }
    }
  },
  
  /**
   * SPOJ API
   */
  spoj: {
    async getUserInfo(username) {
      try {
        const url = `https://www.spoj.com/users/${username}/`;
        const response = await PlatformAPI.fetchWithTimeout(url);
        const html = await response.text();
        
        const solvedMatch = html.match(/Problems solved: <\/small><a[^>]*>(\d+)<\/a>/i);
        const pointsMatch = html.match(/points[^>]*>([\d.]+)</);
        
        return {
          username,
          problems_solved: solvedMatch ? parseInt(solvedMatch[1]) : 0,
          points: pointsMatch ? parseFloat(pointsMatch[1]) : 0
        };
      } catch (error) {
        console.error('SPOJ getUserInfo error:', error);
        return { 
          username, 
          problems_solved: 0, 
          points: 0,
          error: 'Could not fetch data. Verify username is correct.' 
        };
      }
    }
  },
  
  /**
   * TopCoder API
   */
  topcoder: {
    async getUserInfo(username) {
      try {
        // TopCoder uses member ID, but we'll try to scrape basic info
        const url = `https://www.topcoder.com/members/${username}`;
        const response = await PlatformAPI.fetchWithTimeout(url);
        const html = await response.text();
        
        // Try to parse rating and problems from profile page
        const ratingMatch = html.match(/"rating":(\d+)/i);
        const challengesMatch = html.match(/"wins":(\d+)/i);
        
        return {
          username,
          rating: ratingMatch ? parseInt(ratingMatch[1]) : 0,
          problems_solved: challengesMatch ? parseInt(challengesMatch[1]) : 0,
          challenges_won: challengesMatch ? parseInt(challengesMatch[1]) : 0
        };
      } catch (error) {
        console.error('TopCoder getUserInfo error:', error);
        return { username, rating: 0, problems_solved: 0, error: 'Could not fetch data. Verify username is correct.' };
      }
    }
  },
  
  /**
   * UVa Online Judge
   */
  uva: {
    async getUserInfo(username) {
      try {
        const searchUrl = `https://uhunt.onlinejudge.org/api/uname2uid/${username}`;
        const searchRes = await PlatformAPI.fetchWithTimeout(searchUrl);
        const userId = await searchRes.text();
        
        if (!userId || userId === '0') {
          throw new Error('User not found');
        }
        
        const url = `https://uhunt.onlinejudge.org/api/solved-bits/${userId}`;
        const response = await PlatformAPI.fetchWithTimeout(url);
        const data = await response.json();
        
        let solved = 0;
        if (data && data.solved) {
          Object.values(data.solved).forEach(val => {
            solved += val.toString(2).split('1').length - 1;
          });
        }
        
        return {
          username,
          user_id: userId,
          problems_solved: solved
        };
      } catch (error) {
        console.error('UVa getUserInfo error:', error);
        return { username, problems_solved: 0, error: 'Could not fetch data' };
      }
    }
  },
  
  /**
   * GeeksforGeeks
   * Note: GFG blocks CORS from extensions. May require content script or proxy.
   */
  geeksforgeeks: {
    async getUserInfo(username) {
      try {
        // GFG blocks direct fetch from extensions
        // This is a placeholder that will fail with CORS
        // Consider using content script injection or proxy server
        const url = `https://auth.geeksforgeeks.org/user/${username}/practice/`;
        const response = await PlatformAPI.fetchWithTimeout(url);
        const html = await response.text();
        
        const solvedMatch = html.match(/problems-solved[\s\S]*?(\d+)\+?<\/div>/i);
        const scoreMatch = html.match(/score[\s\S]*?(\d+)<\/div>/i);
        
        return {
          username,
          problems_solved: solvedMatch ? parseInt(solvedMatch[1]) : 0,
          score: scoreMatch ? parseInt(scoreMatch[1]) : 0
        };
      } catch (error) {
        console.error('GeeksforGeeks getUserInfo error:', error);
        // Return graceful error instead of throwing
        return { 
          username, 
          problems_solved: 0, 
          score: 0,
          error: 'CORS blocked. GFG requires content script or manual entry.',
          note: 'GeeksforGeeks blocks extension requests. Feature limited.'
        };
      }
    }
  },

  /**
   * Generic fetch for all platforms
   */
  async fetchPlatformData(platform, username) {
    const handlers = {
      codeforces: async () => {
        const [info, status, ratings] = await Promise.all([
          this.codeforces.getUserInfo(username),
          this.codeforces.getUserStatus(username),
          this.codeforces.getRatingHistory(username)
        ]);
        
        return {
          ...info,
          ...status,
          contests_participated: ratings.length,
          rating_history: ratings,
          last_contest: ratings.length > 0 ? ratings[ratings.length - 1] : null
        };
      },
      leetcode: async () => {
        const [profile, submissions] = await Promise.all([
          this.leetcode.getUserProfile(username),
          this.leetcode.getRecentSubmissions(username)
        ]);
        
        return {
          ...profile,
          recent_submissions: submissions
        };
      },
      atcoder: async () => {
        return await this.atcoder.getUserInfo(username);
      },
      codechef: async () => {
        return await this.codechef.getUserInfo(username);
      },
      hackerrank: async () => {
        return await this.hackerrank.getUserInfo(username);
      },
      cses: async () => {
        return await this.cses.getUserInfo(username);
      },
      spoj: async () => {
        return await this.spoj.getUserInfo(username);
      },
      topcoder: async () => {
        return await this.topcoder.getUserInfo(username);
      },
      uva: async () => {
        return await this.uva.getUserInfo(username);
      },
      geeksforgeeks: async () => {
        return await this.geeksforgeeks.getUserInfo(username);
      }
    };
    
    if (!handlers[platform]) {
      throw new Error(`Platform ${platform} not supported yet`);
    }
    
    try {
      const data = await handlers[platform]();
      return {
        ...data,
        platform,
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching ${platform} data:`, error);
      throw error;
    }
  }
};

export default PlatformAPI;
