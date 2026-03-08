import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Flame, Trophy, Star, Zap, Target, Award } from "lucide-react";
import { useEngagement } from "@/hooks/useEngagement";

interface EngagementWidgetProps {
  userId: string;
  compact?: boolean;
}

const streakIcons: Record<string, string> = {
  glucose_logging: '🩸',
  medication: '💊',
  exercise: '🏃',
  meal_logging: '🍽️',
};

const streakLabels: Record<string, string> = {
  glucose_logging: 'Glucose',
  medication: 'Meds',
  exercise: 'Exercise',
  meal_logging: 'Meals',
};

export const EngagementWidget = ({ userId, compact = false }: EngagementWidgetProps) => {
  const { streaks, achievements, totalPoints, level, levelProgress, loading } = useEngagement(userId);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-8 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxStreak = streaks.reduce((max, s) => Math.max(max, s.current_streak), 0);

  if (compact) {
    return (
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="text-lg font-bold">{maxStreak}</span>
                <span className="text-xs text-muted-foreground">day streak</span>
              </div>
              <div className="w-px h-6 bg-border" />
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-semibold">{totalPoints} pts</span>
              </div>
              <div className="w-px h-6 bg-border" />
              <div className="flex items-center gap-1">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{achievements.length}</span>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              Lv {level}
            </Badge>
          </div>
          <Progress value={levelProgress} className="h-1.5 mt-2" />
          <p className="text-[10px] text-muted-foreground mt-1">
            {100 - levelProgress} pts to Level {level + 1}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Level & Points Card */}
      <Card className="border-primary/20 overflow-hidden">
        <div className="bg-gradient-primary p-4 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Your Level</p>
              <p className="text-3xl font-bold">Level {level}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <Star className="h-5 w-5" />
                <span className="text-2xl font-bold">{totalPoints}</span>
              </div>
              <p className="text-sm opacity-90">Total Points</p>
            </div>
          </div>
          <div className="mt-3">
            <Progress value={levelProgress} className="h-2 bg-primary-foreground/20" />
            <p className="text-xs mt-1 opacity-80">{100 - levelProgress} pts to Level {level + 1}</p>
          </div>
        </div>
      </Card>

      {/* Streaks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Flame className="h-5 w-5 text-orange-500" />
            Active Streaks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {streaks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Start logging to build your streaks! 🔥
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {streaks.map((streak) => (
                <div
                  key={streak.streak_type}
                  className="p-3 rounded-lg border bg-card hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{streakIcons[streak.streak_type] || '📊'}</span>
                    <span className="text-sm font-medium">{streakLabels[streak.streak_type] || streak.streak_type}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">{streak.current_streak}</span>
                    <span className="text-xs text-muted-foreground">days</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Best: {streak.longest_streak} • Total: {streak.total_days_active}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Achievements ({achievements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {achievements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Complete activities to earn badges! 🏅
            </p>
          ) : (
            <div className="space-y-2">
              {achievements.slice(0, 6).map((ach) => (
                <div
                  key={ach.achievement_type}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Award className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ach.achievement_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{ach.description}</p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    +{ach.points}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
