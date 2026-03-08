import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileText, Download, TrendingUp, TrendingDown, Minus, Heart, Pill, Apple, Dumbbell, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, startOfWeek, endOfWeek, subWeeks } from "date-fns";

interface WeeklyHealthReportProps {
  userId: string;
}

interface WeeklyStats {
  avgGlucose: number;
  glucoseReadings: number;
  timeInRange: number;
  hypoEvents: number;
  hyperEvents: number;
  mealsLogged: number;
  exerciseMinutes: number;
  exerciseSessions: number;
  medsTaken: number;
  medsScheduled: number;
  adherence: number;
}

export const WeeklyHealthReport = ({ userId }: WeeklyHealthReportProps) => {
  const [currentWeek, setCurrentWeek] = useState<WeeklyStats | null>(null);
  const [previousWeek, setPreviousWeek] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const { toast } = useToast();

  const loadWeekData = useCallback(async (start: Date, end: Date): Promise<WeeklyStats> => {
    const startStr = start.toISOString();
    const endStr = end.toISOString();

    const [glucose, meals, exercise, intake, rx] = await Promise.all([
      supabase.from("glucose_readings").select("glucose_value").eq("patient_id", userId).gte("created_at", startStr).lte("created_at", endStr),
      supabase.from("meal_logs").select("id", { count: "exact", head: true }).eq("patient_id", userId).gte("date_time", startStr).lte("date_time", endStr),
      supabase.from("exercise_logs").select("duration_minutes").eq("patient_id", userId).gte("date_time", startStr).lte("date_time", endStr),
      supabase.from("medication_intake").select("status").eq("patient_id", userId).gte("scheduled_time", startStr).lte("scheduled_time", endStr),
      supabase.from("prescriptions").select("id", { count: "exact", head: true }).eq("patient_id", userId).eq("status", "active"),
    ]);

    const gValues = (glucose.data || []).map((g) => g.glucose_value);
    const avgGlucose = gValues.length > 0 ? Math.round(gValues.reduce((a, b) => a + b, 0) / gValues.length) : 0;
    const inRange = gValues.filter((v) => v >= 70 && v <= 180).length;
    const timeInRange = gValues.length > 0 ? Math.round((inRange / gValues.length) * 100) : 0;
    const hypoEvents = gValues.filter((v) => v < 70).length;
    const hyperEvents = gValues.filter((v) => v > 180).length;

    const exerciseData = exercise.data || [];
    const exerciseMinutes = exerciseData.reduce((s, e) => s + (e.duration_minutes || 0), 0);

    const intakeData = intake.data || [];
    const medsTaken = intakeData.filter((i) => i.status === "taken").length;
    const medsScheduled = intakeData.length;
    const adherence = medsScheduled > 0 ? Math.round((medsTaken / medsScheduled) * 100) : 0;

    return {
      avgGlucose,
      glucoseReadings: gValues.length,
      timeInRange,
      hypoEvents,
      hyperEvents,
      mealsLogged: meals.count || 0,
      exerciseMinutes,
      exerciseSessions: exerciseData.length,
      medsTaken,
      medsScheduled,
      adherence,
    };
  }, [userId]);

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      const now = new Date();
      const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
      const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const lastWeekStart = subWeeks(thisWeekStart, 1);
      const lastWeekEnd = subDays(thisWeekStart, 1);

      const [profileRes, current, previous] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("user_id", userId).maybeSingle(),
        loadWeekData(thisWeekStart, thisWeekEnd),
        loadWeekData(lastWeekStart, lastWeekEnd),
      ]);

      setFullName(profileRes.data?.full_name || "Patient");
      setCurrentWeek(current);
      setPreviousWeek(previous);
    } catch (error) {
      console.error("Error loading weekly report:", error);
      toast({ title: "Error", description: "Failed to load report", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [userId, loadWeekData, toast]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const getTrend = (current: number, previous: number) => {
    const diff = current - previous;
    if (Math.abs(diff) < 2) return { icon: Minus, label: "Stable", color: "text-muted-foreground" };
    if (diff > 0) return { icon: TrendingUp, label: `+${diff}`, color: "text-green-600 dark:text-green-400" };
    return { icon: TrendingDown, label: `${diff}`, color: "text-destructive" };
  };

  const getGlucoseTrend = (current: number, previous: number) => {
    const diff = current - previous;
    if (Math.abs(diff) < 3) return { icon: Minus, label: "Stable", color: "text-muted-foreground" };
    // For glucose, lower is generally better
    if (diff < 0) return { icon: TrendingDown, label: `${diff}`, color: "text-green-600 dark:text-green-400" };
    return { icon: TrendingUp, label: `+${diff}`, color: "text-destructive" };
  };

  const exportReport = () => {
    if (!currentWeek) return;
    const now = new Date();
    const weekLabel = format(startOfWeek(now, { weekStartsOn: 1 }), "MMM d") + " - " + format(endOfWeek(now, { weekStartsOn: 1 }), "MMM d, yyyy");

    const content = `WEEKLY HEALTH REPORT - ${fullName}
Week: ${weekLabel}
Generated: ${format(now, "PPpp")}

=== GLUCOSE SUMMARY ===
Average Glucose: ${currentWeek.avgGlucose} mg/dL
Time in Range (70-180): ${currentWeek.timeInRange}%
Readings: ${currentWeek.glucoseReadings}
Hypo Events (<70): ${currentWeek.hypoEvents}
Hyper Events (>180): ${currentWeek.hyperEvents}
Estimated A1C: ${currentWeek.avgGlucose > 0 ? ((currentWeek.avgGlucose + 46.7) / 28.7).toFixed(1) : "N/A"}%

=== MEDICATION ADHERENCE ===
Doses Taken: ${currentWeek.medsTaken}/${currentWeek.medsScheduled}
Adherence: ${currentWeek.adherence}%

=== EXERCISE ===
Sessions: ${currentWeek.exerciseSessions}
Total Minutes: ${currentWeek.exerciseMinutes}

=== NUTRITION ===
Meals Logged: ${currentWeek.mealsLogged}

=== WEEK-OVER-WEEK COMPARISON ===
Avg Glucose: ${currentWeek.avgGlucose} vs ${previousWeek?.avgGlucose || "N/A"} (prev)
Time in Range: ${currentWeek.timeInRange}% vs ${previousWeek?.timeInRange || "N/A"}% (prev)
Adherence: ${currentWeek.adherence}% vs ${previousWeek?.adherence || "N/A"}% (prev)
Exercise: ${currentWeek.exerciseMinutes}min vs ${previousWeek?.exerciseMinutes || "N/A"}min (prev)
`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `health-report-${format(now, "yyyy-MM-dd")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Report downloaded", description: "Your weekly health report has been exported" });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!currentWeek) return null;

  const now = new Date();
  const weekLabel = format(startOfWeek(now, { weekStartsOn: 1 }), "MMM d") + " – " + format(endOfWeek(now, { weekStartsOn: 1 }), "MMM d, yyyy");
  const eA1C = currentWeek.avgGlucose > 0 ? ((currentWeek.avgGlucose + 46.7) / 28.7).toFixed(1) : "--";

  // Overall health score
  const tirScore = Math.min(40, (currentWeek.timeInRange / 100) * 40);
  const adhScore = Math.min(30, (currentWeek.adherence / 100) * 30);
  const exScore = Math.min(15, (currentWeek.exerciseMinutes / 150) * 15);
  const mealScore = Math.min(15, (currentWeek.mealsLogged / 21) * 15);
  const healthScore = Math.round(tirScore + adhScore + exScore + mealScore);

  const getHealthLabel = (score: number) => {
    if (score >= 80) return { label: "Excellent", color: "text-green-600 dark:text-green-400" };
    if (score >= 60) return { label: "Good", color: "text-primary" };
    if (score >= 40) return { label: "Fair", color: "text-yellow-600 dark:text-yellow-400" };
    return { label: "Needs Attention", color: "text-destructive" };
  };

  const hs = getHealthLabel(healthScore);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Weekly Health Report</h2>
          <p className="text-muted-foreground">{weekLabel}</p>
        </div>
        <Button onClick={exportReport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Health Score */}
      <Card className="border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Weekly Health Score</p>
              <p className={`text-5xl font-bold ${hs.color}`}>{healthScore}</p>
              <p className={`text-sm font-medium ${hs.color}`}>{hs.label}</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-xs text-muted-foreground">Score Breakdown</p>
              <p className="text-xs">Time in Range: {Math.round(tirScore)}/40</p>
              <p className="text-xs">Med Adherence: {Math.round(adhScore)}/30</p>
              <p className="text-xs">Exercise: {Math.round(exScore)}/15</p>
              <p className="text-xs">Meals: {Math.round(mealScore)}/15</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metric Cards with Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Glucose */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="h-4 w-4 text-primary" />
              Glucose
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Average</span>
              <div className="flex items-center gap-2">
                <span className="font-bold">{currentWeek.avgGlucose} mg/dL</span>
                {previousWeek && (() => {
                  const t = getGlucoseTrend(currentWeek.avgGlucose, previousWeek.avgGlucose);
                  const Icon = t.icon;
                  return <span className={`text-xs ${t.color}`}><Icon className="h-3 w-3 inline" /> {t.label}</span>;
                })()}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Time in Range</span>
              <span className="font-bold">{currentWeek.timeInRange}%</span>
            </div>
            <Progress value={currentWeek.timeInRange} className="h-2" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Est. A1C</span>
              <span className="font-bold">{eA1C}%</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Hypos: {currentWeek.hypoEvents}</span>
              <span>Hypers: {currentWeek.hyperEvents}</span>
              <span>Readings: {currentWeek.glucoseReadings}</span>
            </div>
          </CardContent>
        </Card>

        {/* Medication */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Pill className="h-4 w-4 text-primary" />
              Medication Adherence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Adherence</span>
              <div className="flex items-center gap-2">
                <span className="font-bold">{currentWeek.adherence}%</span>
                {previousWeek && (() => {
                  const t = getTrend(currentWeek.adherence, previousWeek.adherence);
                  const Icon = t.icon;
                  return <span className={`text-xs ${t.color}`}><Icon className="h-3 w-3 inline" /> {t.label}%</span>;
                })()}
              </div>
            </div>
            <Progress value={currentWeek.adherence} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {currentWeek.medsTaken} of {currentWeek.medsScheduled} doses taken
            </p>
          </CardContent>
        </Card>

        {/* Exercise */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Dumbbell className="h-4 w-4 text-primary" />
              Exercise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Minutes</span>
              <div className="flex items-center gap-2">
                <span className="font-bold">{currentWeek.exerciseMinutes}m</span>
                {previousWeek && (() => {
                  const t = getTrend(currentWeek.exerciseMinutes, previousWeek.exerciseMinutes);
                  const Icon = t.icon;
                  return <span className={`text-xs ${t.color}`}><Icon className="h-3 w-3 inline" /> {t.label}m</span>;
                })()}
              </div>
            </div>
            <Progress value={Math.min(100, (currentWeek.exerciseMinutes / 150) * 100)} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {currentWeek.exerciseSessions} sessions • Goal: 150 min/week
            </p>
          </CardContent>
        </Card>

        {/* Nutrition */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Apple className="h-4 w-4 text-primary" />
              Nutrition
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Meals Logged</span>
              <div className="flex items-center gap-2">
                <span className="font-bold">{currentWeek.mealsLogged}</span>
                {previousWeek && (() => {
                  const t = getTrend(currentWeek.mealsLogged, previousWeek.mealsLogged);
                  const Icon = t.icon;
                  return <span className={`text-xs ${t.color}`}><Icon className="h-3 w-3 inline" /> {t.label}</span>;
                })()}
              </div>
            </div>
            <Progress value={Math.min(100, (currentWeek.mealsLogged / 21) * 100)} className="h-2" />
            <p className="text-xs text-muted-foreground">Goal: 3 meals/day (21/week)</p>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            This Week's Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentWeek.timeInRange < 70 && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm font-medium text-foreground">⚠️ Your time in range is below 70%. Focus on consistent meal timing and medication adherence.</p>
            </div>
          )}
          {currentWeek.adherence < 80 && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm font-medium text-foreground">💊 Medication adherence is at {currentWeek.adherence}%. Setting reminders can help reach 80%+.</p>
            </div>
          )}
          {currentWeek.exerciseMinutes < 150 && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm font-medium text-foreground">🏃 You're at {currentWeek.exerciseMinutes} of 150 recommended weekly minutes. Even a 15-minute walk after meals helps!</p>
            </div>
          )}
          {currentWeek.mealsLogged < 14 && (
            <div className="p-3 bg-muted border rounded-lg">
              <p className="text-sm font-medium text-foreground">🍽️ Log more meals to better understand your glucose patterns. Aim for at least 2 meals/day.</p>
            </div>
          )}
          {currentWeek.timeInRange >= 70 && currentWeek.adherence >= 80 && currentWeek.exerciseMinutes >= 150 && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm font-medium text-foreground">🌟 Great week! You're meeting all your targets. Keep up the excellent work!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
