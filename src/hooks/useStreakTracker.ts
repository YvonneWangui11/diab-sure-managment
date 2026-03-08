import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight hook to update engagement streaks when health data is logged.
 * Call trackActivity('glucose_logging') after a successful glucose insert, etc.
 */
export const useStreakTracker = () => {
  const trackActivity = useCallback(async (streakType: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const userId = user.id;

      // Upsert streak
      const { data: existing } = await supabase
        .from('engagement_streaks')
        .select('*')
        .eq('user_id', userId)
        .eq('streak_type', streakType)
        .maybeSingle();

      if (existing) {
        if (existing.last_activity_date === today) return; // Already tracked today

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const newStreak = existing.last_activity_date === yesterdayStr
          ? existing.current_streak + 1
          : 1;

        await supabase
          .from('engagement_streaks')
          .update({
            current_streak: newStreak,
            longest_streak: Math.max(existing.longest_streak, newStreak),
            last_activity_date: today,
            total_days_active: existing.total_days_active + 1,
          })
          .eq('id', existing.id);
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
      await supabase.from('engagement_points').insert({
        user_id: userId,
        points: 5,
        reason: `Daily ${streakType.replace('_', ' ')}`,
        source_type: streakType,
      });
    } catch (e) {
      console.error('Streak tracking error:', e);
    }
  }, []);

  return { trackActivity };
};
