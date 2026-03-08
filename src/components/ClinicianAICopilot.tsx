import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Users, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AskYvonne } from "./AskYvonne";
import { subDays } from "date-fns";

interface ClinicianAICopilotProps {
  doctorId: string;
}

interface PatientSummary {
  id: string;
  name: string;
  healthContext: any;
}

export const ClinicianAICopilot = ({ doctorId }: ClinicianAICopilotProps) => {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadPatients = useCallback(async () => {
    try {
      setLoading(true);
      const { data: mappings, error } = await supabase
        .from("doctor_patients")
        .select("patient_id")
        .eq("doctor_id", doctorId)
        .eq("status", "active");

      if (error) throw error;
      if (!mappings?.length) { setLoading(false); return; }

      const patientIds = mappings.map(m => m.patient_id);

      // Load profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", patientIds);

      const week = subDays(new Date(), 7).toISOString();
      const month = subDays(new Date(), 30).toISOString();

      const summaries: PatientSummary[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          const [glucoseRes, intakeRes, exerciseRes, mealsRes, rxRes, alertsRes] = await Promise.all([
            supabase.from("glucose_readings").select("glucose_value, test_time, created_at").eq("patient_id", profile.user_id).gte("created_at", month).order("created_at", { ascending: false }).limit(20),
            supabase.from("medication_intake").select("status").eq("patient_id", profile.user_id).gte("scheduled_time", week),
            supabase.from("exercise_logs").select("duration_minutes").eq("patient_id", profile.user_id).gte("date_time", week),
            supabase.from("meal_logs").select("id", { count: "exact", head: true }).eq("patient_id", profile.user_id).gte("date_time", week),
            supabase.from("prescriptions").select("drug_name, dosage, frequency").eq("patient_id", profile.user_id).eq("status", "active"),
            supabase.from("health_alerts").select("severity, alert_type, message").eq("patient_id", profile.user_id).eq("resolved", false),
          ]);

          const gValues = (glucoseRes.data || []).map(g => g.glucose_value);
          const avg = gValues.length > 0 ? Math.round(gValues.reduce((a, b) => a + b, 0) / gValues.length) : undefined;
          const inRange = gValues.filter(v => v >= 70 && v <= 180).length;
          const tir = gValues.length > 0 ? Math.round((inRange / gValues.length) * 100) : undefined;

          const intakeData = intakeRes.data || [];
          const taken = intakeData.filter(i => i.status === "taken").length;
          const adherence = intakeData.length > 0 ? Math.round((taken / intakeData.length) * 100) : undefined;

          const exerciseMin = (exerciseRes.data || []).reduce((s, e) => s + (e.duration_minutes || 0), 0);

          return {
            id: profile.user_id,
            name: profile.full_name,
            healthContext: {
              patientName: profile.full_name,
              recentGlucose: (glucoseRes.data || []).slice(0, 10).map(g => ({ value: g.glucose_value, time: g.created_at, testTime: g.test_time })),
              avgGlucose: avg,
              timeInRange: tir,
              estimatedA1C: avg ? ((avg + 46.7) / 28.7).toFixed(1) : undefined,
              medicationAdherence: adherence,
              activeMedications: (rxRes.data || []).map(p => `${p.drug_name} ${p.dosage} (${p.frequency})`),
              exerciseMinutes: exerciseMin,
              mealsThisWeek: mealsRes.count || 0,
              unresolvedAlerts: (alertsRes.data || []).map(a => `${a.severity}: ${a.alert_type} - ${a.message}`),
              glucoseReadingsCount: gValues.length,
              hypoEvents: gValues.filter(v => v < 70).length,
              hyperEvents: gValues.filter(v => v > 250).length,
            },
          };
        })
      );

      setPatients(summaries);
      if (summaries.length > 0) setSelectedPatient(summaries[0].id);
    } catch (error) {
      console.error("Error loading patients:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load patient data." });
    } finally {
      setLoading(false);
    }
  }, [doctorId, toast]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const selectedPatientData = patients.find(p => p.id === selectedPatient);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Clinical Copilot
          </h2>
          <p className="text-muted-foreground">AI-powered patient analysis and recommendations</p>
        </div>
      </div>

      {patients.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No patients assigned yet. Add patients to use the AI copilot.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Patient Selector + Quick Stats */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="flex-1">
                  <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedPatientData && (
                  <div className="flex flex-wrap gap-2">
                    {selectedPatientData.healthContext.avgGlucose && (
                      <Badge variant="outline">Avg: {selectedPatientData.healthContext.avgGlucose} mg/dL</Badge>
                    )}
                    {selectedPatientData.healthContext.timeInRange !== undefined && (
                      <Badge variant={selectedPatientData.healthContext.timeInRange < 50 ? "destructive" : "outline"}>
                        TIR: {selectedPatientData.healthContext.timeInRange}%
                      </Badge>
                    )}
                    {selectedPatientData.healthContext.medicationAdherence !== undefined && (
                      <Badge variant={selectedPatientData.healthContext.medicationAdherence < 70 ? "destructive" : "outline"}>
                        Adherence: {selectedPatientData.healthContext.medicationAdherence}%
                      </Badge>
                    )}
                    {selectedPatientData.healthContext.hypoEvents > 0 && (
                      <Badge variant="destructive">Hypos: {selectedPatientData.healthContext.hypoEvents}</Badge>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Chat */}
          {selectedPatientData && (
            <Card className="h-[60vh]">
              <div className="h-full">
                <AskYvonne
                  key={selectedPatient}
                  mode="clinician-copilot"
                  patientContext={selectedPatientData.healthContext}
                />
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
