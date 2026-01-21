/**
 * CP Progress Tracker - Popup Script
 * Handles UI interactions and data display
 */

import StorageManager from '../utils/storage.js';
import PlatformAPI from '../utils/api.js';
import AnalyticsEngine from '../utils/analytics.js';
import { GoalsManager } from '../utils/goals.js';

// State management
let currentView = 'dashboard';
let platformStats = {};
let aggregatedStats = {};
let dailyLogs = [];
let ratingHistory = [];

// DOM Elements
const elements = {
  syncBtn: document.getElementById('syncBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  themeToggle: document.getElementById('themeToggle'),
  tabs: document.querySelectorAll('.tab'),
  views: document.querySelectorAll('.view'),
  syncStatus: document.getElementById('syncStatus'),
  lastSyncText: document.getElementById('lastSyncText'),
  
  // Dashboard
  totalProblems: document.getElementById('totalProblems'),
  avgRating: document.getElementById('avgRating'),
  currentStreak: document.getElementById('currentStreak'),
  platformsActive: document.getElementById('platformsActive'),
  problemsChange: document.getElementById('problemsChange'),
  ratingChange: document.getElementById('ratingChange'),
  weekProgress: document.getElementById('weekProgress'),
  weekCalendar: document.getElementById('weekCalendar'),
  platformsList: document.getElementById('platformsList'),
  recommendationsList: document.getElementById('recommendationsList'),
  
  // Comparison
  comparisonType: document.getElementById('comparisonType'),
  comparisonResults: document.getElementById('comparisonResults'),
  
  // Analytics
  ratingChart: document.getElementById('ratingChart'),
  categoryMastery: document.getElementById('categoryMastery'),
  
  // Goals
  addGoalBtn: document.getElementById('addGoalBtn'),
  goalsList: document.getElementById('goalsList'),
  achievementsList: document.getElementById('achievementsList'),
  
  // Other
  goToSettings: document.getElementById('goToSettings'),
  openOptions: document.getElementById('openOptions')
};

/**
 * Initialize the popup
 */
async function init() {
  // Load theme
  loadTheme();
  
  // Setup event listeners
  setupEventListeners();
  
  // Load data
  await loadData();
  
  // Update UI
  updateDashboard();
  
  console.log('CP Progress Tracker initialized');
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Sync button
  elements.syncBtn?.addEventListener('click', handleSync);
  
  // Settings button
  elements.settingsBtn?.addEventListener('click', openSettings);
  
  // Theme toggle
  elements.themeToggle?.addEventListener('click', toggleTheme);
  
  // Tab navigation
  elements.tabs?.forEach(tab => {
    tab.addEventListener('click', () => {
      const view = tab.dataset.view;
      switchView(view);
    });
  });
  
  // Comparison type change
  elements.comparisonType?.addEventListener('change', updateComparison);
  
  // Goals button
  elements.addGoalBtn?.addEventListener('click', showAddGoalModal);
  
  // Go to settings buttons
  elements.goToSettings?.addEventListener('click', openSettings);
  elements.openOptions?.addEventListener('click', openSettings);
}

/**
 * Load data from storage
 */
async function loadData() {
  try {
    // Ensure storage is initialized
    await StorageManager.init();
    
    platformStats = await StorageManager.getAllPlatformStats();
    aggregatedStats = await StorageManager.getAggregatedStats();
    dailyLogs = await StorageManager.getDailyLogs();
    ratingHistory = await StorageManager.getRatingHistory();
    
    // Update last sync time
    const lastSync = await StorageManager.getLastSync();
    if (lastSync) {
      const date = new Date(lastSync);
      elements.lastSyncText.textContent = `Last synced: ${formatRelativeTime(date)}`;
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

/**
 * Handle manual sync
 */
async function handleSync() {
  try {
    // Show sync status
    elements.syncStatus?.classList.remove('hidden');
    elements.syncBtn?.classList.add('spinning');
    
    // Get usernames
    const usernames = await StorageManager.getUsernames();
    
    // Check if any usernames are configured
    const configuredPlatforms = Object.entries(usernames).filter(([_, username]) => username && username.trim());
    
    if (configuredPlatforms.length === 0) {
      alert('Please configure at least one username in settings!');
      elements.syncStatus?.classList.add('hidden');
      elements.syncBtn?.classList.remove('spinning');
      return;
    }
    
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
        platformStats[platform] = data;
        
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
          console.log(`Saved ${updatedHistory.length} rating history entries for ${platform}`);
        }
        
        // Process submissions to update daily logs with actual dates
        await StorageManager.processSubmissions(data);
      } catch (error) {
        console.error(`Error syncing ${platform}:`, error);
      }
    }
    
    // Update aggregated stats
    aggregatedStats = AnalyticsEngine.calculateAggregatedStats(platformStats);
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
    
    // Update last sync
    await StorageManager.setLastSync(new Date().toISOString());
    
    // Check for achievements
    const newAchievements = await GoalsManager.checkAchievements(aggregatedStats);
    if (newAchievements.length > 0) {
      // Show notification or toast
      console.log('New achievements earned:', newAchievements);
    }
    
    // Update goal progress
    await GoalsManager.calculateGoalProgress(aggregatedStats);
    
    // Reload data
    await loadData();
    
    // Update UI
    updateDashboard();
    updateComparison();
    
    elements.lastSyncText.textContent = 'Just now';
    
  } catch (error) {
    console.error('Sync error:', error);
    alert('Sync failed! Check console for details.');
  } finally {
    // Hide sync status
    elements.syncStatus?.classList.add('hidden');
    elements.syncBtn?.classList.remove('spinning');
  }
}

/**
 * Update dashboard view
 */
function updateDashboard() {
  // Quick stats
  if (elements.totalProblems) {
    elements.totalProblems.textContent = formatNumber(aggregatedStats.total_problems_solved || 0);
  }
  
  if (elements.avgRating) {
    elements.avgRating.textContent = formatNumber(aggregatedStats.average_rating || 0);
  }
  
  // Streak
  const streak = AnalyticsEngine.calculateStreak(dailyLogs);
  if (elements.currentStreak) {
    const streakText = `${streak.current}`;
    const longestText = streak.longest > streak.current ? ` (Best: ${streak.longest})` : '';
    elements.currentStreak.textContent = streakText;
    elements.currentStreak.title = `Current: ${streak.current} days${longestText}`;
  }
  
  // Platforms active
  if (elements.platformsActive) {
    elements.platformsActive.textContent = `${aggregatedStats.platforms_active || 0}/10`;
  }
  
  // Week calendar
  updateWeekCalendar();
  
  // Platform list
  updatePlatformsList();
  
  // Recommendations
  updateRecommendations();
}

/**
 * Update week calendar
 */
function updateWeekCalendar() {
  if (!elements.weekCalendar) return;
  
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekData = [];
  
  // Get last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const log = dailyLogs.find(l => l.date === dateStr);
    const count = log && log.problems_solved ? parseInt(log.problems_solved) : 0;
    
    weekData.push({
      name: dayNames[date.getDay()],
      date: dateStr,
      count: count,
      isToday: i === 0
    });
  }
  
  console.log('Week calendar data:', weekData);
  
  // Render calendar
  elements.weekCalendar.innerHTML = weekData.map(day => `
    <div class="day-item ${day.isToday ? 'today' : ''}">
      <span class="day-name">${day.name}</span>
      <span class="day-count">${day.count}</span>
    </div>
  `).join('');
  
  // Update progress bar
  const totalSolved = weekData.reduce((sum, day) => sum + day.count, 0);
  const targetWeekly = 50; // Target: 50 problems per week
  const percentage = Math.min(100, (totalSolved / targetWeekly) * 100);
  
  if (elements.weekProgress) {
    elements.weekProgress.style.width = `${percentage}%`;
  }
}

/**
 * Update platforms list
 */
function updatePlatformsList() {
  if (!elements.platformsList) return;
  
  const platforms = Object.entries(platformStats).filter(([_, stats]) => stats);
  
  if (platforms.length === 0) {
    elements.platformsList.innerHTML = `
      <div class="empty-state">
        <p>👋 Welcome! Configure your usernames in settings to get started.</p>
        <button id="goToSettings" class="btn btn-primary">Configure Usernames</button>
      </div>
    `;
    
    // Re-attach event listener
    document.getElementById('goToSettings')?.addEventListener('click', openSettings);
    return;
  }
  
  const platformColors = {
    codeforces: '#1F8ACB',
    leetcode: '#FFA116',
    atcoder: '#000000',
    codechef: '#5B4638',
    hackerrank: '#00EA64'
  };
  
  elements.platformsList.innerHTML = platforms.map(([platform, stats]) => {
    const color = platformColors[platform] || '#666';
    const initial = platform.charAt(0).toUpperCase();
    
    return `
      <div class="platform-item">
        <div class="platform-logo" style="background: ${color}; color: white;">
          ${initial}
        </div>
        <div class="platform-info">
          <div class="platform-name">${capitalizeFirst(platform)}</div>
          <div class="platform-stats">
            <span class="platform-rating">${stats.rating || stats.problems_solved || 0}</span>
            ${stats.rank ? `· ${stats.rank}` : ''}
            ${stats.problems_solved ? `· ${stats.problems_solved} solved` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Update recommendations
 */
function updateRecommendations() {
  if (!elements.recommendationsList) return;
  
  const recommendations = AnalyticsEngine.generateRecommendations(platformStats, aggregatedStats);
  const insights = AnalyticsEngine.generateInsights(platformStats, dailyLogs, ratingHistory);
  
  const allItems = [...recommendations, ...insights];
  
  if (allItems.length === 0) {
    elements.recommendationsList.innerHTML = `
      <div class="empty-state">
        <p>Complete your first sync to get personalized recommendations!</p>
      </div>
    `;
    return;
  }
  
  elements.recommendationsList.innerHTML = allItems.map(item => `
    <div class="recommendation-item ${item.priority ? item.priority + '-priority' : ''}">
      <div class="recommendation-icon">${item.icon || '💡'}</div>
      <div class="recommendation-content">
        <div class="recommendation-message">${item.message}</div>
        ${item.action ? `<div class="recommendation-action">${item.action}</div>` : ''}
      </div>
    </div>
  `).join('');
}

/**
 * Update comparison view
 */
function updateComparison() {
  if (!elements.comparisonResults) return;
  
  const type = elements.comparisonType?.value || '30d';
  
  if (!dailyLogs || dailyLogs.length === 0) {
    elements.comparisonResults.innerHTML = '<div class="empty-state">Sync data to see comparisons</div>';
    return;
  }

  // Parse days from type (e.g., "7d" -> 7, "30d" -> 30)
  const days = parseInt(type) || 30;
  const now = new Date();
  now.setHours(23, 59, 59, 999); // End of today
  
  const periodStart = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
  const halfPeriod = new Date(now.getTime() - ((days / 2) * 24 * 60 * 60 * 1000));

  console.log('Comparison period:', {
    type,
    days,
    periodStart: periodStart.toISOString().split('T')[0],
    halfPeriod: halfPeriod.toISOString().split('T')[0],
    now: now.toISOString().split('T')[0],
    totalLogs: dailyLogs.length
  });

  // Split logs into two periods
  const firstHalf = dailyLogs.filter(log => {
    const date = new Date(log.date);
    return date >= periodStart && date < halfPeriod;
  });

  const secondHalf = dailyLogs.filter(log => {
    const date = new Date(log.date);
    return date >= halfPeriod && date <= now;
  });

  console.log('Filtered logs:', {
    firstHalfCount: firstHalf.length,
    secondHalfCount: secondHalf.length
  });

  const firstHalfProblems = firstHalf.reduce((sum, log) => sum + (parseInt(log.problems_solved) || 0), 0);
  const secondHalfProblems = secondHalf.reduce((sum, log) => sum + (parseInt(log.problems_solved) || 0), 0);
  const change = secondHalfProblems - firstHalfProblems;
  
  // Fix percentage calculation
  let percentChange;
  if (firstHalfProblems === 0 && secondHalfProblems === 0) {
    percentChange = '0';
  } else if (firstHalfProblems === 0) {
    percentChange = 'N/A'; // Can't calculate percentage from 0
  } else {
    percentChange = ((change / firstHalfProblems) * 100).toFixed(1);
  }

  // Calculate activity days
  const firstHalfActiveDays = firstHalf.filter(log => (parseInt(log.problems_solved) || 0) > 0).length;
  const secondHalfActiveDays = secondHalf.filter(log => (parseInt(log.problems_solved) || 0) > 0).length;

  const periodLabel = days === 7 ? 'week' : days === 30 ? 'month' : days === 90 ? 'quarter' : 'year';

  elements.comparisonResults.innerHTML = `
    <div class="comparison-summary">
      <h3>Last ${days} days comparison</h3>
      <p class="comparison-subtitle">First half vs Second half</p>
      
      <div class="comparison-stats">
        <div class="comparison-stat">
          <label>First Half</label>
          <div class="stat-value">${firstHalfProblems}</div>
          <div class="stat-label">problems</div>
          <div class="stat-detail">${firstHalfActiveDays} active days</div>
        </div>
        
        <div class="comparison-arrow">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
        
        <div class="comparison-stat">
          <label>Second Half</label>
          <div class="stat-value">${secondHalfProblems}</div>
          <div class="stat-label">problems</div>
          <div class="stat-detail">${secondHalfActiveDays} active days</div>
        </div>
      </div>
      
      <div class="comparison-change ${change >= 0 ? 'positive' : 'negative'}">
        <span class="change-icon">${change >= 0 ? '📈' : '📉'}</span>
        <span class="change-value">${change >= 0 ? '+' : ''}${change} problems</span>
        ${percentChange !== 'N/A' ? `<span class="change-percent">(${percentChange >= 0 ? '+' : ''}${percentChange}%)</span>` : `<span class="change-percent">(from 0 baseline)</span>`}
      </div>

      <div class="comparison-insights">
        <h4>📊 Insights</h4>
        <ul>
          ${change > 0 ? `<li>✅ You solved ${change} more problems in the second half!</li>` : ''}
          ${change === 0 ? `<li>➡️ Consistent performance across both periods.</li>` : ''}
          ${change < 0 ? `<li>⚠️ ${Math.abs(change)} fewer problems in recent period.</li>` : ''}
          ${secondHalfActiveDays > firstHalfActiveDays ? `<li>✅ More active days recently (+${secondHalfActiveDays - firstHalfActiveDays} days)</li>` : ''}
          ${secondHalfActiveDays < firstHalfActiveDays ? `<li>⚠️ ${firstHalfActiveDays - secondHalfActiveDays} fewer active days recently.</li>` : ''}
          ${firstHalfProblems === 0 && secondHalfProblems === 0 ? `<li>ℹ️ No activity in this period. Start solving to see comparisons!</li>` : ''}
        </ul>
      </div>
    </div>
  `;
}

/**
 * Switch between views
 */
function switchView(view) {
  currentView = view;
  
  // Update tabs
  elements.tabs?.forEach(tab => {
    if (tab.dataset.view === view) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  // Update views
  elements.views?.forEach(viewEl => {
    if (viewEl.id === `${view}-view`) {
      viewEl.classList.add('active');
    } else {
      viewEl.classList.remove('active');
    }
  });
  
  // Load view-specific data
  if (view === 'comparison') {
    updateComparison();
  } else if (view === 'analytics') {
    updateAnalytics();
  } else if (view === 'goals') {
    updateGoalsView();
  }
}

/**
 * Update analytics view
 */
async function updateAnalytics() {
  console.log('Updating analytics view...');
  console.log('Aggregated stats:', aggregatedStats);
  console.log('Rating history:', ratingHistory);
  console.log('Daily logs:', dailyLogs);
  
  // Update category mastery
  if (elements.categoryMastery) {
    if (!aggregatedStats || !aggregatedStats.category_mastery || Object.keys(aggregatedStats.category_mastery).length === 0) {
      elements.categoryMastery.innerHTML = '<div class="empty-state">Sync data to see category breakdown</div>';
    } else {
      const categories = Object.entries(aggregatedStats.category_mastery)
        .sort((a, b) => b[1].solved - a[1].solved)
        .slice(0, 10);
      
      const maxSolved = categories[0][1].solved;
      
      elements.categoryMastery.innerHTML = categories.map(([category, data]) => {
        const percentage = (data.solved / maxSolved) * 100;
        return `
          <div class="category-item">
            <div class="category-name">${capitalizeFirst(category)}</div>
            <div class="category-bar">
              <div class="category-bar-fill" style="width: ${percentage}%">
                ${data.solved}
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }
  
  // Update rating chart with proper curve from platform histories
  if (elements.ratingChart) {
    try {
      console.log('Attempting to fetch platform rating histories...');
      
      // First, check if we have any platform stats at all
      const allStats = await StorageManager.getAllPlatformStats();
      console.log('Platform stats available:', Object.keys(allStats || {}).filter(k => allStats[k]));
      
      // Check raw storage for rating history
      const rawStorage = await new Promise(resolve => {
        chrome.storage.local.get(null, result => {
          const ratingKeys = Object.keys(result).filter(k => k.startsWith('rating_history_'));
          console.log('Rating history keys in storage:', ratingKeys);
          ratingKeys.forEach(key => {
            console.log(`${key}: ${result[key]?.length || 0} entries`);
          });
          resolve(result);
        });
      });
      
      // Fetch platform rating histories
      const platformHistories = await StorageManager.getAllPlatformRatingHistories();
      
      console.log('Platform rating histories fetched:', platformHistories);
      console.log('Number of entries:', platformHistories ? platformHistories.length : 0);
      
      if (!platformHistories || platformHistories.length === 0) {
        console.log('No rating histories found, showing empty state');
        elements.ratingChart.innerHTML = '<div class="empty-state">Sync Codeforces to see rating progression curve</div>';
      } else {
        // Use last 100 contests/rating changes
        const recentRatings = platformHistories.slice(-100);
        
        const ratings = recentRatings.map(entry => entry.new_rating).filter(r => r != null);
        const dates = recentRatings.map(entry => {
          const d = new Date(entry.date);
          return `${d.getMonth() + 1}/${d.getDate()}`;
        });
        
        if (ratings.length === 0) {
          elements.ratingChart.innerHTML = '<div class="empty-state">No valid rating data found</div>';
          return;
        }
        
        const minRating = Math.min(...ratings);
        const maxRating = Math.max(...ratings);
        const currentRating = ratings[ratings.length - 1];
        const startRating = ratings[0];
        const range = maxRating - minRating || 100;
        
        // Create SVG line chart
        const width = 100;
        const height = 60;
        
        let svgContent = '';
        
        if (ratings.length === 1) {
          svgContent = `
            <circle cx="50" cy="30" r="3" fill="var(--accent-primary)"/>
            <text x="50" y="50" text-anchor="middle" font-size="8" fill="var(--text-secondary)">
              Single contest
            </text>
          `;
        } else {
          const points = ratings.map((rating, i) => {
            const x = (i / (ratings.length - 1)) * width;
            const normalizedRating = ((rating - minRating) / range) * height;
            const y = height - normalizedRating;
            return `${x},${y}`;
          }).join(' ');
          
          // Create gradient fill area
          const areaPoints = `0,${height} ${points} ${width},${height}`;
          
          svgContent = `
            <defs>
              <linearGradient id="ratingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:var(--accent-primary);stop-opacity:0.3" />
                <stop offset="100%" style="stop-color:var(--accent-primary);stop-opacity:0.05" />
              </linearGradient>
            </defs>
            <polygon
              points="${areaPoints}"
              fill="url(#ratingGradient)"
            />
            <polyline
              points="${points}"
              fill="none"
              stroke="var(--accent-primary)"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            ${ratings.map((rating, i) => {
              const x = (i / (ratings.length - 1)) * width;
              const normalizedRating = ((rating - minRating) / range) * height;
              const y = height - normalizedRating;
              const change = i > 0 ? rating - ratings[i - 1] : 0;
              const color = change > 0 ? '#10b981' : change < 0 ? '#ef4444' : 'var(--accent-primary)';
              return `<circle cx="${x}" cy="${y}" r="1.5" fill="${color}"/>`;
            }).join('')}
          `;
        }
        
        const change = currentRating - startRating;
        const changeText = change > 0 ? `+${change}` : `${change}`;
        const changeClass = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
        
        elements.ratingChart.innerHTML = `
          <div class="rating-chart">
            <div class="rating-stats">
              <span class="rating-min">Min: ${minRating}</span>
              <span class="rating-current">Current: ${currentRating} <span class="rating-change ${changeClass}">(${changeText})</span></span>
              <span class="rating-max">Max: ${maxRating}</span>
            </div>
            <svg viewBox="0 0 ${width} ${height}" class="rating-curve">
              ${svgContent}
            </svg>
            <div class="rating-info">
              <span>${ratings.length} contest${ratings.length !== 1 ? 's' : ''}</span>
              <span>Latest: ${dates[dates.length - 1]}</span>
            </div>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error loading rating history:', error);
      elements.ratingChart.innerHTML = `<div class="empty-state">Error loading rating data: ${error.message}</div>`;
    }
  }
  
  // Update time analysis with bar diagram
  const timeAnalysis = document.getElementById('timeAnalysis');
  if (timeAnalysis) {
    if (!dailyLogs || dailyLogs.length === 0) {
      timeAnalysis.innerHTML = '<div class="empty-state">Sync data to see activity patterns</div>';
    } else {
      // Calculate activity by day of week
      const dayStats = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      dailyLogs.forEach(log => {
        const day = new Date(log.date).getDay();
        dayStats[day] += log.problems_solved || 0;
      });
      
      const maxProblems = Math.max(...Object.values(dayStats), 1);
      const maxDay = Object.keys(dayStats).reduce((a, b) => dayStats[a] > dayStats[b] ? a : b);
      const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      timeAnalysis.innerHTML = `
        <div class="activity-summary">
          <p>Most active day: <strong>${fullDayNames[maxDay]}</strong></p>
          <p>Problems solved: <strong>${dayStats[maxDay]}</strong></p>
        </div>
        <div class="activity-bars">
          ${Object.keys(dayStats).map(day => {
            const count = dayStats[day];
            const percentage = (count / maxProblems) * 100;
            return `
              <div class="activity-bar-item">
                <div class="activity-bar-label">${dayNames[day]}</div>
                <div class="activity-bar-container">
                  <div class="activity-bar-fill" style="width: ${percentage}%" title="${count} problems"></div>
                </div>
                <div class="activity-bar-count">${count}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
  }
}

/**
 * Toggle theme
 */
function toggleTheme() {
  const currentTheme = document.body.dataset.theme || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.body.dataset.theme = newTheme;
  localStorage.setItem('theme', newTheme);
}

/**
 * Load theme
 */
function loadTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.body.dataset.theme = savedTheme;
}

/**
 * Open settings
 */
function openSettings() {
  chrome.runtime.openOptionsPage();
}

/**
 * Utility: Format number with commas
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Utility: Format relative time
 */
function formatRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
}

/**
 * Utility: Capitalize first letter
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Update goals view
 */
async function updateGoalsView() {
  const goals = await GoalsManager.getGoals();
  const achievements = await GoalsManager.getAchievements();
  
  // Update goals list
  if (goals.length === 0) {
    elements.goalsList.innerHTML = '<div class="empty-state">No goals yet. Create your first goal!</div>';
  } else {
    elements.goalsList.innerHTML = goals.map(goal => `
      <div class="goal-card ${goal.completed ? 'completed' : ''}">
        <div class="goal-header">
          <h4>${goal.description}</h4>
          <button class="delete-goal-btn" data-id="${goal.id}">×</button>
        </div>
        <div class="goal-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${Math.min(100, (goal.progress / goal.target) * 100)}%"></div>
          </div>
          <span class="progress-text">${goal.progress} / ${goal.target}</span>
        </div>
        ${goal.completed ? `<div class="goal-completed">✓ Completed ${formatRelativeTime(new Date(goal.completed_at))}</div>` : ''}
      </div>
    `).join('');
    
    // Add event listeners for delete buttons
    document.querySelectorAll('.delete-goal-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const goalId = e.target.dataset.id;
        await GoalsManager.deleteGoal(goalId);
        updateGoalsView();
      });
    });
  }
  
  // Update achievements
  if (achievements.length === 0) {
    elements.achievementsList.innerHTML = '<div class="empty-state">Sync data to unlock achievements</div>';
  } else {
    const allAchievements = GoalsManager.achievements;
    elements.achievementsList.innerHTML = allAchievements.map(ach => {
      const earned = achievements.find(a => a.id === ach.id);
      return `
        <div class="achievement-card ${earned ? 'earned' : 'locked'}">
          <div class="achievement-icon">${ach.icon}</div>
          <div class="achievement-info">
            <h4>${ach.name}</h4>
            <p>${ach.description}</p>
            ${earned ? `<span class="earned-date">Earned ${formatRelativeTime(new Date(earned.earned_at))}</span>` : '<span class="locked-text">🔒 Locked</span>'}
          </div>
        </div>
      `;
    }).join('');
  }
}

/**
 * Show add goal modal
 */
function showAddGoalModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Add New Goal</h3>
        <button class="close-modal">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Goal Type</label>
          <select id="goalType">
            <option value="weekly">Weekly Problems</option>
            <option value="monthly">Monthly Problems</option>
            <option value="streak">Streak Days</option>
            <option value="rating">Rating Increase</option>
            <option value="contest">Contest Participation</option>
          </select>
        </div>
        <div class="form-group">
          <label>Target</label>
          <input type="number" id="goalTarget" min="1" value="10" />
        </div>
        <div class="form-group" id="platformGroup" style="display:none">
          <label>Platform</label>
          <select id="goalPlatform">
            <option value="codeforces">Codeforces</option>
            <option value="leetcode">LeetCode</option>
            <option value="atcoder">AtCoder</option>
            <option value="codechef">CodeChef</option>
          </select>
        </div>
        <div class="form-group">
          <label>Description</label>
          <input type="text" id="goalDescription" placeholder="Solve 10 problems this week" />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary close-modal">Cancel</button>
        <button class="btn btn-primary" id="saveGoalBtn">Create Goal</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const goalType = modal.querySelector('#goalType');
  const platformGroup = modal.querySelector('#platformGroup');
  
  goalType.addEventListener('change', () => {
    platformGroup.style.display = goalType.value === 'rating' ? 'block' : 'none';
  });
  
  modal.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => modal.remove());
  });
  
  modal.querySelector('#saveGoalBtn').addEventListener('click', async () => {
    const type = modal.querySelector('#goalType').value;
    const target = parseInt(modal.querySelector('#goalTarget').value);
    const description = modal.querySelector('#goalDescription').value;
    const platform = modal.querySelector('#goalPlatform').value;
    
    const goal = {
      type,
      target,
      description: description || `${type} goal: ${target}`,
    };
    
    if (type === 'rating') {
      goal.platform = platform;
      goal.initial_rating = platformStats[platform]?.rating || 0;
    }
    
    await GoalsManager.addGoal(goal);
    modal.remove();
    updateGoalsView();
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
