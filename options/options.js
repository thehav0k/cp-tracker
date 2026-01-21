/**
 * Options Page Script
 * Handles settings configuration and username management
 */

import StorageManager from '../utils/storage.js';
import PlatformAPI from '../utils/api.js';

// DOM Elements - will be initialized in init()
let usernameInputs = {};
let settingInputs = {};
let buttons = {};
let saveStatus;
let loadStatus;

/**
 * Initialize DOM references
 */
function initDOMReferences() {
  usernameInputs = {
    codeforces: document.getElementById('username-codeforces'),
    leetcode: document.getElementById('username-leetcode'),
    atcoder: document.getElementById('username-atcoder'),
    codechef: document.getElementById('username-codechef'),
    hackerrank: document.getElementById('username-hackerrank'),
    cses: document.getElementById('username-cses'),
    spoj: document.getElementById('username-spoj'),
    topcoder: document.getElementById('username-topcoder'),
    uva: document.getElementById('username-uva'),
    geeksforgeeks: document.getElementById('username-geeksforgeeks')
  };

  settingInputs = {
    syncFrequency: document.getElementById('sync-frequency'),
    theme: document.getElementById('theme'),
    notifications: document.getElementById('notifications'),
    defaultView: document.getElementById('default-view')
  };

  buttons = {
    save: document.getElementById('saveBtn'),
    validate: document.getElementById('validateBtn'),
    export: document.getElementById('exportBtn'),
    clear: document.getElementById('clearBtn')
  };

  saveStatus = document.getElementById('saveStatus');
  loadStatus = document.getElementById('loadStatus');
  
  console.log('DOM references initialized:', {
    usernameInputs: Object.keys(usernameInputs).filter(k => usernameInputs[k]),
    buttons: Object.keys(buttons).filter(k => buttons[k])
  });
}

/**
 * Initialize options page
 */
async function init() {
  try {
    console.log('Initializing options page...');
    
    // First, initialize DOM references
    initDOMReferences();
    
    showLoadStatus('Loading settings...', false);
    await loadSettings();
    setupEventListeners();
    showLoadStatus('✓ Settings loaded successfully', false);
    setTimeout(() => showLoadStatus('', false), 2000);
    console.log('Options page initialized successfully');
  } catch (error) {
    console.error('Failed to initialize options page:', error);
    showLoadStatus('✗ Failed to load settings: ' + error.message, true);
    showSaveStatus('Failed to load settings', true);
  }
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    // Ensure storage is initialized
    await StorageManager.init();
    const config = await StorageManager.getConfig();
    
    console.log('Loaded config:', config);
    
    if (config) {
      // Load usernames
      for (const [platform, input] of Object.entries(usernameInputs)) {
        if (input) {
          const username = config.usernames && config.usernames[platform] ? config.usernames[platform] : '';
          input.value = username;
          console.log(`Set ${platform} input to:`, username);
        } else {
          console.warn(`Input element not found for ${platform}`);
        }
      }
      
      // Load settings
      if (settingInputs.syncFrequency) {
        settingInputs.syncFrequency.value = config.settings.auto_sync_frequency || '6h';
      }
      
      if (settingInputs.theme) {
        settingInputs.theme.value = config.settings.theme || 'dark';
        applyTheme(config.settings.theme || 'dark');
      }
      
      if (settingInputs.notifications) {
        settingInputs.notifications.checked = config.settings.notifications_enabled !== false;
      }
      
      if (settingInputs.defaultView) {
        settingInputs.defaultView.value = config.settings.default_view || 'dashboard';
      }
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Save button
  buttons.save?.addEventListener('click', saveSettings);
  
  // Validate button
  buttons.validate?.addEventListener('click', validateAllUsernames);
  
  // Export button
  buttons.export?.addEventListener('click', exportData);
  
  // Clear button
  buttons.clear?.addEventListener('click', clearAllData);
  
  // Theme change
  settingInputs.theme?.addEventListener('change', (e) => {
    applyTheme(e.target.value);
  });
  
  // Auto-save on input change (debounced)
  let saveTimeout;
  Object.values(usernameInputs).forEach(input => {
    input?.addEventListener('input', () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(saveSettings, 2000);
    });
  });
}

/**
 * Save settings
 */
async function saveSettings() {
  try {
    console.log('Saving settings...');
    buttons.save?.setAttribute('disabled', 'true');
    buttons.save?.classList.add('loading');
    showSaveStatus('Saving...', false);
    
    // Collect usernames
    const usernames = {};
    for (const [platform, input] of Object.entries(usernameInputs)) {
      if (input) {
        usernames[platform] = input.value.trim();
      }
    }
    
    console.log('Usernames to save:', usernames);
    
    // Collect settings
    const settings = {
      auto_sync_frequency: settingInputs.syncFrequency?.value || '6h',
      theme: settingInputs.theme?.value || 'dark',
      notifications_enabled: settingInputs.notifications?.checked !== false,
      default_view: settingInputs.defaultView?.value || 'dashboard',
      comparison_timeframes: ['7d', '30d', '90d', 'all']
    };
    
    console.log('Settings to save:', settings);
    
    // Save to storage
    const configToSave = {
      usernames,
      settings
    };
    
    await StorageManager.setConfig(configToSave);
    console.log('Settings saved successfully');
    
    // Verify save
    const savedConfig = await StorageManager.getConfig();
    console.log('Verified saved config:', savedConfig);
    
    // Update sync frequency in background
    chrome.runtime.sendMessage({
      type: 'UPDATE_SYNC_FREQUENCY',
      frequency: settings.auto_sync_frequency
    });
    
    showSaveStatus('✓ Settings saved!', false);
    
    setTimeout(() => {
      showSaveStatus('', false);
    }, 3000);
    
  } catch (error) {
    console.error('Error saving settings:', error);
    showSaveStatus('✗ Error saving settings', true);
  } finally {
    buttons.save?.removeAttribute('disabled');
    buttons.save?.classList.remove('loading');
  }
}

/**
 * Validate all usernames
 */
async function validateAllUsernames() {
  try {
    buttons.validate?.setAttribute('disabled', 'true');
    buttons.validate?.classList.add('loading');
    
    let validCount = 0;
    let invalidCount = 0;
    
    for (const [platform, input] of Object.entries(usernameInputs)) {
      if (!input || !input.value.trim()) continue;
      
      const username = input.value.trim();
      const validationIcon = input.parentElement.querySelector('.validation-icon');
      
      try {
        // Try to fetch user data
        await PlatformAPI.fetchPlatformData(platform, username);
        
        // Valid
        if (validationIcon) {
          validationIcon.className = 'validation-icon valid';
        }
        validCount++;
        
      } catch (error) {
        // Invalid
        if (validationIcon) {
          validationIcon.className = 'validation-icon invalid';
        }
        invalidCount++;
      }
    }
    
    alert(`Validation complete!\n✓ Valid: ${validCount}\n✗ Invalid: ${invalidCount}`);
    
  } catch (error) {
    console.error('Error validating usernames:', error);
    alert('Error during validation. Check console for details.');
  } finally {
    buttons.validate?.removeAttribute('disabled');
    buttons.validate?.classList.remove('loading');
  }
}

/**
 * Export data as JSON
 */
async function exportData() {
  try {
    // Get all data
    const config = await StorageManager.getConfig();
    const platformStats = await StorageManager.getAllPlatformStats();
    const aggregatedStats = await StorageManager.getAggregatedStats();
    const dailyLogs = await StorageManager.getDailyLogs();
    const ratingHistory = await StorageManager.getRatingHistory();
    
    const exportData = {
      config,
      platform_stats: platformStats,
      aggregated_stats: aggregatedStats,
      daily_logs: dailyLogs,
      rating_history: ratingHistory,
      exported_at: new Date().toISOString()
    };
    
    // Create download
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `cp-progress-tracker-export-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Error exporting data:', error);
    alert('Error exporting data. Check console for details.');
  }
}

/**
 * Clear all data
 */
async function clearAllData() {
  const confirmed = confirm(
    '⚠️ WARNING: This will delete ALL your data!\n\n' +
    'This includes:\n' +
    '- All platform statistics\n' +
    '- Daily logs and history\n' +
    '- Rating history\n' +
    '- All settings (usernames will be kept)\n\n' +
    'This action cannot be undone. Continue?'
  );
  
  if (!confirmed) return;
  
  const doubleConfirm = confirm('Are you ABSOLUTELY sure? This cannot be undone!');
  
  if (!doubleConfirm) return;
  
  try {
    // Save usernames and settings before clearing
    const config = await StorageManager.getConfig();
    
    // Clear all data
    await StorageManager.clearAll();
    
    // Restore config
    if (config) {
      await StorageManager.setConfig(config);
    }
    
    alert('✓ All data has been cleared (except usernames and settings)');
    
  } catch (error) {
    console.error('Error clearing data:', error);
    alert('Error clearing data. Check console for details.');
  }
}

/**
 * Apply theme
 */
function applyTheme(theme) {
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.dataset.theme = prefersDark ? 'dark' : 'light';
  } else {
    document.body.dataset.theme = theme;
  }
}

/**
 * Show save status
 */
function showSaveStatus(message, isError) {
  if (saveStatus) {
    saveStatus.textContent = message;
    saveStatus.className = isError ? 'save-status error' : 'save-status';
  }
}

/**
 * Show load status
 */
function showLoadStatus(message, isError) {
  if (loadStatus) {
    loadStatus.textContent = message;
    loadStatus.style.background = isError ? '#ffebee' : '#e8f5e9';
    loadStatus.style.color = isError ? '#c62828' : '#2e7d32';
    loadStatus.style.display = message ? 'block' : 'none';
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
