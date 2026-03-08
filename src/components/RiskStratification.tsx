import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, AlertTriangle, CheckCircle, TrendingUp, Eye, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { subDays } from "date-fns";

interface RiskStratificationProps {
  userId: string;
  viewMode?: "patient" | "clinician";
}

interface RiskFactor {
  name: string;
  score: number; // 0-100
  severity: "low" | "moderate" | "high" | "critical";
  description: string;
  recommendation: string;
}

export const RiskStratification = ({ userId, viewMode = "patient" }: RiskStratificationProps) => {
  const [riskFactors, setRiskFactors] = useState<RiskFactor[]>([]);
  const [overallRisk, setOverallRisk] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadRiskData = useCallback(async () => {
    try {
      setLoading(true);
      const since30 = subDays(new Date(), 30).toISOString();
      const since7 = subDays(new Date(), 7).toISOString();

      const [glucoseRes, exerciseRes, mealsRes, intakeRes, rxRes, alertsRes] = await Promise.all([
        supabase.from("glucose_readings").select("glucose_value, test_time, created_at").eq("patient_id", userId).gte("created_at", since30),
        supabase.from("exercise_logs").select("duration_minutes, date_time").eq("patient_id", userId).gte("date_time", since30),
        supabase.from("meal_logs").select("id, date_time").eq("patient_id", userId).gte("date_time", since7),
        supabase.from("medication_intake").select("status, scheduled_time").eq("patient_id", userId).gte("scheduled_time", since7),
        supabase.from("prescriptions").select("id", { count: "exact", head: true }).eq("patient_id", userId).eq("status", "active"),
        supabase.from("health_alerts").select("severity").eq("patient_id", userId).eq("resolved", false),
      ]);

      const factors: RiskFactor[] = [];

      // 1. Glucose Control Risk
      const gValues = (glucoseRes.data || []).map((g) => g.glucose_value);
      if (gValues.length > 0) {
        const avg = gValues.reduce((a, b) => a + b, 0) / gValues.length;
        const inRange = gValues.filter((v) => v >= 70 && v <= 180).length;
        const tir = (inRange / gValues.length) * 100;
        const hypos = gValues.filter((v) => v < 54).length;
        const severeHighs = gValues.filter((v) => v > 300).length;

        let glucoseScore = 0;
        if (tir < 50) glucoseScore += 40;
        else if (tir < 70) glucoseScore += 20;
        if (avg > 200) glucoseScore += 25;
        else if (avg > 160) glucoseScore += 15;
        if (hypos >= 2) glucoseScore += 20;
        if (severeHighs >= 1) glucoseScore += 15;

        glucoseScore = Math.min(100, glucoseScore);
        const severity = glucoseScore >= 60 ? "critical" : glucoseScore >= 40 ? "high" : glucoseScore >= 20 ? "moderate" : "low";

        factors.push({
          name: "Glucose Control",
          score: glucoseScore,
          severity,
          description: `Avg: ${Math.round(avg)} mg/dL, TIR: ${Math.round(tir)}%, Hypos: ${hypos}, Severe highs: ${severeHighs}`,
          recommendation: glucoseScore > 40
            ? "Consider reviewing medication dosages and meal plans with your clinician."
            : "Your glucose control is on track. Continue monitoring regularly.",
        });
      } else {
        factors.push({
          name: "Glucose Control",
          score: 50,
          severity: "moderate",
          description: "No glucose data in the last 30 days",
          recommendation: "Start logging glucose readings to enable risk assessment.",
        });
      }

      // 2. Medication Adherence Risk
      const intakeData = intakeRes.data || [];
      const taken = intakeData.filter((i) => i.status === "taken").length;
      const adherence = intakeData.length > 0 ? (taken / intakeData.length) * 100 : 0;
      const activeRx = rxRes.count || 0;

      let medScore = 0;
      if (activeRx > 0) {
        if (adherence < 50) medScore = 80;
        else if (adherence < 70) medScore = 50;
        else if (adherence < 85) medScore = 25;
        else medScore = 5;
      }

      if (activeRx > 0 || intakeData.length > 0) {
        factors.push({
          name: "Medication Adherence",
          score: medScore,
          severity: medScore >= 60 ? "critical" : medScore >= 40 ? "high" : medScore >= 20 ? "moderate" : "low",
          description: `${Math.round(adherence)}% adherence this week (${taken}/${intakeData.length} doses)`,
          recommendation: medScore > 40
            ? "Missing medications increases complication risk. Consider setting reminders."
            : "Great medication adherence. Keep it up!",
        });
      }

      // 3. Physical Activity Risk
      const exerciseData = exerciseRes.data || [];
      const totalMin = exerciseData.reduce((s, e) => s + (e.duration_minutes || 0), 0);
      const weeklyAvg = Math.round(totalMin / 4.3); // approx weeks in 30 days

      let exerciseScore = 0;
      if (weeklyAvg < 30) exerciseScore = 70;
      else if (weeklyAvg < 75) exerciseScore = 40;
      else if (weeklyAvg < 150) exerciseScore = 20;
      else exerciseScore = 5;

      factors.push({
        name: "Physical Activity",
        score: exerciseScore,
        severity: exerciseScore >= 60 ? "high" : exerciseScore >= 40 ? "moderate" : "low",
        description: `~${weeklyAvg} min/week average (recommended: 150 min/week)`,
        recommendation: exerciseScore > 40
          ? "Increasing activity to 150 min/week can significantly improve glucose control."
          : "You're meeting exercise recommendations. Excellent!",
      });

      // 4. Monitoring Engagement Risk
      const recentReadings = (glucoseRes.data || []).filter((g) => g.created_at >= since7).length;
      const mealsThisWeek = mealsRes.data?.length || 0;

      let engagementScore = 0;
      if (recentReadings < 2) engagementScore += 40;
      else if (recentReadings < 7) engagementScore += 15;
      if (mealsThisWeek < 7) engagementScore += 30;
      else if (mealsThisWeek < 14) engagementScore += 10;

      engagementScore = Math.min(100, engagementScore);

      factors.push({
        name: "Monitoring Engagement",
        score: engagementScore,
        severity: engagementScore >= 60 ? "high" : engagementScore >= 30 ? "moderate" : "low",
        description: `${recentReadings} glucose readings and ${mealsThisWeek} meals logged this week`,
        recommendation: engagementScore > 30
          ? "Regular tracking helps identify patterns. Aim for at least daily glucose and meal logging."
          : "Great engagement with your health tracking!",
      });

      // 5. Active alerts
      const unresolvedAlerts = alertsRes.data || [];
      const criticalAlerts = unresolvedAlerts.filter((a) => a.severity === "critical").length;
      let alertScore = criticalAlerts > 0 ? Math.min(100, criticalAlerts * 30) : unresolvedAlerts.length > 0 ? 20 : 0;

      if (unresolvedAlerts.length > 0) {
        factors.push({
          name: "Active Health Alerts",
          score: alertScore,
          severity: alertScore >= 60 ? "critical" : alertScore >= 30 ? "high" : "moderate",
          description: `${unresolvedAlerts.length} unresolved alerts (${criticalAlerts} critical)`,
          recommendation: "Review and address active health alerts with your clinician.",
        });
      }

      // Overall risk
      const totalScore = factors.reduce((s, f) => s + f.score, 0);
      const overall = Math.round(totalScore / factors.length);

      setRiskFactors(factors.sort((a, b) => b.score - a.score));
      setOverallRisk(overall);
    } catch (error) {
      console.error("Error loading risk data:", error);
      toast({ title: "Error", description: "Failed to calculate risk score", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    loadRiskData();
  }, [loadRiskData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  const getOverallLabel = (score: number) => {
    if (score >= 60) return { label: "High Risk", color: "text-destructive", bg: "bg-destructive/10 border-destructive/20" };
    if (score >= 35) return { label: "Moderate Risk", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" };
    return { label: "Low Risk", color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10 border-green-500/20" };
  };

  const ol = getOverallLabel(overallRisk);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-destructive/15 text-destructive";
      case "high": return "bg-orange-500/15 text-orange-700 dark:text-orange-400";
      case "moderate": return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400";
      default: return "bg-green-500/15 text-green-700 dark:text-green-400";
    }
  };

  const getProgressColor = (score: number) => {
    if (score >= 60) return "[&>div]:bg-destructive";
    if (score >= 35) return "[&>div]:bg-yellow-500";
    return "[&>div]:bg-green-500";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          {viewMode === "clinician" ? "Patient Risk Assessment" : "Health Risk Assessment"}
        </h2>
        <p className="text-muted-foreground">Complication risk based on your recent health data</p>
      </div>

      {/* Overall Risk Score */}
      <Card className={`border ${ol.bg}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${ol.bg}`}>
                {overallRisk >= 60 ? (
                  <AlertTriangle className={`h-8 w-8 ${ol.color}`} />
                ) : overallRisk >= 35 ? (
                  <Eye className={`h-8 w-8 ${ol.color}`} />
                ) : (
                  <Shield className={`h-8 w-8 ${ol.color}`} />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overall Risk Level</p>
                <p className={`text-3xl font-bold ${ol.color}`}>{ol.label}</p>
                <p className="text-xs text-muted-foreground">Score: {overallRisk}/100</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Risk Factors</p>
              <p className="text-2xl font-bold">{riskFactors.filter((f) => f.score >= 35).length}</p>
              <p className="text-xs text-muted-foreground">of {riskFactors.length} need attention</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Risk Factors */}
      <div className="space-y-4">
        {riskFactors.map((factor) => (
          <Card key={factor.name}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{factor.name}</span>
                  <Badge className={getSeverityColor(factor.severity)}>{factor.severity}</Badge>
                </div>
                <span className="text-sm font-medium text-muted-foreground">{factor.score}/100</span>
              </div>
              <Progress value={factor.score} className={`h-2 mb-3 ${getProgressColor(factor.score)}`} />
              <p className="text-sm text-muted-foreground mb-2">{factor.description}</p>
              <div className="p-2 bg-muted/50 rounded text-sm">
                <span className="font-medium">💡 </span>
                {factor.recommendation}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Disclaimer */}
      <Card className="border-muted">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">
            <strong>Disclaimer:</strong> This risk assessment is based on available data and general guidelines.
            It is not a clinical diagnosis. Always consult your healthcare provider for medical decisions.
            Risk scores are calculated using the last 30 days of data and may not reflect your complete health picture.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
