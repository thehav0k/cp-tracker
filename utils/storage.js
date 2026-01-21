/**
 * Storage Manager - Handles all data persistence operations
 * Uses chrome.storage.local for main data and chrome.storage.sync for small configs
 */

const StorageManager = {
  // Default configuration
  DEFAULT_CONFIG: {
    usernames: {
      codeforces: '',
      leetcode: '',
      atcoder: '',
      codechef: '',
      hackerrank: '',
      cses: '',
      spoj: '',
      topcoder: '',
      uva: '',
      geeksforgeeks: ''
    },
    settings: {
      auto_sync_frequency: '6h',
      notifications_enabled: true,
      theme: 'dark',
      comparison_timeframes: ['7d', '30d', '90d', 'all'],
      default_view: 'dashboard'
    }
  },

  /**
   * Initialize storage with default values
   */
  async init() {
    try {
      const config = await this.getConfig();
      console.log('Current config:', config);
      if (!config || !config.usernames || !config.settings) {
        console.log('Initializing with default config');
        await this.setConfig(this.DEFAULT_CONFIG);
      }
      return true;
    } catch (error) {
      console.error('Storage init error:', error);
      throw error;
    }
  },

  /**
   * Get user configuration
   */
  async getConfig() {
    return new Promise((resolve, reject) => {
      if (!chrome || !chrome.storage) {
        reject(new Error('Chrome storage API not available'));
        return;
      }
      chrome.storage.local.get(['user_config'], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result.user_config || null);
        }
      });
    });
  },

  /**
   * Set user configuration
   */
  async setConfig(config) {
    return new Promise((resolve, reject) => {
      if (!chrome || !chrome.storage) {
        reject(new Error('Chrome storage API not available'));
        return;
      }
      console.log('Setting config:', config);
      chrome.storage.local.set({ user_config: config }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error setting config:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          console.log('Config saved successfully');
          resolve(true);
        }
      });
    });
  },

  /**
   * Update specific username
   */
  async updateUsername(platform, username) {
    const config = await this.getConfig();
    if (config) {
      config.usernames[platform] = username;
      await this.setConfig(config);
    }
  },

  /**
   * Get all usernames
   */
  async getUsernames() {
    const config = await this.getConfig();
    return config ? config.usernames : this.DEFAULT_CONFIG.usernames;
  },

  /**
   * Get settings
   */
  async getSettings() {
    const config = await this.getConfig();
    return config ? config.settings : this.DEFAULT_CONFIG.settings;
  },

  /**
   * Update settings
   */
  async updateSettings(settings) {
    const config = await this.getConfig();
    if (config) {
      config.settings = { ...config.settings, ...settings };
      await this.setConfig(config);
    }
  },

  /**
   * Get platform stats
   */
  async getPlatformStats(platform) {
    return new Promise((resolve) => {
      chrome.storage.local.get([`stats_${platform}`], (result) => {
        resolve(result[`stats_${platform}`] || null);
      });
    });
  },

  /**
   * Set platform stats
   */
  async setPlatformStats(platform, stats) {
    const key = `stats_${platform}`;
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: { ...stats, last_updated: new Date().toISOString() } }, () => {
        resolve(true);
      });
    });
  },

  /**
   * Get all platform stats
   */
  async getAllPlatformStats() {
    const platforms = ['codeforces', 'leetcode', 'atcoder', 'codechef', 'hackerrank', 
                       'cses', 'spoj', 'topcoder', 'uva', 'geeksforgeeks'];
    const stats = {};
    
    for (const platform of platforms) {
      stats[platform] = await this.getPlatformStats(platform);
    }
    
    return stats;
  },

  /**
   * Get aggregated stats
   */
  async getAggregatedStats() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['aggregated_stats'], (result) => {
        resolve(result.aggregated_stats || {
          total_problems_solved: 0,
          total_contests: 0,
          average_rating: 0,
          total_active_days: 0,
          platforms_active: 0
        });
      });
    });
  },

  /**
   * Set aggregated stats
   */
  async setAggregatedStats(stats) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ aggregated_stats: stats }, () => {
        resolve(true);
      });
    });
  },

  /**
   * Add daily log entry
   */
  async addDailyLog(date, data) {
    const logs = await this.getDailyLogs();
    const existingIndex = logs.findIndex(log => log.date === date);
    
    if (existingIndex >= 0) {
      logs[existingIndex] = { date, ...data };
    } else {
      logs.push({ date, ...data });
    }
    
    // Keep only last 365 days
    const sortedLogs = logs.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 365);
    
    return new Promise((resolve) => {
      chrome.storage.local.set({ daily_logs: sortedLogs }, () => {
        resolve(true);
      });
    });
  },

  /**
   * Get daily logs
   */
  async getDailyLogs() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['daily_logs'], (result) => {
        resolve(result.daily_logs || []);
      });
    });
  },

  /**
   * Get platform rating history
   */
  async getPlatformRatingHistory(platform) {
    return new Promise((resolve) => {
      chrome.storage.local.get([`rating_history_${platform}`], (result) => {
        resolve(result[`rating_history_${platform}`] || []);
      });
    });
  },

  /**
   * Set platform rating history
   */
  async setPlatformRatingHistory(platform, history) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [`rating_history_${platform}`]: history }, () => {
        resolve(true);
      });
    });
  },

  /**
   * Get all platform rating histories combined
   */
  async getAllPlatformRatingHistories() {
    const platforms = ['codeforces', 'leetcode', 'atcoder', 'codechef', 'hackerrank', 'cses', 'spoj', 'topcoder', 'uva', 'geeksforgeeks'];
    const histories = await Promise.all(
      platforms.map(p => this.getPlatformRatingHistory(p))
    );
    
    // Combine and sort by timestamp
    const combined = [];
    histories.forEach((history, i) => {
      if (history && history.length > 0) {
        combined.push(...history.map(h => ({
          ...h,
          platform: platforms[i]
        })));
      }
    });
    
    return combined.sort((a, b) => a.timestamp - b.timestamp);
  },

  /**
   * Process submissions and update daily logs from actual submission times
   */
  async processSubmissions(platformData) {
    if (!platformData.solved_problems || platformData.solved_problems.length === 0) {
      console.log('No solved problems to process');
      return;
    }

    const dailyProblems = {};
    let hasTimestamps = false;
    
    // Group problems by date (only if they have timestamps)
    platformData.solved_problems.forEach(problem => {
      if (problem.solvedAt) {
        hasTimestamps = true;
        // Convert timestamp to local date (not UTC)
        const localDate = new Date(problem.solvedAt * 1000);
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        const date = `${year}-${month}-${day}`;
        
        if (!dailyProblems[date]) {
          dailyProblems[date] = { count: 0, problems: [] };
        }
        dailyProblems[date].count++;
        dailyProblems[date].problems.push({
          name: problem.name,
          rating: problem.rating,
          tags: problem.tags
        });
      }
    });
    
    // If no problems have timestamps, don't create any daily logs
    if (!hasTimestamps) {
      console.log(`Platform ${platformData.platform} does not provide submission timestamps - skipping daily log creation`);
      return;
    }

    // Update daily logs for each date
    const existingLogs = await this.getDailyLogs();
    const logsMap = new Map(existingLogs.map(log => [log.date, log]));

    for (const [date, data] of Object.entries(dailyProblems)) {
      const existing = logsMap.get(date);
      
      // Track unique problems by name to avoid duplicates
      const existingProblems = existing?.problems || [];
      const existingProblemNames = new Set(existingProblems.map(p => p.name));
      
      // Only add new problems that don't already exist
      const newProblems = data.problems.filter(p => !existingProblemNames.has(p.name));
      const allProblems = [...existingProblems, ...newProblems];
      
      logsMap.set(date, {
        date,
        problems_solved: allProblems.length, // Count of unique problems
        platforms_used: existing ? [...new Set([...(existing.platforms_used || []), platformData.platform || 'unknown'])] : [platformData.platform || 'unknown'],
        problems: allProblems
      });
    }

    // Convert back to array and save
    const updatedLogs = Array.from(logsMap.values())
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 365);

    console.log('Saving daily logs:', updatedLogs.slice(0, 10)); // Log first 10 entries

    return new Promise((resolve) => {
      chrome.storage.local.set({ daily_logs: updatedLogs }, () => {
        console.log('Daily logs saved successfully');
        resolve(true);
      });
    });
  },

  /**
   * Get daily logs
   */

  /**
   * Get rating history
   */
  async getRatingHistory() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['rating_history'], (result) => {
        resolve(result.rating_history || []);
      });
    });
  },

  /**
   * Add rating history entry
   */
  async addRatingHistory(date, ratings) {
    const history = await this.getRatingHistory();
    const existingIndex = history.findIndex(entry => entry.date === date);
    
    if (existingIndex >= 0) {
      history[existingIndex] = { date, ...ratings };
    } else {
      history.push({ date, ...ratings });
    }
    
    // Keep all history
    const sortedHistory = history.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return new Promise((resolve) => {
      chrome.storage.local.set({ rating_history: sortedHistory }, () => {
        resolve(true);
      });
    });
  },

  /**
   * Get last sync timestamp
   */
  async getLastSync() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['last_sync'], (result) => {
        resolve(result.last_sync || null);
      });
    });
  },

  /**
   * Set last sync timestamp
   */
  async setLastSync(timestamp) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ last_sync: timestamp }, () => {
        resolve(true);
      });
    });
  },

  /**
   * Clear all data (for testing/reset)
   */
  async clearAll() {
    return new Promise((resolve) => {
      chrome.storage.local.clear(() => {
        resolve(true);
      });
    });
  }
};

// Initialize storage on load
if (typeof chrome !== 'undefined' && chrome.storage) {
  StorageManager.init().catch(err => {
    console.error('Failed to initialize storage:', err);
  });
}

export default StorageManager;
