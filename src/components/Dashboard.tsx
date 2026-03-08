import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Heart, Pill, Apple, Activity, Calendar, TrendingUp,
  MessageSquare, BookOpen, BarChart3, FileText, Shield, Utensils, Dumbbell
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AnnouncementBanner } from "./AnnouncementBanner";

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

export const Dashboard = ({ onNavigate }: DashboardProps) => {
  const [data, setData] = useState({
    fullName: '',
    latestGlucose: null as number | null,
    glucoseCount: 0,
    exerciseMin: 0,
    mealsToday: 0,
    nextAppt: null as string | null,
    unread: 0,
    activeRx: 0,
    takenToday: 0,
    userRole: 'patient',
  });
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const [profile, roles, glucose, glucoseCount, exercise, meals, appt, msgs, rx, intake] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', user.id).limit(1).maybeSingle(),
        supabase.from('glucose_readings').select('glucose_value').eq('patient_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('glucose_readings').select('*', { count: 'exact', head: true }).eq('patient_id', user.id),
        supabase.from('exercise_logs').select('duration_minutes').eq('patient_id', user.id).gte('date_time', todayStart).lt('date_time', todayEnd),
        supabase.from('meal_logs').select('*', { count: 'exact', head: true }).eq('patient_id', user.id).gte('date_time', todayStart).lt('date_time', todayEnd),
        supabase.from('appointments').select('start_time').eq('patient_id', user.id).eq('status', 'scheduled').gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(1).maybeSingle(),
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('to_patient_id', user.id).is('read_at', null),
        supabase.from('prescriptions').select('id', { count: 'exact' }).eq('patient_id', user.id).eq('status', 'active'),
        supabase.from('medication_intake').select('id', { count: 'exact' }).eq('patient_id', user.id).eq('status', 'taken').gte('scheduled_time', todayStart).lt('scheduled_time', todayEnd),
      ]);

      let nextApptStr: string | null = null;
      if (appt.data) {
        const d = new Date(appt.data.start_time);
        const isToday = d.toDateString() === today.toDateString();
        const tmrw = new Date(today); tmrw.setDate(tmrw.getDate() + 1);
        const isTmrw = d.toDateString() === tmrw.toDateString();
        const time = d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
        nextApptStr = isToday ? `Today ${time}` : isTmrw ? `Tomorrow ${time}` : d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
      }

      setData({
        fullName: profile.data?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        latestGlucose: glucose.data?.glucose_value ?? null,
        glucoseCount: glucoseCount.count || 0,
        exerciseMin: exercise.data?.reduce((s, e) => s + (e.duration_minutes || 0), 0) || 0,
        mealsToday: meals.count || 0,
        nextAppt: nextApptStr,
        unread: msgs.count || 0,
        activeRx: rx.count || 0,
        takenToday: intake.count || 0,
        userRole: roles.data?.role || 'patient',
      });
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced reload for realtime events
  const debouncedReload = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadData(), 2000);
  }, [loadData]);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('patient-dash')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'glucose_readings' }, debouncedReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exercise_logs' }, debouncedReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_logs' }, debouncedReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, debouncedReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions' }, debouncedReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medication_intake' }, debouncedReload)
      .subscribe();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [loadData, debouncedReload]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  const { fullName, latestGlucose, glucoseCount, exerciseMin, mealsToday, nextAppt, unread, activeRx, takenToday, userRole } = data;
  const firstName = fullName.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const glucoseStatus = !latestGlucose
    ? { label: 'No data', color: 'text-muted-foreground' }
    : latestGlucose < 70 ? { label: 'Low', color: 'text-destructive' }
    : latestGlucose <= 140 ? { label: 'Normal', color: 'text-green-600 dark:text-green-400' }
    : latestGlucose <= 200 ? { label: 'Elevated', color: 'text-yellow-600 dark:text-yellow-400' }
    : { label: 'High', color: 'text-destructive' };

  const medCompliance = activeRx > 0 ? Math.round((takenToday / activeRx) * 100) : 0;

  return (
    <div className="space-y-6">
      <AnnouncementBanner userRole={userRole} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{greeting}, {firstName}!</h1>
          <p className="text-muted-foreground">Here's your health overview for today.</p>
        </div>
        {latestGlucose && (
          <Badge variant="outline" className={`${glucoseStatus.color} border-current`}>
            <Heart className="h-4 w-4 mr-1" />
            Glucose: {glucoseStatus.label}
          </Badge>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50" onClick={() => onNavigate?.('glucose')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Heart className="h-5 w-5 text-primary" />
              <span className={`text-xs font-medium ${glucoseStatus.color}`}>{glucoseStatus.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{latestGlucose ?? '--'}</p>
            <p className="text-xs text-muted-foreground">{latestGlucose ? 'mg/dL • Last reading' : 'Log your first reading'}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50" onClick={() => onNavigate?.('medications')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Pill className="h-5 w-5 text-primary" />
              <span className={`text-xs font-medium ${medCompliance >= 80 ? 'text-green-600 dark:text-green-400' : medCompliance >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-destructive'}`}>
                {medCompliance}%
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">{takenToday}/{activeRx}</p>
            <p className="text-xs text-muted-foreground">Doses taken today</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50" onClick={() => onNavigate?.('exercise')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="h-5 w-5 text-primary" />
              <span className={`text-xs font-medium ${exerciseMin >= 30 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                {exerciseMin >= 30 ? '✓ Goal met' : `${Math.max(0, 30 - exerciseMin)}m left`}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">{exerciseMin > 0 ? `${exerciseMin}m` : '--'}</p>
            <p className="text-xs text-muted-foreground">Exercise today</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50" onClick={() => onNavigate?.('appointments')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <p className="text-lg font-bold text-foreground truncate">{nextAppt || 'None'}</p>
            <p className="text-xs text-muted-foreground">Next appointment</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                Your Health Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-sm font-medium text-muted-foreground">Glucose Readings</p>
                  <p className="text-xl font-bold">{glucoseCount}</p>
                  <p className="text-xs text-muted-foreground">Total logged</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/5 border border-secondary/10">
                  <p className="text-sm font-medium text-muted-foreground">Meals Today</p>
                  <p className="text-xl font-bold">{mealsToday}</p>
                  <p className="text-xs text-muted-foreground">Logged today</p>
                </div>
                <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
                  <p className="text-sm font-medium text-muted-foreground">Exercise</p>
                  <p className="text-xl font-bold">{exerciseMin}m</p>
                  <p className="text-xs text-muted-foreground">Today's total</p>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-sm font-medium text-muted-foreground">Med Adherence</p>
                  <p className="text-xl font-bold">{medCompliance}%</p>
                  <p className="text-xs text-muted-foreground">Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="default" onClick={() => onNavigate?.('glucose')}>
                <Heart className="h-4 w-4 mr-2" /> Log Glucose Reading
              </Button>
              <Button className="w-full justify-start" variant="secondary" onClick={() => onNavigate?.('nutrition')}>
                <Apple className="h-4 w-4 mr-2" /> Log a Meal
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => onNavigate?.('exercise')}>
                <Activity className="h-4 w-4 mr-2" /> Log Exercise
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => onNavigate?.('medications')}>
                <Pill className="h-4 w-4 mr-2" /> Track Medications
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => onNavigate?.('messages')}>
                <MessageSquare className="h-4 w-4 mr-2" /> Messages {unread > 0 && <Badge variant="destructive" className="ml-auto text-xs">{unread}</Badge>}
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => onNavigate?.('progress')}>
                <BarChart3 className="h-4 w-4 mr-2" /> View Progress
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => onNavigate?.('education')}>
                <BookOpen className="h-4 w-4 mr-2" /> Education Hub
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Today's Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Medication</span>
                  <span className="text-sm text-muted-foreground">{medCompliance}%</span>
                </div>
                <Progress value={medCompliance} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Exercise (30m goal)</span>
                  <span className="text-sm text-muted-foreground">{Math.min(100, Math.round((exerciseMin / 30) * 100))}%</span>
                </div>
                <Progress value={Math.min(100, Math.round((exerciseMin / 30) * 100))} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Meals Logged (3 goal)</span>
                  <span className="text-sm text-muted-foreground">{Math.min(100, Math.round((mealsToday / 3) * 100))}%</span>
                </div>
                <Progress value={Math.min(100, Math.round((mealsToday / 3) * 100))} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {unread > 0 && (
            <Card className="border-primary/30 bg-primary/5 cursor-pointer" onClick={() => onNavigate?.('messages')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{unread} unread message{unread > 1 ? 's' : ''}</p>
                    <p className="text-xs text-muted-foreground">From your clinician</p>
                  </div>
                  <Button size="sm" variant="default">View</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
