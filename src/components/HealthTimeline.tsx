import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Droplet, Apple, Dumbbell, Pill, MessageSquare, Calendar, AlertTriangle, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";

interface TimelineEvent {
  id: string;
  type: "glucose" | "meal" | "exercise" | "medication" | "appointment" | "alert" | "message";
  title: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

interface HealthTimelineProps {
  userId: string;
}

const EVENT_CONFIG: Record<string, { icon: typeof Droplet; color: string; label: string }> = {
  glucose: { icon: Droplet, color: "text-blue-600", label: "Glucose" },
  meal: { icon: Apple, color: "text-green-600", label: "Nutrition" },
  exercise: { icon: Dumbbell, color: "text-orange-600", label: "Exercise" },
  medication: { icon: Pill, color: "text-purple-600", label: "Medication" },
  appointment: { icon: Calendar, color: "text-primary", label: "Appointment" },
  alert: { icon: AlertTriangle, color: "text-destructive", label: "Alert" },
  message: { icon: MessageSquare, color: "text-secondary", label: "Message" },
};

export const HealthTimeline = ({ userId }: HealthTimelineProps) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [daysBack, setDaysBack] = useState(7);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    loadTimeline();
  }, [userId, daysBack]);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const since = subDays(new Date(), daysBack).toISOString();
      const allEvents: TimelineEvent[] = [];

      const [glucoseRes, mealRes, exerciseRes, intakeRes, apptRes, alertRes] = await Promise.all([
        supabase.from("glucose_readings").select("id, glucose_value, test_time, notes, created_at").eq("patient_id", userId).gte("created_at", since).order("created_at", { ascending: false }).limit(100),
        supabase.from("meal_logs").select("id, description, meal_type, date_time, created_at").eq("patient_id", userId).gte("created_at", since).order("created_at", { ascending: false }).limit(100),
        supabase.from("exercise_logs").select("id, exercise_type, duration_minutes, intensity, date_time, created_at").eq("patient_id", userId).gte("created_at", since).order("created_at", { ascending: false }).limit(100),
        supabase.from("medication_intake").select("id, status, scheduled_time, taken_time, created_at").eq("patient_id", userId).gte("created_at", since).order("created_at", { ascending: false }).limit(100),
        supabase.from("appointments").select("id, start_time, status, notes, created_at").eq("patient_id", userId).gte("created_at", since).order("created_at", { ascending: false }).limit(50),
        supabase.from("health_alerts").select("id, message, severity, created_at").eq("patient_id", userId).gte("created_at", since).order("created_at", { ascending: false }).limit(50),
      ]);

      glucoseRes.data?.forEach((r: any) => allEvents.push({
        id: `glucose-${r.id}`, type: "glucose",
        title: `Glucose: ${r.glucose_value} mg/dL`,
        description: r.notes || `Recorded at ${r.test_time}`,
        timestamp: new Date(r.created_at),
      }));

      mealRes.data?.forEach((r: any) => allEvents.push({
        id: `meal-${r.id}`, type: "meal",
        title: `${r.meal_type || "Meal"}: ${r.description}`,
        description: `Logged at ${format(new Date(r.date_time), "h:mm a")}`,
        timestamp: new Date(r.created_at),
      }));

      exerciseRes.data?.forEach((r: any) => allEvents.push({
        id: `exercise-${r.id}`, type: "exercise",
        title: `${r.exercise_type} - ${r.duration_minutes} min`,
        description: `${r.intensity || "moderate"} intensity`,
        timestamp: new Date(r.created_at),
      }));

      intakeRes.data?.forEach((r: any) => allEvents.push({
        id: `med-${r.id}`, type: "medication",
        title: `Medication ${r.status === "taken" ? "taken" : r.status}`,
        description: r.taken_time ? `Taken at ${format(new Date(r.taken_time), "h:mm a")}` : `Scheduled ${format(new Date(r.scheduled_time), "h:mm a")}`,
        timestamp: new Date(r.created_at),
      }));

      apptRes.data?.forEach((r: any) => allEvents.push({
        id: `appt-${r.id}`, type: "appointment",
        title: `Appointment - ${r.status}`,
        description: r.notes || format(new Date(r.start_time), "MMM d, h:mm a"),
        timestamp: new Date(r.created_at),
      }));

      alertRes.data?.forEach((r: any) => allEvents.push({
        id: `alert-${r.id}`, type: "alert",
        title: `Health Alert (${r.severity})`,
        description: r.message,
        timestamp: new Date(r.created_at),
      }));

      allEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setEvents(allEvents);
    } catch (error) {
      console.error("Error loading timeline:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = filter === "all" ? events : events.filter((e) => e.type === filter);
  const displayEvents = showMore ? filteredEvents : filteredEvents.slice(0, 20);

  // Group by date
  const grouped = displayEvents.reduce<Record<string, TimelineEvent[]>>((acc, event) => {
    const key = format(event.timestamp, "yyyy-MM-dd");
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            Health Timeline
          </h2>
          <p className="text-muted-foreground">A chronological view of all your health activities.</p>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="glucose">Glucose</SelectItem>
              <SelectItem value="meal">Meals</SelectItem>
              <SelectItem value="exercise">Exercise</SelectItem>
              <SelectItem value="medication">Medication</SelectItem>
              <SelectItem value="appointment">Appointments</SelectItem>
              <SelectItem value="alert">Alerts</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(daysBack)} onValueChange={(v) => setDaysBack(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 days</SelectItem>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="14">14 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No health events recorded in this period.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateKey, dayEvents]) => {
            const isToday = dateKey === format(new Date(), "yyyy-MM-dd");
            return (
              <div key={dateKey}>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant={isToday ? "default" : "outline"}>
                    {isToday ? "Today" : format(new Date(dateKey), "EEE, MMM d")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{dayEvents.length} events</span>
                </div>
                <div className="space-y-2 ml-2 border-l-2 border-border pl-4">
                  {dayEvents.map((event) => {
                    const config = EVENT_CONFIG[event.type];
                    const Icon = config.icon;
                    return (
                      <div key={event.id} className="flex items-start gap-3 py-2">
                        <div className={`mt-0.5 ${config.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{event.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{event.description}</p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(event.timestamp, "h:mm a")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredEvents.length > 20 && !showMore && (
            <Button variant="outline" className="w-full" onClick={() => setShowMore(true)}>
              <ChevronDown className="h-4 w-4 mr-2" />
              Show {filteredEvents.length - 20} more events
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
