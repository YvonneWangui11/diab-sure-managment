import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Streak {
  streak_type: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  total_days_active: number;
}

interface Achievement {
  achievement_type: string;
  achievement_name: string;
  description: string | null;
  icon: string;
  points: number;
  earned_at: string;
}

interface EngagementData {
  streaks: Streak[];
  achievements: Achievement[];
  totalPoints: number;
  level: number;
  levelProgress: number;
}

const ACHIEVEMENT_DEFINITIONS = [
  { type: 'first_glucose', name: 'First Step', desc: 'Logged your first glucose reading', icon: 'droplet', points: 10, check: (s: Streak[]) => s.find(x => x.streak_type === 'glucose_logging')?.total_days_active ?? 0 >= 1 },
  { type: 'first_meal', name: 'Meal Tracker', desc: 'Logged your first meal', icon: 'apple', points: 10, check: (s: Streak[]) => s.find(x => x.streak_type === 'meal_logging')?.total_days_active ?? 0 >= 1 },
  { type: 'first_exercise', name: 'Active Start', desc: 'Logged your first exercise', icon: 'dumbbell', points: 10, check: (s: Streak[]) => s.find(x => x.streak_type === 'exercise')?.total_days_active ?? 0 >= 1 },
  { type: 'streak_3', name: 'Consistency', desc: '3-day logging streak', icon: 'flame', points: 25 },
  { type: 'streak_7', name: 'Week Warrior', desc: '7-day logging streak', icon: 'flame', points: 50 },
  { type: 'streak_14', name: 'Two Week Strong', desc: '14-day logging streak', icon: 'flame', points: 100 },
  { type: 'streak_30', name: 'Monthly Champion', desc: '30-day logging streak', icon: 'trophy', points: 200 },
  { type: 'points_100', name: 'Century Club', desc: 'Earned 100 points', icon: 'star', points: 25 },
  { type: 'points_500', name: 'Health Hero', desc: 'Earned 500 points', icon: 'star', points: 50 },
  { type: 'med_adherence_7', name: 'Med Master', desc: '7 days of medication adherence', icon: 'pill', points: 75 },
];

const POINTS_PER_LEVEL = 100;

export const useEngagement = (userId: string | undefined) => {
  const [data, setData] = useState<EngagementData>({
    streaks: [],
    achievements: [],
    totalPoints: 0,
    level: 1,
    levelProgress: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadEngagement = useCallback(async () => {
    if (!userId) return;
    try {
      const [streaksRes, achievementsRes, pointsRes] = await Promise.all([
        supabase.from('engagement_streaks').select('*').eq('user_id', userId),
        supabase.from('achievements').select('*').eq('user_id', userId).order('earned_at', { ascending: false }),
        supabase.from('engagement_points').select('points').eq('user_id', userId),
      ]);

      const streaks = (streaksRes.data || []) as Streak[];
      const achievements = (achievementsRes.data || []) as Achievement[];
      const totalPoints = (pointsRes.data || []).reduce((sum, p) => sum + p.points, 0);
      const level = Math.floor(totalPoints / POINTS_PER_LEVEL) + 1;
      const levelProgress = (totalPoints % POINTS_PER_LEVEL);

      setData({ streaks, achievements, totalPoints, level, levelProgress });
    } catch (e) {
      console.error('Engagement load error:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updateStreak = useCallback(async (streakType: string) => {
    if (!userId) return;
    const today = new Date().toISOString().split('T')[0];

    // Get current streak
    const { data: existing } = await supabase
      .from('engagement_streaks')
      .select('*')
      .eq('user_id', userId)
      .eq('streak_type', streakType)
      .maybeSingle();

    if (existing) {
      if (existing.last_activity_date === today) return; // Already logged today

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const newStreak = existing.last_activity_date === yesterdayStr
        ? existing.current_streak + 1
        : 1;

      const longestStreak = Math.max(existing.longest_streak, newStreak);

      await supabase
        .from('engagement_streaks')
        .update({
          current_streak: newStreak,
          longest_streak: longestStreak,
          last_activity_date: today,
          total_days_active: existing.total_days_active + 1,
        })
        .eq('id', existing.id);

      // Check streak achievements
      await checkStreakAchievements(newStreak, streakType);
    } else {
      await supabase
        .from('engagement_streaks')
        .insert({
          user_id: userId,
          streak_type: streakType,
          current_streak: 1,
          longest_streak: 1,
          last_activity_date: today,
          total_days_active: 1,
        });
    }

    // Award points
    await awardPoints(5, `Daily ${streakType} log`, streakType);
    await loadEngagement();
  }, [userId, loadEngagement]);

  const awardPoints = useCallback(async (points: number, reason: string, sourceType?: string) => {
    if (!userId) return;
    await supabase.from('engagement_points').insert({
      user_id: userId,
      points,
      reason,
      source_type: sourceType,
    });
  }, [userId]);

  const checkStreakAchievements = useCallback(async (streak: number, streakType: string) => {
    if (!userId) return;
    const milestones = [
      { threshold: 3, type: 'streak_3', name: 'Consistency', desc: '3-day logging streak' },
      { threshold: 7, type: 'streak_7', name: 'Week Warrior', desc: '7-day logging streak' },
      { threshold: 14, type: 'streak_14', name: 'Two Week Strong', desc: '14-day logging streak' },
      { threshold: 30, type: 'streak_30', name: 'Monthly Champion', desc: '30-day logging streak' },
    ];

    for (const m of milestones) {
      if (streak >= m.threshold) {
        const achievementType = `${m.type}_${streakType}`;
        const { data: existing } = await supabase
          .from('achievements')
          .select('id')
          .eq('user_id', userId)
          .eq('achievement_type', achievementType)
          .maybeSingle();

        if (!existing) {
          await supabase.from('achievements').insert({
            user_id: userId,
            achievement_type: achievementType,
            achievement_name: m.name,
            description: `${m.desc} (${streakType.replace('_', ' ')})`,
            icon: 'flame',
            points: m.threshold * 5,
          });
          await awardPoints(m.threshold * 5, `Achievement: ${m.name}`, 'streak_bonus');
          toast({
            title: `🏆 Achievement Unlocked!`,
            description: `${m.name} — ${m.desc}`,
          });
        }
      }
    }
  }, [userId, awardPoints, toast]);

  useEffect(() => {
    loadEngagement();
  }, [loadEngagement]);

  return {
    ...data,
    loading,
    updateStreak,
    awardPoints,
    reload: loadEngagement,
    achievementDefinitions: ACHIEVEMENT_DEFINITIONS,
  };
};
