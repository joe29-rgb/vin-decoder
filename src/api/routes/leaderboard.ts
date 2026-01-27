import { Router, Request, Response } from 'express';
import { getSupabase } from '../../modules/supabase';

const router = Router();

interface LeaderboardEntry {
  userId: string;
  userName: string;
  dealsClosed: number;
  totalGross: number;
  avgGross: number;
  streak: number;
  achievements: string[];
  rank: number;
  points: number;
}

/**
 * GET /api/leaderboard/stats
 * Returns leaderboard statistics for the dealership
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const dealershipId = req.dealershipId;
    
    if (!dealershipId) {
      return res.status(401).json({
        success: false,
        error: 'Dealership context required'
      });
    }

    const sb = getSupabase();
    if (!sb) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    // Get deals from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: deals, error } = await sb
      .from('deals')
      .select('*')
      .eq('dealership_id', dealershipId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (error) {
      console.error('Failed to fetch deals:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch leaderboard data'
      });
    }

    // Group by user and calculate stats
    const userStats = new Map<string, any>();
    
    for (const deal of deals || []) {
      const userId = deal.created_by || 'unknown';
      const userName = deal.salesperson_name || 'Unknown';
      
      if (!userStats.has(userId)) {
        userStats.set(userId, {
          userId,
          userName,
          dealsClosed: 0,
          totalGross: 0,
          deals: []
        });
      }
      
      const stats = userStats.get(userId);
      stats.dealsClosed++;
      stats.totalGross += (deal.total_gross || 0);
      stats.deals.push(deal);
    }

    // Calculate leaderboard entries
    const leaderboard: LeaderboardEntry[] = [];
    
    for (const [userId, stats] of userStats) {
      const avgGross = stats.dealsClosed > 0 ? stats.totalGross / stats.dealsClosed : 0;
      
      // Calculate streak (consecutive days with deals)
      const dealDates = stats.deals
        .map((d: any) => new Date(d.created_at).toDateString())
        .sort();
      const uniqueDates = [...new Set(dealDates)];
      let streak = 0;
      let currentDate = new Date();
      
      for (let i = 0; i < 30; i++) {
        const dateStr = currentDate.toDateString();
        if (uniqueDates.includes(dateStr)) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }

      // Calculate achievements
      const achievements: string[] = [];
      if (stats.dealsClosed >= 10) achievements.push('10_deals');
      if (stats.dealsClosed >= 25) achievements.push('25_deals');
      if (stats.totalGross >= 50000) achievements.push('50k_gross');
      if (avgGross >= 4000) achievements.push('high_avg');
      if (streak >= 5) achievements.push('5_day_streak');

      // Calculate points
      const points = (stats.dealsClosed * 100) + (stats.totalGross / 10) + (streak * 50);

      leaderboard.push({
        userId,
        userName: stats.userName,
        dealsClosed: stats.dealsClosed,
        totalGross: stats.totalGross,
        avgGross,
        streak,
        achievements,
        rank: 0, // Will be set after sorting
        points
      });
    }

    // Sort by points and assign ranks
    leaderboard.sort((a, b) => b.points - a.points);
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    res.json({
      success: true,
      leaderboard,
      period: '30_days',
      totalUsers: leaderboard.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/leaderboard/achievements
 * Returns available achievements and their criteria
 */
router.get('/achievements', async (req: Request, res: Response) => {
  try {
    const achievements = [
      {
        id: '10_deals',
        name: '10 Deals Club',
        description: 'Close 10 deals in 30 days',
        icon: '🎯',
        points: 1000
      },
      {
        id: '25_deals',
        name: '25 Deals Master',
        description: 'Close 25 deals in 30 days',
        icon: '🏆',
        points: 2500
      },
      {
        id: '50k_gross',
        name: '$50K Gross',
        description: 'Generate $50,000 in gross profit',
        icon: '💰',
        points: 5000
      },
      {
        id: 'high_avg',
        name: 'High Roller',
        description: 'Maintain $4,000+ average gross',
        icon: '⭐',
        points: 3000
      },
      {
        id: '5_day_streak',
        name: '5 Day Streak',
        description: 'Close deals 5 days in a row',
        icon: '🔥',
        points: 500
      }
    ];

    res.json({
      success: true,
      achievements
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
