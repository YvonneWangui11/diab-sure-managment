import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Apple, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format, subDays, differenceInHours } from "date-fns";

interface MealImpactCorrelationProps {
  userId: string;
}

interface MealGlucosePair {
  mealId: string;
  mealDescription: string;
  mealType: string;
  mealTime: Date;
  glucoseBefore: number | null;
  glucoseAfter: number | null;
  impact: number | null;
}

export const MealImpactCorrelation = ({ userId }: MealImpactCorrelationProps) => {
  const [pairs, setPairs] = useState<MealGlucosePair[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const since = subDays(new Date(), 30).toISOString();

      const [mealsRes, glucoseRes] = await Promise.all([
        supabase.from("meal_logs").select("*").eq("patient_id", userId).gte("date_time", since).order("date_time", { ascending: true }),
        supabase.from("glucose_readings").select("*").eq("patient_id", userId).gte("created_at", since).order("created_at", { ascending: true }),
      ]);

      if (mealsRes.error) throw mealsRes.error;
      if (glucoseRes.error) throw glucoseRes.error;

      const meals = mealsRes.data || [];
      const glucose = glucoseRes.data || [];

      // Match meals with closest glucose readings before and after
      const matched: MealGlucosePair[] = meals.map((meal) => {
        const mealTime = new Date(meal.date_time);

        // Find glucose reading within 2h before meal
        const before = glucose
          .filter((g) => {
            const gTime = new Date(g.created_at);
            const diffH = (mealTime.getTime() - gTime.getTime()) / (1000 * 60 * 60);
            return diffH > 0 && diffH <= 2;
          })
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        // Find glucose reading 1-3h after meal
        const after = glucose
          .filter((g) => {
            const gTime = new Date(g.created_at);
            const diffH = (gTime.getTime() - mealTime.getTime()) / (1000 * 60 * 60);
            return diffH >= 1 && diffH <= 3;
          })
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];

        return {
          mealId: meal.id,
          mealDescription: meal.description,
          mealType: meal.meal_type || "other",
          mealTime,
          glucoseBefore: before?.glucose_value ?? null,
          glucoseAfter: after?.glucose_value ?? null,
          impact: before && after ? after.glucose_value - before.glucose_value : null,
        };
      });

      setPairs(matched);
    } catch (error) {
      console.error("Error loading meal impact data:", error);
      toast({ title: "Error", description: "Failed to load meal impact data", variant: "destructive" });
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

  const withImpact = pairs.filter((p) => p.impact !== null);
  const avgImpact = withImpact.length > 0 ? Math.round(withImpact.reduce((s, p) => s + p.impact!, 0) / withImpact.length) : 0;

  // Group by meal type
  const mealTypeStats: Record<string, { count: number; totalImpact: number; highSpikes: number }> = {};
  withImpact.forEach((p) => {
    const type = p.mealType || "other";
    if (!mealTypeStats[type]) mealTypeStats[type] = { count: 0, totalImpact: 0, highSpikes: 0 };
    mealTypeStats[type].count++;
    mealTypeStats[type].totalImpact += p.impact!;
    if (p.impact! > 50) mealTypeStats[type].highSpikes++;
  });

  const mealTypeChartData = Object.entries(mealTypeStats).map(([type, stats]) => ({
    type: type.charAt(0).toUpperCase() + type.slice(1),
    avgImpact: Math.round(stats.totalImpact / stats.count),
    count: stats.count,
    highSpikes: stats.highSpikes,
  }));

  // Recent impacts for list
  const recentImpacts = withImpact.slice(-10).reverse();

  const getImpactColor = (impact: number) => {
    if (impact <= 20) return "text-green-600 dark:text-green-400";
    if (impact <= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-destructive";
  };

  const getBarFill = (avgImpact: number) => {
    if (avgImpact <= 20) return "hsl(var(--chart-2))";
    if (avgImpact <= 50) return "hsl(var(--chart-4))";
    return "hsl(var(--destructive))";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Meal Impact Analysis</h2>
        <p className="text-muted-foreground">How your meals affect your glucose levels</p>
      </div>

      {withImpact.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Apple className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Not enough correlated data yet</p>
            <p className="text-sm mt-2">Log meals and glucose readings close together to see meal impact analysis. Take a glucose reading before and 2 hours after meals.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Avg Glucose Rise</p>
                <p className={`text-2xl font-bold ${getImpactColor(avgImpact)}`}>
                  {avgImpact > 0 ? "+" : ""}{avgImpact} mg/dL
                </p>
                <p className="text-xs text-muted-foreground">After meals</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Meals Analyzed</p>
                <p className="text-2xl font-bold">{withImpact.length}</p>
                <p className="text-xs text-muted-foreground">of {pairs.length} total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">High Spikes</p>
                <p className="text-2xl font-bold text-destructive">
                  {withImpact.filter((p) => p.impact! > 50).length}
                </p>
                <p className="text-xs text-muted-foreground">&gt;50 mg/dL rise</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Good Meals</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {withImpact.filter((p) => p.impact! <= 30).length}
                </p>
                <p className="text-xs text-muted-foreground">≤30 mg/dL rise</p>
              </CardContent>
            </Card>
          </div>

          {/* By Meal Type Chart */}
          {mealTypeChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Impact by Meal Type</CardTitle>
                <CardDescription>Average glucose change per meal type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mealTypeChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} label={{ value: "mg/dL", angle: -90, position: "insideLeft", fontSize: 11 }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload?.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-card border rounded-lg p-3 shadow-lg">
                                <p className="font-medium">{d.type}</p>
                                <p className="text-sm">Avg rise: {d.avgImpact > 0 ? "+" : ""}{d.avgImpact} mg/dL</p>
                                <p className="text-xs text-muted-foreground">{d.count} meals, {d.highSpikes} high spikes</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="avgImpact" radius={[4, 4, 0, 0]}>
                        {mealTypeChartData.map((entry, idx) => (
                          <Cell key={idx} fill={getBarFill(entry.avgImpact)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent meal impacts */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Meal Impacts</CardTitle>
              <CardDescription>Your last {recentImpacts.length} meals with glucose data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentImpacts.map((pair) => (
                <div key={pair.mealId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{pair.mealDescription}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(pair.mealTime, "MMM d, h:mm a")} • {pair.mealType}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Before: {pair.glucoseBefore} → After: {pair.glucoseAfter} mg/dL
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    {pair.impact! > 0 ? (
                      <TrendingUp className={`h-4 w-4 ${getImpactColor(pair.impact!)}`} />
                    ) : pair.impact! < 0 ? (
                      <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={`font-bold ${getImpactColor(Math.abs(pair.impact!))}`}>
                      {pair.impact! > 0 ? "+" : ""}{pair.impact} 
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Improve your meal impact data</p>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                    <li>Take a glucose reading right before eating</li>
                    <li>Take another reading 2 hours after your meal</li>
                    <li>Log your meal with a description for best tracking</li>
                    <li>A rise of &lt;30 mg/dL is considered ideal</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
