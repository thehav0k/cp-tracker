/**
 * Analytics Engine - Handles data analysis and insights generation
 */

const AnalyticsEngine = {
  /**
   * Calculate aggregated statistics from all platforms
   */
  calculateAggregatedStats(platformStats) {
    let totalProblems = 0;
    let totalContests = 0;
    let totalRating = 0;
    let ratingCount = 0;
    let platformsActive = 0;

    const categoryMastery = {};

    for (const [platform, stats] of Object.entries(platformStats)) {
      if (!stats) continue;

      platformsActive++;

      // Problems
      if (stats.problems_solved) {
        totalProblems += stats.problems_solved;
      }

      // Contests
      if (stats.contests_participated) {
        totalContests += stats.contests_participated;
      }

      // Rating
      if (stats.rating && stats.rating > 0) {
        totalRating += stats.rating;
        ratingCount++;
      }

      // Category/Tag distribution
      if (stats.tag_distribution) {
        for (const [tag, count] of Object.entries(stats.tag_distribution)) {
          if (!categoryMastery[tag]) {
            categoryMastery[tag] = { solved: 0, platforms: [] };
          }
          categoryMastery[tag].solved += count;
          categoryMastery[tag].platforms.push(platform);
        }
      }
    }

    return {
      total_problems_solved: totalProblems,
      total_contests: totalContests,
      average_rating: ratingCount > 0 ? Math.round(totalRating / ratingCount) : 0,
      platforms_active: platformsActive,
      category_mastery: categoryMastery,
      last_updated: new Date().toISOString()
    };
  },

  /**
   * Compare stats between two time periods
   */
  compareTimeframes(oldStats, newStats) {
    const comparison = {
      problems_solved: {
        old: oldStats.total_problems_solved || 0,
        new: newStats.total_problems_solved || 0,
        change: 0,
        percentage: 0
      },
      rating: {
        old: oldStats.average_rating || 0,
        new: newStats.average_rating || 0,
        change: 0,
        percentage: 0
      },
      contests: {
        old: oldStats.total_contests || 0,
        new: newStats.total_contests || 0,
        change: 0,
        percentage: 0
      }
    };

    // Calculate changes
    for (const [key, value] of Object.entries(comparison)) {
      value.change = value.new - value.old;
      if (value.old > 0) {
        value.percentage = ((value.change / value.old) * 100).toFixed(1);
      }
    }

    return comparison;
  },

  /**
   * Calculate streak from daily logs
   */
  calculateStreak(dailyLogs) {
    if (!dailyLogs || dailyLogs.length === 0) {
      return { current: 0, longest: 0, streaks: [] };
    }

    const sortedLogs = dailyLogs
      .filter(log => log.problems_solved > 0)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (sortedLogs.length === 0) {
      return { current: 0, longest: 0, streaks: [] };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let currentStreak = 0;
    let longestStreak = 0;
    let allStreaks = [];
    let tempStreak = { count: 1, start: sortedLogs[0].date, end: sortedLogs[0].date };

    for (let i = 1; i < sortedLogs.length; i++) {
      const prevDate = new Date(sortedLogs[i - 1].date);
      const currDate = new Date(sortedLogs[i].date);
      prevDate.setHours(0, 0, 0, 0);
      currDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        tempStreak.count++;
        tempStreak.end = sortedLogs[i].date;
      } else {
        if (tempStreak.count > 0) {
          allStreaks.push({ ...tempStreak });
        }
        tempStreak = { count: 1, start: sortedLogs[i].date, end: sortedLogs[i].date };
      }
    }
    
    // Add last streak
    if (tempStreak.count > 0) {
      allStreaks.push({ ...tempStreak });
    }

    // Find longest streak
    longestStreak = allStreaks.reduce((max, s) => Math.max(max, s.count), 0);

    // Calculate current streak (check if most recent activity is today or yesterday)
    if (allStreaks.length > 0) {
      const lastStreak = allStreaks[allStreaks.length - 1];
      const lastDate = new Date(lastStreak.end);
      lastDate.setHours(0, 0, 0, 0);
      const daysSinceLastActivity = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastActivity <= 1) {
        currentStreak = lastStreak.count;
      }
    }

    return { 
      current: currentStreak, 
      longest: longestStreak,
      streaks: allStreaks.sort((a, b) => b.count - a.count).slice(0, 5)
    };
  },

  /**
   * Generate insights from data
   */
  generateInsights(platformStats, dailyLogs, ratingHistory) {
    const insights = [];

    // Analyze problem-solving patterns
    if (dailyLogs && dailyLogs.length > 0) {
      const recentLogs = dailyLogs.slice(0, 30);
      const weekdayStats = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      
      recentLogs.forEach(log => {
        const day = new Date(log.date).getDay();
        weekdayStats[day] += log.problems_solved || 0;
      });

      const maxDay = Object.keys(weekdayStats).reduce((a, b) => 
        weekdayStats[a] > weekdayStats[b] ? a : b
      );
      
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      insights.push({
        type: 'pattern',
        message: `You solve most problems on ${dayNames[maxDay]}`,
        icon: '📊'
      });
    }

    // Analyze rating trends
    if (ratingHistory && ratingHistory.length > 5) {
      const recent = ratingHistory.slice(-5);
      const ratingChanges = recent.map((entry, i) => {
        if (i === 0) return 0;
        const platforms = Object.keys(entry).filter(k => k !== 'date');
        return platforms.reduce((sum, p) => sum + (entry[p] - recent[i-1][p] || 0), 0);
      });

      const avgChange = ratingChanges.reduce((a, b) => a + b, 0) / ratingChanges.length;
      
      if (avgChange > 20) {
        insights.push({
          type: 'achievement',
          message: 'Great progress! Your rating is trending upward',
          icon: '🚀'
        });
      } else if (avgChange < -20) {
        insights.push({
          type: 'warning',
          message: 'Focus on practice to recover your rating',
          icon: '⚠️'
        });
      }
    }

    // Identify weak areas
    const aggregated = this.calculateAggregatedStats(platformStats);
    if (aggregated.category_mastery) {
      const categories = Object.entries(aggregated.category_mastery)
        .sort((a, b) => a[1].solved - b[1].solved)
        .slice(0, 2);

      if (categories.length > 0) {
        insights.push({
          type: 'recommendation',
          message: `Practice more ${categories[0][0]} problems (only ${categories[0][1].solved} solved)`,
          icon: '🎯'
        });
      }
    }

    return insights;
  },

  /**
   * Get statistics for a specific time period
   */
  getTimeframeStats(dailyLogs, ratingHistory, days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const filteredLogs = dailyLogs.filter(log => new Date(log.date) >= cutoffDate);
    
    const stats = {
      problems_solved: filteredLogs.reduce((sum, log) => sum + (log.problems_solved || 0), 0),
      active_days: filteredLogs.length,
      platforms_used: new Set(filteredLogs.flatMap(log => log.platforms_used || [])).size
    };

    // Rating change in period
    if (ratingHistory && ratingHistory.length > 0) {
      const filteredRatings = ratingHistory.filter(entry => new Date(entry.date) >= cutoffDate);
      
      if (filteredRatings.length > 1) {
        const first = filteredRatings[0];
        const last = filteredRatings[filteredRatings.length - 1];
        
        stats.rating_change = {};
        const platforms = Object.keys(last).filter(k => k !== 'date');
        
        platforms.forEach(platform => {
          if (first[platform] && last[platform]) {
            stats.rating_change[platform] = last[platform] - first[platform];
          }
        });
      }
    }

    return stats;
  },

  /**
   * Generate recommendations based on user data
   */
  generateRecommendations(platformStats, aggregatedStats) {
    const recommendations = [];

    // Check for weak categories
    if (aggregatedStats.category_mastery) {
      const sortedCategories = Object.entries(aggregatedStats.category_mastery)
        .sort((a, b) => a[1].solved - b[1].solved);

      if (sortedCategories.length > 0) {
        const weakest = sortedCategories[0];
        recommendations.push({
          type: 'weakness_fix',
          priority: 'high',
          category: weakest[0],
          message: `Improve ${weakest[0]}: Only ${weakest[1].solved} problems solved`,
          action: `Solve 5 ${weakest[0]} problems this week`
        });
      }
    }

    // Check for inactive platforms
    const inactivePlatforms = Object.entries(platformStats)
      .filter(([platform, stats]) => !stats || stats.problems_solved === 0)
      .map(([platform]) => platform);

    if (inactivePlatforms.length > 0 && inactivePlatforms.length < 5) {
      recommendations.push({
        type: 'explore',
        priority: 'medium',
        message: `Try ${inactivePlatforms[0]} - expand your practice`,
        action: 'Solve your first problem'
      });
    }

    // Check for rating plateau
    // (Would need rating history analysis)

    return recommendations;
  }
};

export default AnalyticsEngine;
