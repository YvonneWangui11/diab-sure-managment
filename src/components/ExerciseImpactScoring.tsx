import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, TrendingDown, Award, Flame, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from "recharts";
import { format, subDays } from "date-fns";

interface ExerciseImpactScoringProps {
  userId: string;
}

interface ExerciseGlucoseCorrelation {
  exerciseId: string;
  exerciseType: string;
  duration: number;
  intensity: string;
  exerciseTime: Date;
  glucoseBefore: number | null;
  glucoseAfter: number | null;
  reduction: number | null;
}

export const ExerciseImpactScoring = ({ userId }: ExerciseImpactScoringProps) => {
  const [correlations, setCorrelations] = useState<ExerciseGlucoseCorrelation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const since = subDays(new Date(), 30).toISOString();

      const [exerciseRes, glucoseRes] = await Promise.all([
        supabase.from("exercise_logs").select("*").eq("patient_id", userId).gte("date_time", since).order("date_time", { ascending: true }),
        supabase.from("glucose_readings").select("*").eq("patient_id", userId).gte("created_at", since).order("created_at", { ascending: true }),
      ]);

      if (exerciseRes.error) throw exerciseRes.error;
      if (glucoseRes.error) throw glucoseRes.error;

      const exercises = exerciseRes.data || [];
      const glucose = glucoseRes.data || [];

      const matched: ExerciseGlucoseCorrelation[] = exercises.map((ex) => {
        const exTime = new Date(ex.date_time);

        const before = glucose
          .filter((g) => {
            const diff = (exTime.getTime() - new Date(g.created_at).getTime()) / (1000 * 60 * 60);
            return diff > 0 && diff <= 2;
          })
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        const after = glucose
          .filter((g) => {
            const diff = (new Date(g.created_at).getTime() - exTime.getTime()) / (1000 * 60 * 60);
            return diff >= 0.5 && diff <= 3;
          })
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];

        return {
          exerciseId: ex.id,
          exerciseType: ex.exercise_type,
          duration: ex.duration_minutes,
          intensity: ex.intensity || "moderate",
          exerciseTime: exTime,
          glucoseBefore: before?.glucose_value ?? null,
          glucoseAfter: after?.glucose_value ?? null,
          reduction: before && after ? before.glucose_value - after.glucose_value : null,
        };
      });

      setCorrelations(matched);
    } catch (error) {
      console.error("Error loading exercise impact data:", error);
      toast({ title: "Error", description: "Failed to load exercise data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  const withData = correlations.filter((c) => c.reduction !== null);
  const avgReduction = withData.length > 0 ? Math.round(withData.reduce((s, c) => s + c.reduction!, 0) / withData.length) : 0;
  const totalMinutes = correlations.reduce((s, c) => s + c.duration, 0);
  const sessionsThisMonth = correlations.length;

  // Impact score (0-100) based on frequency, duration, and glucose improvement
  const frequencyScore = Math.min(30, (sessionsThisMonth / 20) * 30);
  const durationScore = Math.min(30, (totalMinutes / 600) * 30);
  const reductionScore = withData.length > 0 ? Math.min(40, (avgReduction / 30) * 40) : 0;
  const impactScore = Math.round(Math.max(0, frequencyScore + durationScore + reductionScore));

  // By exercise type
  const typeStats: Record<string, { count: number; totalReduction: number; totalDuration: number }> = {};
  withData.forEach((c) => {
    if (!typeStats[c.exerciseType]) typeStats[c.exerciseType] = { count: 0, totalReduction: 0, totalDuration: 0 };
    typeStats[c.exerciseType].count++;
    typeStats[c.exerciseType].totalReduction += c.reduction!;
    typeStats[c.exerciseType].totalDuration += c.duration;
  });

  const typeChartData = Object.entries(typeStats)
    .map(([type, stats]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      avgReduction: Math.round(stats.totalReduction / stats.count),
      avgDuration: Math.round(stats.totalDuration / stats.count),
      sessions: stats.count,
    }))
    .sort((a, b) => b.avgReduction - a.avgReduction);

  // Weekly trend
  const weeklyMap: Record<string, { sessions: number; totalReduction: number; count: number }> = {};
  correlations.forEach((c) => {
    const week = format(c.exerciseTime, "MMM d");
    if (!weeklyMap[week]) weeklyMap[week] = { sessions: 0, totalReduction: 0, count: 0 };
    weeklyMap[week].sessions++;
    if (c.reduction !== null) {
      weeklyMap[week].totalReduction += c.reduction;
      weeklyMap[week].count++;
    }
  });

  const trendData = Object.entries(weeklyMap).map(([date, stats]) => ({
    date,
    sessions: stats.sessions,
    avgReduction: stats.count > 0 ? Math.round(stats.totalReduction / stats.count) : 0,
  }));

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600 dark:text-green-400";
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-destructive";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Great";
    if (score >= 40) return "Good";
    if (score >= 20) return "Getting Started";
    return "Needs Improvement";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Exercise Impact Score</h2>
        <p className="text-muted-foreground">How your exercise affects your glucose levels</p>
      </div>

      {/* Impact Score */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-4 text-center">
            <Award className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-4xl font-bold text-primary">{impactScore}</p>
            <p className={`text-sm font-medium ${getScoreColor(impactScore)}`}>{getScoreLabel(impactScore)}</p>
            <p className="text-xs text-muted-foreground">Impact Score /100</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Sessions</p>
            <p className="text-2xl font-bold">{sessionsThisMonth}</p>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Time</p>
            <p className="text-2xl font-bold">{totalMinutes}m</p>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Avg Reduction</p>
            <p className={`text-2xl font-bold ${avgReduction > 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
              {avgReduction > 0 ? `-${avgReduction}` : avgReduction} mg/dL
            </p>
            <p className="text-xs text-muted-foreground">After exercise</p>
          </CardContent>
        </Card>
      </div>

      {/* By Exercise Type */}
      {typeChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-primary" />
              Best Activities for Glucose
            </CardTitle>
            <CardDescription>Avg glucose reduction by exercise type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" tick={{ fontSize: 11 }} label={{ value: "mg/dL reduction", position: "insideBottom", fontSize: 11, offset: -5 }} />
                  <YAxis type="category" dataKey="type" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload?.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-card border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">{d.type}</p>
                            <p className="text-sm">Avg reduction: {d.avgReduction} mg/dL</p>
                            <p className="text-xs text-muted-foreground">{d.sessions} sessions, ~{d.avgDuration}min avg</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="avgReduction" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trend Over Time */}
      {trendData.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Exercise Trend</CardTitle>
            <CardDescription>Your activity consistency over the past month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="sessions" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="Sessions" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Exercise Tips for Better Glucose Control</p>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                <li>30 minutes of moderate exercise daily can lower glucose by 20-50 mg/dL</li>
                <li>Walking after meals is especially effective at reducing post-meal spikes</li>
                <li>Log a glucose reading before and 1-2 hours after exercise for best tracking</li>
                <li>Consistency matters more than intensity for long-term A1C improvement</li>
                {typeChartData.length > 0 && (
                  <li className="font-medium text-foreground">
                    Your best activity: {typeChartData[0].type} (avg -{typeChartData[0].avgReduction} mg/dL)
                  </li>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
