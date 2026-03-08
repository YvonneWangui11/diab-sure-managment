import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Plus, Target, CheckCircle, Clock, Trash2, Edit, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { LoadingSpinner } from "./LoadingSpinner";

interface CarePlan {
  id: string;
  patient_id: string;
  clinician_id: string;
  title: string;
  description: string | null;
  status: string;
  start_date: string;
  end_date: string | null;
  created_at: string;
  patient_name?: string;
}

interface CarePlanGoal {
  id: string;
  care_plan_id: string;
  title: string;
  description: string | null;
  target_value: string | null;
  current_value: string | null;
  goal_type: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
}

interface CarePlanManagerProps {
  clinicianId: string;
}

const GOAL_TYPES = [
  { value: "glucose_target", label: "Glucose Target" },
  { value: "exercise", label: "Exercise Goal" },
  { value: "nutrition", label: "Nutrition Goal" },
  { value: "medication", label: "Medication Adherence" },
  { value: "weight", label: "Weight Goal" },
  { value: "general", label: "General Health" },
];

export const CarePlanManager = ({ clinicianId }: CarePlanManagerProps) => {
  const [plans, setPlans] = useState<CarePlan[]>([]);
  const [goals, setGoals] = useState<Record<string, CarePlanGoal[]>>({});
  const [patients, setPatients] = useState<{ user_id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState<string | null>(null);
  const { toast } = useToast();

  // Form state
  const [planForm, setPlanForm] = useState({ patientId: "", title: "", description: "", endDate: "" });
  const [goalForm, setGoalForm] = useState({ title: "", description: "", targetValue: "", goalType: "general", dueDate: "" });

  useEffect(() => {
    loadData();
  }, [clinicianId]);

  const loadData = async () => {
    try {
      const [plansRes, patientsRes] = await Promise.all([
        supabase.from("care_plans").select("*").eq("clinician_id", clinicianId).order("created_at", { ascending: false }),
        supabase.from("doctor_patients").select("patient_id").eq("doctor_id", clinicianId).eq("status", "active"),
      ]);

      if (plansRes.data) {
        const patientIds = [...new Set(plansRes.data.map((p: any) => p.patient_id))];
        let profileMap = new Map<string, string>();
        if (patientIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", patientIds);
          profileMap = new Map(profiles?.map((p: any) => [p.user_id, p.full_name]) || []);
        }
        setPlans(plansRes.data.map((p: any) => ({ ...p, patient_name: profileMap.get(p.patient_id) || "Unknown" })));
      }

      if (patientsRes.data) {
        const ids = patientsRes.data.map((p: any) => p.patient_id);
        if (ids.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
          setPatients(profiles || []);
        }
      }
    } catch (error) {
      console.error("Error loading care plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadGoals = async (planId: string) => {
    const { data } = await supabase.from("care_plan_goals").select("*").eq("care_plan_id", planId).order("created_at", { ascending: true });
    if (data) setGoals((prev) => ({ ...prev, [planId]: data }));
  };

  const handleExpandPlan = (planId: string) => {
    if (expandedPlan === planId) {
      setExpandedPlan(null);
    } else {
      setExpandedPlan(planId);
      if (!goals[planId]) loadGoals(planId);
    }
  };

  const handleCreatePlan = async () => {
    if (!planForm.patientId || !planForm.title) {
      toast({ title: "Missing fields", description: "Patient and title are required.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.from("care_plans").insert({
        patient_id: planForm.patientId,
        clinician_id: clinicianId,
        title: planForm.title,
        description: planForm.description || null,
        end_date: planForm.endDate || null,
      });
      if (error) throw error;
      toast({ title: "Care plan created" });
      setPlanForm({ patientId: "", title: "", description: "", endDate: "" });
      setShowCreatePlan(false);
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleAddGoal = async (planId: string) => {
    if (!goalForm.title) {
      toast({ title: "Goal title required", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.from("care_plan_goals").insert({
        care_plan_id: planId,
        title: goalForm.title,
        description: goalForm.description || null,
        target_value: goalForm.targetValue || null,
        goal_type: goalForm.goalType,
        due_date: goalForm.dueDate || null,
      });
      if (error) throw error;
      toast({ title: "Goal added" });
      setGoalForm({ title: "", description: "", targetValue: "", goalType: "general", dueDate: "" });
      setShowAddGoal(null);
      loadGoals(planId);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleGoalStatus = async (goalId: string, planId: string, status: string) => {
    const completedAt = status === "completed" ? new Date().toISOString() : null;
    await supabase.from("care_plan_goals").update({ status, completed_at: completedAt }).eq("id", goalId);
    loadGoals(planId);
  };

  const handleDeleteGoal = async (goalId: string, planId: string) => {
    await supabase.from("care_plan_goals").delete().eq("id", goalId);
    loadGoals(planId);
  };

  const handlePlanStatus = async (planId: string, status: string) => {
    await supabase.from("care_plans").update({ status }).eq("id", planId);
    loadData();
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      active: { variant: "default", label: "Active" },
      completed: { variant: "secondary", label: "Completed" },
      paused: { variant: "outline", label: "Paused" },
      in_progress: { variant: "default", label: "In Progress" },
      not_started: { variant: "outline", label: "Not Started" },
    };
    const cfg = map[status] || { variant: "outline" as const, label: status };
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading care plans..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Care Plans
          </h2>
          <p className="text-muted-foreground">Create and manage structured care plans for your patients.</p>
        </div>
        <Dialog open={showCreatePlan} onOpenChange={setShowCreatePlan}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Care Plan</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Care Plan</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Patient</Label>
                <Select value={planForm.patientId} onValueChange={(v) => setPlanForm((p) => ({ ...p, patientId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input placeholder="e.g., Diabetes Management Plan" value={planForm.title} onChange={(e) => setPlanForm((p) => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Describe the care plan goals and approach..." value={planForm.description} onChange={(e) => setPlanForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>End Date (optional)</Label>
                <Input type="date" value={planForm.endDate} onChange={(e) => setPlanForm((p) => ({ ...p, endDate: e.target.value }))} />
              </div>
              <Button onClick={handleCreatePlan} className="w-full">Create Care Plan</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No care plans yet. Create one to set structured goals for your patients.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => {
            const isExpanded = expandedPlan === plan.id;
            const planGoals = goals[plan.id] || [];
            const completed = planGoals.filter((g) => g.status === "completed").length;

            return (
              <Card key={plan.id}>
                <CardHeader className="cursor-pointer" onClick={() => handleExpandPlan(plan.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      <div>
                        <CardTitle className="text-lg">{plan.title}</CardTitle>
                        <CardDescription>Patient: {plan.patient_name} • Started {format(new Date(plan.start_date), "MMM d, yyyy")}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {planGoals.length > 0 && (
                        <Badge variant="outline" className="text-xs">{completed}/{planGoals.length} goals</Badge>
                      )}
                      {getStatusBadge(plan.status)}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-4">
                    {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}

                    <div className="flex gap-2">
                      {plan.status === "active" && (
                        <>
                          <Dialog open={showAddGoal === plan.id} onOpenChange={(o) => setShowAddGoal(o ? plan.id : null)}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" />Add Goal</Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader><DialogTitle>Add Goal</DialogTitle></DialogHeader>
                              <div className="space-y-4 mt-2">
                                <div className="space-y-2">
                                  <Label>Goal Title</Label>
                                  <Input placeholder="e.g., Maintain fasting glucose below 130 mg/dL" value={goalForm.title} onChange={(e) => setGoalForm((g) => ({ ...g, title: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                  <Label>Type</Label>
                                  <Select value={goalForm.goalType} onValueChange={(v) => setGoalForm((g) => ({ ...g, goalType: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {GOAL_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Target Value</Label>
                                  <Input placeholder="e.g., < 130 mg/dL" value={goalForm.targetValue} onChange={(e) => setGoalForm((g) => ({ ...g, targetValue: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                  <Label>Description</Label>
                                  <Textarea value={goalForm.description} onChange={(e) => setGoalForm((g) => ({ ...g, description: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                  <Label>Due Date (optional)</Label>
                                  <Input type="date" value={goalForm.dueDate} onChange={(e) => setGoalForm((g) => ({ ...g, dueDate: e.target.value }))} />
                                </div>
                                <Button onClick={() => handleAddGoal(plan.id)} className="w-full">Add Goal</Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button size="sm" variant="outline" onClick={() => handlePlanStatus(plan.id, "completed")}>
                            <CheckCircle className="h-3 w-3 mr-1" />Complete Plan
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handlePlanStatus(plan.id, "paused")}>Pause</Button>
                        </>
                      )}
                      {plan.status === "paused" && (
                        <Button size="sm" variant="outline" onClick={() => handlePlanStatus(plan.id, "active")}>Resume</Button>
                      )}
                    </div>

                    {planGoals.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No goals added yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {planGoals.map((goal) => (
                          <div key={goal.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                            <div className="mt-0.5">
                              {goal.status === "completed" ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <Target className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium text-sm ${goal.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{goal.title}</p>
                              {goal.description && <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>}
                              <div className="flex gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {GOAL_TYPES.find((t) => t.value === goal.goal_type)?.label || goal.goal_type}
                                </Badge>
                                {goal.target_value && <Badge variant="secondary" className="text-xs">Target: {goal.target_value}</Badge>}
                                {goal.due_date && <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1" />Due {format(new Date(goal.due_date), "MMM d")}</Badge>}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {goal.status !== "completed" && (
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleGoalStatus(goal.id, plan.id, "completed")} title="Mark complete">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteGoal(goal.id, plan.id)} title="Delete">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
