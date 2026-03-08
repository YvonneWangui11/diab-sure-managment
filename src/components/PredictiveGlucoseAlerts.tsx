import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bell, TrendingUp, Shield, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface PredictiveGlucoseAlertsProps {
  userId: string;
}

interface HealthContext {
  recentGlucose?: { value: number; time: string; testTime: string }[];
  avgGlucose?: number;
  timeInRange?: number;
  medicationAdherence?: number;
  activeMedications?: string[];
  exerciseMinutes?: number;
  mealsToday?: number;
  patterns?: string[];
}

export const PredictiveGlucoseAlerts = ({ userId }: PredictiveGlucoseAlertsProps) => {
  const [prediction, setPrediction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [healthContext, setHealthContext] = useState<HealthContext | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  const loadContext = useCallback(async () => {
    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const week = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [glucoseRes, rxRes, intakeRes, exerciseRes, mealsRes] = await Promise.all([
        supabase.from("glucose_readings").select("glucose_value, test_time, created_at").eq("patient_id", userId).gte("created_at", week).order("created_at", { ascending: false }).limit(20),
        supabase.from("prescriptions").select("drug_name").eq("patient_id", userId).eq("status", "active"),
        supabase.from("medication_intake").select("status").eq("patient_id", userId).gte("scheduled_time", week),
        supabase.from("exercise_logs").select("duration_minutes").eq("patient_id", userId).gte("date_time", week),
        supabase.from("meal_logs").select("id", { count: "exact", head: true }).eq("patient_id", userId).gte("date_time", todayStart),
      ]);

      const glucoseData = glucoseRes.data || [];
      const values = glucoseData.map(g => g.glucose_value);
      const avg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : undefined;
      const inRange = values.filter(v => v >= 70 && v <= 180).length;
      const tir = values.length > 0 ? Math.round((inRange / values.length) * 100) : undefined;

      const intakeData = intakeRes.data || [];
      const taken = intakeData.filter(i => i.status === "taken").length;
      const adherence = intakeData.length > 0 ? Math.round((taken / intakeData.length) * 100) : undefined;

      const exerciseMin = (exerciseRes.data || []).reduce((s, e) => s + (e.duration_minutes || 0), 0);

      const patterns: string[] = [];
      const fastingReadings = glucoseData.filter(g => g.test_time === "fasting");
      const highFasting = fastingReadings.filter(g => g.glucose_value > 130);
      if (fastingReadings.length >= 3 && highFasting.length / fastingReadings.length > 0.5) {
        patterns.push("High fasting glucose pattern");
      }
      if (values.filter(v => v < 70).length >= 2) {
        patterns.push("Recurrent hypoglycemia");
      }
      if (values.filter(v => v > 250).length >= 2) {
        patterns.push("Recurrent severe hyperglycemia");
      }

      const ctx: HealthContext = {
        recentGlucose: glucoseData.slice(0, 10).map(g => ({ value: g.glucose_value, time: g.created_at, testTime: g.test_time })),
        avgGlucose: avg,
        timeInRange: tir,
        medicationAdherence: adherence,
        activeMedications: (rxRes.data || []).map(p => p.drug_name),
        exerciseMinutes: exerciseMin,
        mealsToday: mealsRes.count || 0,
        patterns: patterns.length > 0 ? patterns : undefined,
      };

      setHealthContext(ctx);
      return ctx;
    } catch (e) {
      console.error("Failed to load context:", e);
      return null;
    }
  }, [userId]);

  const generatePrediction = useCallback(async (ctx?: HealthContext | null) => {
    const context = ctx || healthContext;
    if (!context?.recentGlucose?.length) {
      setPrediction("Not enough glucose data to generate predictions. Log at least a few readings first.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/ask-yvonne`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Based on my recent health data, generate predictive glucose alerts for the next 12-24 hours. What should I watch out for and what can I do to prevent issues?" }],
          healthContext: context,
          mode: "predictive",
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to get prediction");
      }

      // Stream response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, idx);
          textBuffer = textBuffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              content += delta;
              setPrediction(content);
            }
          } catch { /* partial */ }
        }
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error("Prediction error:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to generate predictions." });
    } finally {
      setLoading(false);
    }
  }, [healthContext, toast]);

  useEffect(() => {
    const init = async () => {
      const ctx = await loadContext();
      if (ctx) await generatePrediction(ctx);
    };
    init();
  }, []);

  const refresh = async () => {
    const ctx = await loadContext();
    if (ctx) await generatePrediction(ctx);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Predictive Glucose Alerts
          </h2>
          <p className="text-muted-foreground">AI-powered predictions based on your patterns</p>
        </div>
        <Button onClick={refresh} disabled={loading} variant="outline">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {/* Context Summary */}
      {healthContext && (
        <div className="flex flex-wrap gap-2">
          {healthContext.avgGlucose && (
            <Badge variant="outline">Avg: {healthContext.avgGlucose} mg/dL</Badge>
          )}
          {healthContext.timeInRange !== undefined && (
            <Badge variant="outline">TIR: {healthContext.timeInRange}%</Badge>
          )}
          {healthContext.medicationAdherence !== undefined && (
            <Badge variant="outline">Adherence: {healthContext.medicationAdherence}%</Badge>
          )}
          {healthContext.exerciseMinutes !== undefined && (
            <Badge variant="outline">Exercise: {healthContext.exerciseMinutes}min this week</Badge>
          )}
          {healthContext.patterns?.map((p, i) => (
            <Badge key={i} variant="destructive">{p}</Badge>
          ))}
        </div>
      )}

      {/* Prediction */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Current Predictions
          </CardTitle>
          {lastUpdated && (
            <CardDescription>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {loading && !prediction ? (
            <div className="flex items-center gap-3 p-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-muted-foreground">Analyzing your patterns...</p>
            </div>
          ) : prediction ? (
            <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-3 [&>ul]:mb-3 [&>h2]:text-base [&>h3]:text-sm">
              <ReactMarkdown>{prediction}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-muted-foreground">No predictions available. Log more health data to enable predictions.</p>
          )}
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Card className="border-muted">
        <CardContent className="p-4 flex gap-3">
          <Shield className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <strong>Disclaimer:</strong> These predictions are AI-generated estimates based on your logged data patterns.
            They are not medical diagnoses or guarantees. Always follow your healthcare provider's guidance and
            respond to actual symptoms, not predictions alone.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
