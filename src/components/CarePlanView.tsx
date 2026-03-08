import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ClipboardList, Target, CheckCircle, Clock, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface CarePlan {
  id: string;
  title: string;
  description: string | null;
  status: string;
  start_date: string;
  end_date: string | null;
  clinician_name?: string;
}

interface Goal {
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

interface CarePlanViewProps {
  userId: string;
}

const GOAL_TYPE_LABELS: Record<string, string> = {
  glucose_target: "Glucose",
  exercise: "Exercise",
  nutrition: "Nutrition",
  medication: "Medication",
  weight: "Weight",
  general: "General",
};

export const CarePlanView = ({ userId }: CarePlanViewProps) => {
  const [plans, setPlans] = useState<CarePlan[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCarePlans();
  }, [userId]);

  const loadCarePlans = async () => {
    try {
      const { data: plansData } = await supabase
        .from("care_plans")
        .select("*")
        .eq("patient_id", userId)
        .order("created_at", { ascending: false });

      if (plansData && plansData.length > 0) {
        // Get clinician names
        const clinicianIds = [...new Set(plansData.map((p: any) => p.clinician_id))];
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", clinicianIds);
        const nameMap = new Map(profiles?.map((p: any) => [p.user_id, p.full_name]) || []);

        const enrichedPlans = plansData.map((p: any) => ({
          ...p,
          clinician_name: nameMap.get(p.clinician_id) || "Your clinician",
        }));
        setPlans(enrichedPlans);

        // Load all goals for all plans
        const planIds = plansData.map((p: any) => p.id);
        const { data: goalsData } = await supabase
          .from("care_plan_goals")
          .select("*")
          .in("care_plan_id", planIds)
          .order("created_at", { ascending: true });
        setGoals(goalsData || []);
      }
    } catch (error) {
      console.error("Error loading care plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGoalProgress = async (goalId: string, currentValue: string) => {
    await supabase.from("care_plan_goals").update({ current_value: currentValue }).eq("id", goalId);
    loadCarePlans();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const activePlans = plans.filter((p) => p.status === "active");
  const completedPlans = plans.filter((p) => p.status === "completed");

  if (plans.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <h3 className="font-semibold text-lg mb-1">No Care Plan Yet</h3>
          <p>Your clinician will create a personalized care plan with health goals for you.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          My Care Plan
        </h2>
        <p className="text-muted-foreground">Track your health goals set by your clinician.</p>
      </div>

      {activePlans.map((plan) => {
        const planGoals = goals.filter((g) => g.care_plan_id === plan.id);
        const completed = planGoals.filter((g) => g.status === "completed").length;
        const progressPct = planGoals.length > 0 ? Math.round((completed / planGoals.length) * 100) : 0;

        return (
          <Card key={plan.id} className="border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{plan.title}</CardTitle>
                  <CardDescription>
                    By Dr. {plan.clinician_name} • Started {format(new Date(plan.start_date), "MMM d, yyyy")}
                    {plan.end_date && ` • Ends ${format(new Date(plan.end_date), "MMM d, yyyy")}`}
                  </CardDescription>
                </div>
                <Badge variant="default">Active</Badge>
              </div>
              {plan.description && <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>}
              {planGoals.length > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Overall Progress</span>
                    <span className="text-muted-foreground">{completed}/{planGoals.length} goals</span>
                  </div>
                  <Progress value={progressPct} className="h-2" />
                </div>
              )}
            </CardHeader>
            <CardContent>
              {planGoals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Goals will appear here once your clinician adds them.</p>
              ) : (
                <div className="space-y-3">
                  {planGoals.map((goal) => (
                    <div key={goal.id} className={`flex items-start gap-3 p-3 rounded-lg border ${goal.status === "completed" ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800" : "bg-muted/50"}`}>
                      {goal.status === "completed" ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                      ) : (
                        <Target className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className={`font-medium text-sm ${goal.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{goal.title}</p>
                        {goal.description && <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>}
                        <div className="flex gap-2 mt-1.5 flex-wrap">
                          <Badge variant="outline" className="text-xs">{GOAL_TYPE_LABELS[goal.goal_type] || goal.goal_type}</Badge>
                          {goal.target_value && <Badge variant="secondary" className="text-xs">Target: {goal.target_value}</Badge>}
                          {goal.current_value && <Badge variant="outline" className="text-xs">Current: {goal.current_value}</Badge>}
                          {goal.due_date && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Due {format(new Date(goal.due_date), "MMM d")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {completedPlans.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-muted-foreground">Completed Plans</h3>
          {completedPlans.map((plan) => (
            <Card key={plan.id} className="opacity-75">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{plan.title}</CardTitle>
                  <Badge variant="secondary">Completed</Badge>
                </div>
                <CardDescription>By Dr. {plan.clinician_name}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
