
-- Engagement streaks table
CREATE TABLE public.engagement_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  streak_type text NOT NULL, -- 'glucose_logging', 'medication', 'exercise', 'meal_logging', 'daily_checkin'
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_activity_date date,
  total_days_active integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, streak_type)
);

-- Achievements/badges table
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_type text NOT NULL, -- 'first_glucose', 'streak_7', 'streak_30', 'meal_master', etc.
  achievement_name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'trophy',
  points integer NOT NULL DEFAULT 10,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_type)
);

-- Points ledger
CREATE TABLE public.engagement_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  points integer NOT NULL,
  reason text NOT NULL,
  source_type text, -- 'glucose', 'meal', 'exercise', 'medication', 'streak_bonus'
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.engagement_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_points ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage own streaks" ON public.engagement_streaks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own achievements" ON public.achievements FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own points" ON public.engagement_points FOR ALL USING (auth.uid() = user_id);

-- Updated_at trigger for streaks
CREATE TRIGGER update_engagement_streaks_updated_at
  BEFORE UPDATE ON public.engagement_streaks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
