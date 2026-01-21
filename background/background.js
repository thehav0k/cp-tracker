/**
 * Background Service Worker
 * Handles automated syncing, alarms, and notifications
 */

import StorageManager from '../utils/storage.js';
import PlatformAPI from '../utils/api.js';
import AnalyticsEngine from '../utils/analytics.js';
import { GoalsManager } from '../utils/goals.js';

console.log('CP Progress Tracker background service worker loaded');

// Install event - setup initial state
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // First time install
    await StorageManager.init();
    
    // Setup periodic sync alarm (default: 6 hours)
    chrome.alarms.create('periodicSync', {
      periodInMinutes: 360 // 6 hours
    });
    
    // Open options page on first install
    chrome.runtime.openOptionsPage();
  } else if (details.reason === 'update') {
    // Extension updated
    console.log('Updated to version', chrome.runtime.getManifest().version);
  }
});

// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('Alarm triggered:', alarm.name);
  
  if (alarm.name === 'periodicSync') {
    await performBackgroundSync();
  }
});

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);
  
  if (message.type === 'MANUAL_SYNC') {
    performBackgroundSync().then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep channel open for async response
  }
  
  if (message.type === 'UPDATE_SYNC_FREQUENCY') {
    updateSyncFrequency(message.frequency).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (message.type === 'FETCH_CONTEST_DATA') {
    fetchUpcomingContests().then(contests => {
      sendResponse({ success: true, contests });
    });
    return true;
  }
});

/**
 * Perform background data sync
 */
async function performBackgroundSync() {
  console.log('Starting background sync...');
  
  try {
    // Get settings
    const settings = await StorageManager.getSettings();
    
    if (!settings.auto_sync_enabled && settings.auto_sync_enabled !== undefined) {
      console.log('Auto-sync is disabled');
      return;
    }
    
    // Get usernames
    const usernames = await StorageManager.getUsernames();
    const configuredPlatforms = Object.entries(usernames).filter(([_, username]) => username && username.trim());
    
    if (configuredPlatforms.length === 0) {
      console.log('No usernames configured');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    // Sync each platform
    for (const [platform, username] of configuredPlatforms) {
      try {
        console.log(`Syncing ${platform} for user ${username}...`);
        const data = await PlatformAPI.fetchPlatformData(platform, username);
        console.log(`${platform} data received:`, {
          hasRatingHistory: !!data.rating_history,
          ratingHistoryLength: data.rating_history ? data.rating_history.length : 0
        });
        
        await StorageManager.setPlatformStats(platform, data);
        
        // Store platform-specific rating history if available
        if (data.rating_history && data.rating_history.length > 0) {
          console.log(`Storing ${data.rating_history.length} rating history entries for ${platform}`);
          const history = await StorageManager.getPlatformRatingHistory(platform) || [];
          const historyMap = new Map(history.map(h => [h.date, h]));
          
          data.rating_history.forEach(entry => {
            historyMap.set(entry.date, {
              ...entry,
              platform,
              timestamp: new Date(entry.date).getTime()
            });
          });
          
          const updatedHistory = Array.from(historyMap.values())
            .sort((a, b) => a.timestamp - b.timestamp);
          await StorageManager.setPlatformRatingHistory(platform, updatedHistory);
        }
        
        // Process submissions to update daily logs with actual dates
        console.log(`Processing submissions for ${platform}...`);
        await StorageManager.processSubmissions(data);
        
        successCount++;
      } catch (error) {
        console.error(`Error syncing ${platform}:`, error);
        errorCount++;
      }
    }
    
    // Update aggregated stats
    const platformStats = await StorageManager.getAllPlatformStats();
    const aggregatedStats = AnalyticsEngine.calculateAggregatedStats(platformStats);
    await StorageManager.setAggregatedStats(aggregatedStats);
    
    // Update rating history
    const today = new Date().toISOString().split('T')[0];
    const todayRatings = {};
    for (const [platform, stats] of Object.entries(platformStats)) {
      if (stats && stats.rating) {
        todayRatings[platform] = stats.rating;
      }
    }
    await StorageManager.addRatingHistory(today, todayRatings);
    
    // Update last sync timestamp
    await StorageManager.setLastSync(new Date().toISOString());
    
    // Check for achievements
    const newAchievements = await GoalsManager.checkAchievements(aggregatedStats);
    if (newAchievements.length > 0 && settings.notifications_enabled) {
      showAchievementNotification(newAchievements[0]);
    }
    
    // Update goal progress
    await GoalsManager.calculateGoalProgress(aggregatedStats);
    
    console.log(`Background sync completed: ${successCount} successful, ${errorCount} failed`);
    
    // Show notification if enabled
    if (settings.notifications_enabled && successCount > 0) {
      showSyncNotification(successCount, errorCount);
    }
    
  } catch (error) {
    console.error('Background sync error:', error);
  }
}

/**
 * Update sync frequency
 */
async function updateSyncFrequency(frequency) {
  console.log('Updating sync frequency to:', frequency);
  
  // Clear existing alarm
  await chrome.alarms.clear('periodicSync');
  
  // Map frequency to minutes
  const frequencyMap = {
    '1h': 60,
    '6h': 360,
    '12h': 720,
    '24h': 1440
  };
  
  const minutes = frequencyMap[frequency] || 360;
  
  // Create new alarm
  chrome.alarms.create('periodicSync', {
    periodInMinutes: minutes
  });
  
  console.log(`Sync alarm set to ${minutes} minutes`);
}

/**
 * Show sync notification
 */
function showSyncNotification(successCount, errorCount) {
  const title = 'CP Progress Tracker';
  let message = `Synced ${successCount} platform${successCount > 1 ? 's' : ''}`;
  
  if (errorCount > 0) {
    message += ` (${errorCount} failed)`;
  }
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: '../icons/icon128.png',
    title: title,
    message: message,
    priority: 1
  });
}

/**
 * Fetch upcoming contests from clist.by
 */
async function fetchUpcomingContests() {
  try {
    const url = 'https://clist.by/api/v2/contest/?limit=20&upcoming=true&order_by=start';
    
    // Note: This requires API key in production
    const response = await fetch(url);
    const data = await response.json();
    
    return data.objects || [];
  } catch (error) {
    console.error('Error fetching contests:', error);
    return [];
  }
}

/**
 * Setup contest reminders
 */
async function setupContestReminders() {
  // TODO: Implement contest reminder logic
  // 1. Fetch upcoming contests
  // 2. Create alarms for reminders (1 hour before, 30 min before, etc.)
  // 3. Show notification when alarm triggers
}

/**
 * Check for achievements
 */
async function checkAchievements() {
  const platformStats = await StorageManager.getAllPlatformStats();
  const aggregatedStats = await StorageManager.getAggregatedStats();
  const dailyLogs = await StorageManager.getDailyLogs();
  
  const achievements = [];
  
  // Check streak achievement
  const streak = AnalyticsEngine.calculateStreak(dailyLogs);
  if (streak.current === 7) {
    achievements.push({
      id: 'week_streak',
      title: '7 Day Streak!',
      description: 'Solved problems for 7 days straight'
    });
  } else if (streak.current === 30) {
    achievements.push({
      id: 'month_streak',
      title: '30 Day Streak!',
      description: 'Solved problems for 30 days straight'
    });
  }
  
  // Check problem milestones
  const totalProblems = aggregatedStats.total_problems_solved || 0;
  const milestones = [100, 250, 500, 1000, 2000, 5000];
  
  for (const milestone of milestones) {
    if (totalProblems === milestone) {
      achievements.push({
        id: `problems_${milestone}`,
        title: `${milestone} Problems Solved!`,
        description: `You've solved ${milestone} problems across all platforms`
      });
    }
  }
  
  // Show achievement notifications
  for (const achievement of achievements) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../icons/icon128.png',
      title: `🏆 Achievement Unlocked!`,
      message: `${achievement.title}\n${achievement.description}`,
      priority: 2
    });
  }
}

// Periodic tasks
chrome.alarms.create('dailyCheck', {
  periodInMinutes: 1440 // 24 hours
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'dailyCheck') {
    await checkAchievements();
  }
});

/**
 * Show achievement notification
 */
function showAchievementNotification(achievement) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: '../icons/icon128.png',
    title: `${achievement.icon} Achievement Unlocked!`,
    message: `${achievement.name}\n${achievement.description}`,
    priority: 2
  });
}

// Listen for storage changes to detect new data
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.aggregated_stats) {
    // Stats updated, check for achievements
    checkAchievements();
  }
});
