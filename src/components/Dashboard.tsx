import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Heart, 
  Pill, 
  Apple, 
  Activity, 
  Calendar, 
  TrendingUp, 
  CheckCircle,
  Clock,
  MessageSquare,
  BookOpen,
  BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AnnouncementBanner } from "./AnnouncementBanner";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
}

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

export const Dashboard = ({ onNavigate }: DashboardProps) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [latestGlucose, setLatestGlucose] = useState<number | null>(null);
  const [glucoseReadingsCount, setGlucoseReadingsCount] = useState(0);
  const [exerciseMinutesToday, setExerciseMinutesToday] = useState(0);
  const [mealsLoggedToday, setMealsLoggedToday] = useState(0);
  const [nextAppointment, setNextAppointment] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [activePrescriptions, setActivePrescriptions] = useState(0);
  const [takenToday, setTakenToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('patient');
  const { toast } = useToast();

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const effectiveProfile = profile || {
        id: '', user_id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        email: user.email || '',
      };
      setUserProfile(effectiveProfile as UserProfile);

      if (!profile) {
        await supabase.from('profiles').insert({
          user_id: user.id, full_name: effectiveProfile.full_name, email: effectiveProfile.email,
        });
      }

      const { data: userRoles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
      setUserRole(userRoles?.[0]?.role || 'patient');

      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const [glucoseResult, glucoseCountResult, exerciseResult, mealsResult, appointmentResult, messagesResult, prescResult, intakeResult] = await Promise.all([
        supabase.from('glucose_readings').select('glucose_value').eq('patient_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('glucose_readings').select('*', { count: 'exact', head: true }).eq('patient_id', user.id),
        supabase.from('exercise_logs').select('duration_minutes').eq('patient_id', user.id).gte('date_time', todayStart).lt('date_time', todayEnd),
        supabase.from('meal_logs').select('*', { count: 'exact', head: true }).eq('patient_id', user.id).gte('date_time', todayStart).lt('date_time', todayEnd),
        supabase.from('appointments').select('start_time').eq('patient_id', user.id).eq('status', 'scheduled').gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(1).maybeSingle(),
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('to_patient_id', user.id).is('read_at', null),
        supabase.from('prescriptions').select('id', { count: 'exact' }).eq('patient_id', user.id).eq('status', 'active'),
        supabase.from('medication_intake').select('id', { count: 'exact' }).eq('patient_id', user.id).eq('status', 'taken').gte('scheduled_time', todayStart).lt('scheduled_time', todayEnd),
      ]);

      if (glucoseResult.data) setLatestGlucose(glucoseResult.data.glucose_value);
      setGlucoseReadingsCount(glucoseCountResult.count || 0);
      setExerciseMinutesToday(exerciseResult.data?.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) || 0);
      setMealsLoggedToday(mealsResult.count || 0);
      setUnreadMessages(messagesResult.count || 0);
      setActivePrescriptions(prescResult.count || 0);
      setTakenToday(intakeResult.count || 0);

      if (appointmentResult.data) {
        const apptDate = new Date(appointmentResult.data.start_time);
        const isToday = apptDate.toDateString() === today.toDateString();
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        const isTomorrow = apptDate.toDateString() === tomorrow.toDateString();
        if (isToday) setNextAppointment(`Today ${apptDate.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}`);
        else if (isTomorrow) setNextAppointment(`Tomorrow ${apptDate.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}`);
        else setNextAppointment(apptDate.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
    const channel = supabase
      .channel('patient-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'glucose_readings' }, () => loadUserData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exercise_logs' }, () => loadUserData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_logs' }, () => loadUserData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => loadUserData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => loadUserData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions' }, () => loadUserData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medication_intake' }, () => loadUserData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const firstName = userProfile?.full_name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const getGlucoseStatus = () => {
    if (!latestGlucose) return { label: 'No data', color: 'text-muted-foreground' };
    if (latestGlucose < 70) return { label: 'Low', color: 'text-destructive' };
    if (latestGlucose <= 140) return { label: 'Normal', color: 'text-green-600 dark:text-green-400' };
    if (latestGlucose <= 200) return { label: 'Elevated', color: 'text-yellow-600 dark:text-yellow-400' };
    return { label: 'High', color: 'text-destructive' };
  };
  const glucoseStatus = getGlucoseStatus();

  const medCompliance = activePrescriptions > 0 ? Math.round((takenToday / activePrescriptions) * 100) : 0;

  return (
    <div className="space-y-6">
      <AnnouncementBanner userRole={userRole} />

      {/* Header */}
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

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50" onClick={() => onNavigate?.('glucose')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Heart className="h-5 w-5 text-primary" />
              <span className={`text-xs font-medium ${glucoseStatus.color}`}>{glucoseStatus.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{latestGlucose ? `${latestGlucose}` : '--'}</p>
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
            <p className="text-2xl font-bold text-foreground">{takenToday}/{activePrescriptions}</p>
            <p className="text-xs text-muted-foreground">Doses taken today</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50" onClick={() => onNavigate?.('exercise')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="h-5 w-5 text-primary" />
              <span className={`text-xs font-medium ${exerciseMinutesToday >= 30 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                {exerciseMinutesToday >= 30 ? '✓ Goal met' : `${Math.max(0, 30 - exerciseMinutesToday)}m left`}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">{exerciseMinutesToday > 0 ? `${exerciseMinutesToday}m` : '--'}</p>
            <p className="text-xs text-muted-foreground">Exercise today</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50" onClick={() => onNavigate?.('appointments')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <p className="text-lg font-bold text-foreground truncate">{nextAppointment || 'None'}</p>
            <p className="text-xs text-muted-foreground">Next appointment</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Health Snapshot */}
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
                  <p className="text-xl font-bold">{glucoseReadingsCount}</p>
                  <p className="text-xs text-muted-foreground">Total logged</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/5 border border-secondary/10">
                  <p className="text-sm font-medium text-muted-foreground">Meals Today</p>
                  <p className="text-xl font-bold">{mealsLoggedToday}</p>
                  <p className="text-xs text-muted-foreground">Logged today</p>
                </div>
                <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
                  <p className="text-sm font-medium text-muted-foreground">Exercise</p>
                  <p className="text-xl font-bold">{exerciseMinutesToday}m</p>
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

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="default" onClick={() => onNavigate?.('glucose')}>
                <Heart className="h-4 w-4 mr-2" />
                Log Glucose Reading
              </Button>
              <Button className="w-full justify-start" variant="secondary" onClick={() => onNavigate?.('nutrition')}>
                <Apple className="h-4 w-4 mr-2" />
                Log a Meal
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => onNavigate?.('exercise')}>
                <Activity className="h-4 w-4 mr-2" />
                Log Exercise
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => onNavigate?.('medications')}>
                <Pill className="h-4 w-4 mr-2" />
                Track Medications
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => onNavigate?.('messages')}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Messages {unreadMessages > 0 && <Badge variant="destructive" className="ml-auto text-xs">{unreadMessages}</Badge>}
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => onNavigate?.('progress')}>
                <BarChart3 className="h-4 w-4 mr-2" />
                View Progress
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => onNavigate?.('education')}>
                <BookOpen className="h-4 w-4 mr-2" />
                Education Hub
              </Button>
            </CardContent>
          </Card>

          {/* Today's Progress */}
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
                  <span className="text-sm text-muted-foreground">{Math.min(100, Math.round((exerciseMinutesToday / 30) * 100))}%</span>
                </div>
                <Progress value={Math.min(100, Math.round((exerciseMinutesToday / 30) * 100))} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Meals Logged (3 goal)</span>
                  <span className="text-sm text-muted-foreground">{Math.min(100, Math.round((mealsLoggedToday / 3) * 100))}%</span>
                </div>
                <Progress value={Math.min(100, Math.round((mealsLoggedToday / 3) * 100))} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Unread Messages */}
          {unreadMessages > 0 && (
            <Card className="border-primary/30 bg-primary/5 cursor-pointer" onClick={() => onNavigate?.('messages')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{unreadMessages} unread message{unreadMessages > 1 ? 's' : ''}</p>
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
