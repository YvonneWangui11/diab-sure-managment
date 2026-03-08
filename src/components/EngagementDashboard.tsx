import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, Trophy, Star, Award, TrendingUp, Target, Zap, Crown } from "lucide-react";
import { useEngagement } from "@/hooks/useEngagement";

interface EngagementDashboardProps {
  userId: string;
}

const streakLabels: Record<string, string> = {
  glucose_logging: 'Glucose Logging',
  medication: 'Medication',
  exercise: 'Exercise',
  meal_logging: 'Meal Logging',
};

const streakEmojis: Record<string, string> = {
  glucose_logging: '🩸',
  medication: '💊',
  exercise: '🏃',
  meal_logging: '🍽️',
};

// All possible achievements with lock status
const ALL_ACHIEVEMENTS = [
  { type: 'first_glucose', name: 'First Step', desc: 'Log your first glucose reading', icon: '🩸', points: 10 },
  { type: 'first_meal', name: 'Meal Tracker', desc: 'Log your first meal', icon: '🍽️', points: 10 },
  { type: 'first_exercise', name: 'Active Start', desc: 'Log your first exercise', icon: '🏃', points: 10 },
  { type: 'streak_3', name: 'Consistency', desc: '3-day logging streak', icon: '🔥', points: 15 },
  { type: 'streak_7', name: 'Week Warrior', desc: '7-day logging streak', icon: '🔥', points: 35 },
  { type: 'streak_14', name: 'Two Week Strong', desc: '14-day streak', icon: '🔥', points: 70 },
  { type: 'streak_30', name: 'Monthly Champion', desc: '30-day streak', icon: '🏆', points: 150 },
  { type: 'points_100', name: 'Century Club', desc: 'Earn 100 points', icon: '⭐', points: 25 },
  { type: 'points_500', name: 'Health Hero', desc: 'Earn 500 points', icon: '🌟', points: 50 },
  { type: 'med_adherence_7', name: 'Med Master', desc: '7 days medication adherence', icon: '💊', points: 75 },
];

export const EngagementDashboard = ({ userId }: EngagementDashboardProps) => {
  const { streaks, achievements, totalPoints, level, levelProgress, loading } = useEngagement(userId);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  const earnedTypes = new Set(achievements.map(a => a.achievement_type));
  const maxStreak = streaks.reduce((max, s) => Math.max(max, s.current_streak), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Your Progress</h1>
        <p className="text-muted-foreground">Track your health engagement journey</p>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-primary/20">
          <CardContent className="p-4 text-center">
            <Crown className="h-6 w-6 text-primary mx-auto mb-1" />
            <p className="text-3xl font-bold">{level}</p>
            <p className="text-xs text-muted-foreground">Level</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Star className="h-6 w-6 text-yellow-500 mx-auto mb-1" />
            <p className="text-3xl font-bold">{totalPoints}</p>
            <p className="text-xs text-muted-foreground">Points</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Flame className="h-6 w-6 text-orange-500 mx-auto mb-1" />
            <p className="text-3xl font-bold">{maxStreak}</p>
            <p className="text-xs text-muted-foreground">Best Streak</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-6 w-6 text-primary mx-auto mb-1" />
            <p className="text-3xl font-bold">{achievements.length}</p>
            <p className="text-xs text-muted-foreground">Badges</p>
          </CardContent>
        </Card>
      </div>

      {/* Level Progress */}
      <Card className="border-primary/20 overflow-hidden">
        <div className="bg-gradient-primary p-5 text-primary-foreground">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm opacity-90">Level {level}</p>
              <p className="text-2xl font-bold">Health Champion</p>
            </div>
            <div className="h-14 w-14 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <span className="text-2xl font-bold">{level}</span>
            </div>
          </div>
          <Progress value={levelProgress} className="h-2.5 bg-primary-foreground/20" />
          <p className="text-xs mt-2 opacity-80">{levelProgress}/100 XP • {100 - levelProgress} to next level</p>
        </div>
      </Card>

      <Tabs defaultValue="streaks">
        <TabsList className="w-full">
          <TabsTrigger value="streaks" className="flex-1">
            <Flame className="h-4 w-4 mr-1" /> Streaks
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex-1">
            <Trophy className="h-4 w-4 mr-1" /> Badges
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1">
            <TrendingUp className="h-4 w-4 mr-1" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="streaks" className="mt-4 space-y-4">
          {streaks.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Flame className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-1">No Streaks Yet</h3>
                <p className="text-sm text-muted-foreground">
                  Start logging glucose, meals, or exercise daily to build your streaks!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {streaks.map((streak) => (
                <Card key={streak.streak_type} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{streakEmojis[streak.streak_type] || '📊'}</span>
                      <div className="flex-1">
                        <p className="font-semibold">{streakLabels[streak.streak_type] || streak.streak_type}</p>
                        <p className="text-xs text-muted-foreground">
                          Last active: {streak.last_activity_date || 'Never'}
                        </p>
                      </div>
                      {streak.current_streak >= 7 && (
                        <Badge variant="default" className="bg-orange-500">🔥 Hot</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded bg-muted/50">
                        <p className="text-xl font-bold">{streak.current_streak}</p>
                        <p className="text-[10px] text-muted-foreground">Current</p>
                      </div>
                      <div className="p-2 rounded bg-muted/50">
                        <p className="text-xl font-bold">{streak.longest_streak}</p>
                        <p className="text-[10px] text-muted-foreground">Best</p>
                      </div>
                      <div className="p-2 rounded bg-muted/50">
                        <p className="text-xl font-bold">{streak.total_days_active}</p>
                        <p className="text-[10px] text-muted-foreground">Total</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="achievements" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ALL_ACHIEVEMENTS.map((ach) => {
              // Check if any earned achievement starts with this type prefix
              const isEarned = achievements.some(a => a.achievement_type.startsWith(ach.type));
              return (
                <Card
                  key={ach.type}
                  className={`transition-all ${isEarned ? 'border-primary/30 bg-primary/5' : 'opacity-50'}`}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-lg ${isEarned ? 'bg-primary/10' : 'bg-muted'}`}>
                      {isEarned ? ach.icon : '🔒'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{ach.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{ach.desc}</p>
                    </div>
                    <Badge variant={isEarned ? "default" : "outline"} className="shrink-0 text-xs">
                      {isEarned ? `+${ach.points}` : `${ach.points} pts`}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {achievements.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Your achievement history will appear here
                </p>
              ) : (
                <div className="space-y-3">
                  {achievements.slice(0, 10).map((ach) => (
                    <div key={ach.achievement_type} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <Award className="h-5 w-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ach.achievement_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(ach.earned_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">+{ach.points} pts</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
