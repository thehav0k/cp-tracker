/**
 * Goals and Achievements System
 */

export const GoalsManager = {
  
  /**
   * Default goal templates
   */
  defaultGoals: {
    weekly_problems: { type: 'weekly', target: 10, description: 'Solve 10 problems this week' },
    monthly_problems: { type: 'monthly', target: 50, description: 'Solve 50 problems this month' },
    rating_increase: { type: 'rating', platform: 'codeforces', target: 100, description: 'Increase rating by 100' },
    streak_days: { type: 'streak', target: 7, description: 'Maintain 7-day streak' },
    contest_participation: { type: 'contest', target: 4, description: 'Participate in 4 contests' }
  },

  /**
   * Achievement definitions
   */
  achievements: [
    { id: 'first_solve', name: 'First Blood', description: 'Solved your first problem', icon: '🎯', threshold: 1 },
    { id: 'solve_10', name: 'Getting Started', description: 'Solved 10 problems', icon: '⭐', threshold: 10 },
    { id: 'solve_50', name: 'Problem Solver', description: 'Solved 50 problems', icon: '🌟', threshold: 50 },
    { id: 'solve_100', name: 'Century', description: 'Solved 100 problems', icon: '💯', threshold: 100 },
    { id: 'solve_500', name: 'Expert Solver', description: 'Solved 500 problems', icon: '🏆', threshold: 500 },
    { id: 'solve_1000', name: 'Legendary', description: 'Solved 1000 problems', icon: '👑', threshold: 1000 },
    { id: 'week_streak', name: 'Week Warrior', description: '7-day solving streak', icon: '🔥', threshold: 7, type: 'streak' },
    { id: 'month_streak', name: 'Month Master', description: '30-day solving streak', icon: '🌟', threshold: 30, type: 'streak' },
    { id: 'cf_expert', name: 'Codeforces Expert', description: 'Reached Expert on Codeforces', icon: '💜', threshold: 1600, platform: 'codeforces' },
    { id: 'cf_master', name: 'Codeforces Master', description: 'Reached Master on Codeforces', icon: '🧡', threshold: 2100, platform: 'codeforces' },
    { id: 'multi_platform', name: 'Platform Hopper', description: 'Active on 3+ platforms', icon: '🌐', threshold: 3, type: 'platforms' },
    { id: 'night_owl', name: 'Night Owl', description: 'Solved problems after midnight', icon: '🦉', threshold: 10, type: 'time' },
    { id: 'speed_runner', name: 'Speed Runner', description: 'Solved 5 problems in 1 day', icon: '⚡', threshold: 5, type: 'daily' }
  ],

  /**
   * Get all user goals
   */
  async getGoals() {
    const result = await chrome.storage.sync.get(['goals']);
    return result.goals || [];
  },

  /**
   * Add a new goal
   */
  async addGoal(goal) {
    const goals = await this.getGoals();
    const newGoal = {
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      progress: 0,
      completed: false,
      ...goal
    };
    goals.push(newGoal);
    await chrome.storage.sync.set({ goals });
    return newGoal;
  },

  /**
   * Update goal progress
   */
  async updateGoalProgress(goalId, progress) {
    const goals = await this.getGoals();
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      goal.progress = progress;
      goal.completed = progress >= goal.target;
      if (goal.completed && !goal.completed_at) {
        goal.completed_at = new Date().toISOString();
      }
      await chrome.storage.sync.set({ goals });
    }
  },

  /**
   * Delete a goal
   */
  async deleteGoal(goalId) {
    const goals = await this.getGoals();
    const filtered = goals.filter(g => g.id !== goalId);
    await chrome.storage.sync.set({ goals: filtered });
  },

  /**
   * Check and award achievements
   */
  async checkAchievements(stats) {
    const result = await chrome.storage.local.get(['achievements']);
    const earned = result.achievements || [];
    const newAchievements = [];

    for (const achievement of this.achievements) {
      // Skip if already earned
      if (earned.some(a => a.id === achievement.id)) {
        continue;
      }

      let shouldAward = false;

      switch (achievement.type) {
        case 'streak':
          shouldAward = stats.current_streak >= achievement.threshold;
          break;
        case 'platforms':
          const activePlatforms = Object.values(stats.platforms || {}).filter(p => p.problems_solved > 0).length;
          shouldAward = activePlatforms >= achievement.threshold;
          break;
        case 'daily':
          // Check today's solve count
          const today = new Date().toISOString().split('T')[0];
          const todayStats = stats.daily_logs?.[today];
          shouldAward = todayStats && todayStats.problems_solved >= achievement.threshold;
          break;
        default:
          if (achievement.platform) {
            // Platform-specific achievement
            const platformStats = stats.platforms?.[achievement.platform];
            shouldAward = platformStats && platformStats.rating >= achievement.threshold;
          } else {
            // Total problems solved
            shouldAward = stats.total_problems_solved >= achievement.threshold;
          }
      }

      if (shouldAward) {
        const awardedAchievement = {
          ...achievement,
          earned_at: new Date().toISOString()
        };
        earned.push(awardedAchievement);
        newAchievements.push(awardedAchievement);
      }
    }

    if (newAchievements.length > 0) {
      await chrome.storage.local.set({ achievements: earned });
    }

    return newAchievements;
  },

  /**
   * Get all earned achievements
   */
  async getAchievements() {
    const result = await chrome.storage.local.get(['achievements']);
    return result.achievements || [];
  },

  /**
   * Calculate goal progress based on current stats
   */
  async calculateGoalProgress(stats) {
    const goals = await this.getGoals();
    const now = new Date();
    
    for (const goal of goals) {
      if (goal.completed) continue;

      let progress = 0;
      
      switch (goal.type) {
        case 'weekly':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          weekStart.setHours(0, 0, 0, 0);
          progress = this.countSolvedSince(stats, weekStart);
          break;
          
        case 'monthly':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          progress = this.countSolvedSince(stats, monthStart);
          break;
          
        case 'rating':
          const platform = stats.platforms?.[goal.platform];
          if (platform) {
            const initialRating = goal.initial_rating || platform.rating;
            progress = platform.rating - initialRating;
          }
          break;
          
        case 'streak':
          progress = stats.current_streak || 0;
          break;
          
        case 'contest':
          progress = stats.contests_this_month || 0;
          break;
      }

      await this.updateGoalProgress(goal.id, progress);
    }
  },

  /**
   * Count problems solved since a date
   */
  countSolvedSince(stats, sinceDate) {
    let count = 0;
    const dailyLogs = stats.daily_logs || {};
    
    for (const [date, log] of Object.entries(dailyLogs)) {
      if (new Date(date) >= sinceDate) {
        count += log.problems_solved || 0;
      }
    }
    
    return count;
  }
};
