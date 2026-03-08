import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Pill, Clock, CheckCircle, AlertTriangle, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, startOfWeek, endOfWeek } from "date-fns";

interface Prescription {
  id: string;
  drug_name: string;
  dosage: string;
  frequency: string;
  instructions: string | null;
  start_date: string;
  end_date: string | null;
  status: string | null;
  clinician_id: string | null;
}

interface MedicationIntake {
  id: string;
  prescription_id: string;
  scheduled_time: string;
  taken_time: string | null;
  status: string | null;
  note: string | null;
}

interface PatientMedicationTrackingProps {
  userId: string;
}

export const PatientMedicationTracking = ({ userId }: PatientMedicationTrackingProps) => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [intakeLogs, setIntakeLogs] = useState<MedicationIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const [prescRes, intakeRes] = await Promise.all([
        supabase
          .from('prescriptions')
          .select('*')
          .eq('patient_id', userId)
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
        supabase
          .from('medication_intake')
          .select('*')
          .eq('patient_id', userId)
          .gte('scheduled_time', startOfWeek(new Date()).toISOString())
          .lte('scheduled_time', endOfWeek(new Date()).toISOString())
          .order('scheduled_time', { ascending: false })
      ]);

      if (prescRes.error) throw prescRes.error;
      if (intakeRes.error) throw intakeRes.error;

      setPrescriptions(prescRes.data || []);
      setIntakeLogs(intakeRes.data || []);
    } catch (error) {
      console.error('Error loading medication data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('patient-meds')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions', filter: `patient_id=eq.${userId}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medication_intake', filter: `patient_id=eq.${userId}` }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const markAsTaken = async (prescriptionId: string) => {
    try {
      const { error } = await supabase
        .from('medication_intake')
        .insert({
          patient_id: userId,
          prescription_id: prescriptionId,
          scheduled_time: new Date().toISOString(),
          taken_time: new Date().toISOString(),
          status: 'taken'
        });

      if (error) throw error;

      toast({ title: "Medication logged", description: "Marked as taken successfully." });
      loadData();
    } catch (error: any) {
      console.error('Error marking medication:', error);
      toast({ title: "Error", description: error.message || "Failed to log medication", variant: "destructive" });
    }
  };

  const getTodayIntakes = (prescriptionId: string) => {
    return intakeLogs.filter(
      (log) => log.prescription_id === prescriptionId && isToday(new Date(log.scheduled_time)) && log.status === 'taken'
    );
  };

  const getWeeklyAdherence = (prescriptionId: string) => {
    const weekLogs = intakeLogs.filter((log) => log.prescription_id === prescriptionId && log.status === 'taken');
    const expectedPerWeek = 7; // simplified
    return Math.min(Math.round((weekLogs.length / expectedPerWeek) * 100), 100);
  };

  const totalTakenToday = prescriptions.reduce((acc, p) => acc + getTodayIntakes(p.id).length, 0);
  const totalExpectedToday = prescriptions.length; // simplified: 1 dose per med per day

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Medication Tracking</h1>
        <p className="text-muted-foreground">Manage your prescriptions and track adherence</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Adherence</p>
                <p className="text-2xl font-bold text-foreground">
                  {totalExpectedToday > 0 ? Math.round((totalTakenToday / totalExpectedToday) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">{totalTakenToday} of {totalExpectedToday} taken</p>
              </div>
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Prescriptions</p>
                <p className="text-2xl font-bold text-foreground">{prescriptions.length}</p>
                <p className="text-xs text-muted-foreground">From your clinician</p>
              </div>
              <Pill className="h-8 w-8 text-secondary-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Today</p>
                <p className="text-2xl font-bold text-foreground">{totalExpectedToday - totalTakenToday}</p>
                <p className="text-xs text-muted-foreground">Medications remaining</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Medications List */}
      {prescriptions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Pill className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Active Prescriptions</h3>
            <p className="text-muted-foreground">Your clinician hasn't prescribed any medications yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((prescription) => {
            const todayIntakes = getTodayIntakes(prescription.id);
            const takenToday = todayIntakes.length > 0;
            const weeklyAdherence = getWeeklyAdherence(prescription.id);

            return (
              <Card key={prescription.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-lg text-foreground">{prescription.drug_name}</h3>
                        <Badge variant="outline">{prescription.dosage}</Badge>
                        <Badge variant="secondary">{prescription.frequency}</Badge>
                        {takenToday ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" /> Taken Today
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Not Taken
                          </Badge>
                        )}
                      </div>

                      {prescription.instructions && (
                        <p className="text-sm text-muted-foreground">{prescription.instructions}</p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Started: {format(new Date(prescription.start_date), 'MMM d, yyyy')}
                        </span>
                        {prescription.end_date && (
                          <span>Ends: {format(new Date(prescription.end_date), 'MMM d, yyyy')}</span>
                        )}
                      </div>

                      {/* Weekly Adherence */}
                      <div className="space-y-1 max-w-xs">
                        <div className="flex justify-between text-sm">
                          <span>Weekly Adherence</span>
                          <span>{weeklyAdherence}%</span>
                        </div>
                        <Progress value={weeklyAdherence} className="h-2" />
                      </div>
                    </div>

                    {!takenToday && (
                      <Button onClick={() => markAsTaken(prescription.id)} className="shrink-0">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Taken
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reference Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Medication Tips</CardTitle>
          <CardDescription>Important reminders for managing your medications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-primary/5 rounded-lg border">
              <h4 className="font-medium text-foreground mb-1">Take on Time</h4>
              <p className="text-sm text-muted-foreground">Set reminders to take your medications at the same time each day.</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg border">
              <h4 className="font-medium text-foreground mb-1">Don't Skip Doses</h4>
              <p className="text-sm text-muted-foreground">If you miss a dose, take it as soon as you remember unless it's close to the next dose.</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg border">
              <h4 className="font-medium text-foreground mb-1">Report Side Effects</h4>
              <p className="text-sm text-muted-foreground">Message your clinician if you experience any unusual side effects.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
