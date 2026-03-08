import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, AlertTriangle, Target, Clock, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from "recharts";
import { format, subDays, startOfDay, endOfDay, differenceInDays } from "date-fns";

interface GlucoseReading {
  id: string;
  glucose_value: number;
  test_time: string;
  notes?: string;
  created_at: string;
}

interface GlucoseTrendAnalysisProps {
  userId: string;
}

export const GlucoseTrendAnalysis = ({ userId }: GlucoseTrendAnalysisProps) => {
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  const { toast } = useToast();

  const loadReadings = useCallback(async () => {
    try {
      setLoading(true);
      const since = subDays(new Date(), parseInt(dateRange)).toISOString();
      const { data, error } = await supabase
        .from("glucose_readings")
        .select("*")
        .eq("patient_id", userId)
        .gte("created_at", since)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setReadings(data || []);
    } catch (error) {
      console.error("Error loading glucose readings:", error);
      toast({ title: "Error", description: "Failed to load glucose data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [userId, dateRange, toast]);

  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  // Calculate metrics
  const values = readings.map((r) => r.glucose_value);
  const avg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  const stdDev = values.length > 1
    ? Math.round(Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length))
    : 0;

  // Time in range (70-180 mg/dL)
  const inRange = values.filter((v) => v >= 70 && v <= 180).length;
  const belowRange = values.filter((v) => v < 70).length;
  const aboveRange = values.filter((v) => v > 180).length;
  const tirPct = values.length > 0 ? Math.round((inRange / values.length) * 100) : 0;
  const belowPct = values.length > 0 ? Math.round((belowRange / values.length) * 100) : 0;
  const abovePct = values.length > 0 ? Math.round((aboveRange / values.length) * 100) : 0;

  // Estimated A1C: eA1C = (avg + 46.7) / 28.7
  const eA1C = values.length > 0 ? ((avg + 46.7) / 28.7).toFixed(1) : "--";

  // Glycemic variability (CV%)
  const cv = avg > 0 ? Math.round((stdDev / avg) * 100) : 0;

  // Pattern detection
  const patterns: { type: string; message: string; severity: "critical" | "warning" | "info" }[] = [];

  // Dawn phenomenon: high fasting readings
  const fastingReadings = readings.filter((r) => r.test_time === "fasting");
  const highFasting = fastingReadings.filter((r) => r.glucose_value > 130);
  if (fastingReadings.length >= 3 && highFasting.length / fastingReadings.length > 0.5) {
    patterns.push({ type: "Dawn Phenomenon", message: `${Math.round((highFasting.length / fastingReadings.length) * 100)}% of fasting readings are above 130 mg/dL. Discuss with your clinician.`, severity: "warning" });
  }

  // Post-meal spikes
  const postMealReadings = readings.filter((r) => r.test_time.startsWith("post-"));
  const highPostMeal = postMealReadings.filter((r) => r.glucose_value > 180);
  if (postMealReadings.length >= 3 && highPostMeal.length / postMealReadings.length > 0.4) {
    patterns.push({ type: "Post-meal Spikes", message: `${Math.round((highPostMeal.length / postMealReadings.length) * 100)}% of post-meal readings exceed 180 mg/dL. Consider adjusting meal composition.`, severity: "warning" });
  }

  // Hypoglycemia frequency
  const hypos = values.filter((v) => v < 70);
  if (hypos.length >= 2) {
    patterns.push({ type: "Hypoglycemia Risk", message: `${hypos.length} low readings (<70 mg/dL) detected in this period. Discuss medication adjustment.`, severity: "critical" });
  }

  // High variability
  if (cv > 36) {
    patterns.push({ type: "High Variability", message: `Your glucose variability (CV ${cv}%) is above the recommended 36%. This may increase complication risk.`, severity: "warning" });
  }

  // Trend: compare first half vs second half
  const halfIdx = Math.floor(values.length / 2);
  const firstHalfAvg = halfIdx > 0 ? values.slice(0, halfIdx).reduce((a, b) => a + b, 0) / halfIdx : 0;
  const secondHalfAvg = halfIdx > 0 ? values.slice(halfIdx).reduce((a, b) => a + b, 0) / (values.length - halfIdx) : 0;
  const trendDirection = secondHalfAvg < firstHalfAvg - 5 ? "improving" : secondHalfAvg > firstHalfAvg + 5 ? "worsening" : "stable";

  if (patterns.length === 0 && values.length > 0) {
    patterns.push({ type: "Looking Good", message: "No concerning patterns detected. Keep up the great work!", severity: "info" });
  }

  // Chart data
  const chartData = readings.map((r) => ({
    date: format(new Date(r.created_at), "MMM d"),
    time: format(new Date(r.created_at), "HH:mm"),
    value: r.glucose_value,
    testTime: r.test_time,
  }));

  // Daily distribution for bar chart
  const hourlyBuckets: Record<number, number[]> = {};
  readings.forEach((r) => {
    const hour = new Date(r.created_at).getHours();
    if (!hourlyBuckets[hour]) hourlyBuckets[hour] = [];
    hourlyBuckets[hour].push(r.glucose_value);
  });
  const hourlyData = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h.toString().padStart(2, "0")}:00`,
    avg: hourlyBuckets[h] ? Math.round(hourlyBuckets[h].reduce((a, b) => a + b, 0) / hourlyBuckets[h].length) : 0,
    count: hourlyBuckets[h]?.length || 0,
  })).filter((d) => d.count > 0);

  const getBarColor = (avg: number) => {
    if (avg < 70) return "hsl(var(--chart-4))";
    if (avg <= 180) return "hsl(var(--chart-2))";
    return "hsl(var(--destructive))";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Glucose Trend Analysis</h2>
          <p className="text-muted-foreground">Deep insights into your glucose patterns</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {values.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No glucose data for this period. Start logging readings to see insights.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Estimated A1C</p>
                <p className="text-3xl font-bold text-primary">{eA1C}%</p>
                <p className="text-xs text-muted-foreground">Based on avg glucose</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Time in Range</p>
                <p className="text-3xl font-bold">{tirPct}%</p>
                <p className="text-xs text-muted-foreground">70-180 mg/dL target</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Average</p>
                <p className="text-3xl font-bold">{avg}</p>
                <p className="text-xs text-muted-foreground">mg/dL ± {stdDev}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Trend</p>
                <div className="flex items-center justify-center gap-1">
                  {trendDirection === "improving" ? (
                    <TrendingDown className="h-6 w-6 text-green-500" />
                  ) : trendDirection === "worsening" ? (
                    <TrendingUp className="h-6 w-6 text-destructive" />
                  ) : (
                    <Target className="h-6 w-6 text-muted-foreground" />
                  )}
                  <p className="text-lg font-bold capitalize">{trendDirection}</p>
                </div>
                <p className="text-xs text-muted-foreground">CV: {cv}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Time in Range Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Time in Range Breakdown
              </CardTitle>
              <CardDescription>Distribution of your glucose readings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Above Range (&gt;180 mg/dL)</span>
                    <span className="text-sm text-destructive font-medium">{abovePct}% ({aboveRange} readings)</span>
                  </div>
                  <Progress value={abovePct} className="h-3 [&>div]:bg-destructive" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">In Range (70-180 mg/dL)</span>
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">{tirPct}% ({inRange} readings)</span>
                  </div>
                  <Progress value={tirPct} className="h-3 [&>div]:bg-green-500" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Below Range (&lt;70 mg/dL)</span>
                    <span className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">{belowPct}% ({belowRange} readings)</span>
                  </div>
                  <Progress value={belowPct} className="h-3 [&>div]:bg-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Glucose Over Time</CardTitle>
              <CardDescription>{readings.length} readings in the last {dateRange} days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[40, "auto"]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload?.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-card border rounded-lg p-3 shadow-lg">
                              <p className="font-medium">{d.value} mg/dL</p>
                              <p className="text-sm text-muted-foreground">{d.date} at {d.time}</p>
                              <p className="text-xs text-muted-foreground capitalize">{d.testTime?.replace("-", " ")}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine y={70} stroke="hsl(var(--chart-4))" strokeDasharray="5 5" label={{ value: "Low", position: "insideBottomLeft", fontSize: 10 }} />
                    <ReferenceLine y={180} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: "High", position: "insideTopLeft", fontSize: 10 }} />
                    <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#trendGradient)" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--primary))" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Hourly Distribution */}
          {hourlyData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Time-of-Day Pattern
                </CardTitle>
                <CardDescription>Average glucose by hour of day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload?.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-card border rounded-lg p-2 shadow-lg">
                                <p className="font-medium">{d.avg} mg/dL avg</p>
                                <p className="text-xs text-muted-foreground">{d.count} readings at {d.hour}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <ReferenceLine y={70} stroke="hsl(var(--chart-4))" strokeDasharray="3 3" />
                      <ReferenceLine y={180} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                      <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                        {hourlyData.map((entry, index) => (
                          <Cell key={index} fill={getBarColor(entry.avg)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pattern Detection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Pattern Detection
              </CardTitle>
              <CardDescription>Automated analysis of your glucose patterns</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {patterns.map((pattern, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    pattern.severity === "critical"
                      ? "bg-destructive/10 border-destructive/30"
                      : pattern.severity === "warning"
                      ? "bg-yellow-500/10 border-yellow-500/30"
                      : "bg-green-500/10 border-green-500/30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant={pattern.severity === "critical" ? "destructive" : "secondary"}
                      className={pattern.severity === "warning" ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400" : pattern.severity === "info" ? "bg-green-500/20 text-green-700 dark:text-green-400" : ""}
                    >
                      {pattern.severity}
                    </Badge>
                    <span className="font-semibold text-foreground">{pattern.type}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{pattern.message}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
