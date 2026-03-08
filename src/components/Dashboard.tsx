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
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  BookOpen,
  BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MedicationManager } from "./MedicationManager";
import { MessagingCenter } from "./MessagingCenter";
import { AnnouncementBanner } from "./AnnouncementBanner";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
}

interface Medication {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  instructions?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  patient_id: string;
  doctor_id: string;
}

interface MedicationLog {
  id: string;
  medication_id: string;
  taken_at: string;
  status: string;
  notes?: string;
}

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

export const Dashboard = ({ onNavigate }: DashboardProps) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>([]);
  const [latestGlucose, setLatestGlucose] = useState<number | null>(null);
  const [glucoseReadingsCount, setGlucoseReadingsCount] = useState(0);
  const [exerciseMinutesToday, setExerciseMinutesToday] = useState(0);
  const [mealsLoggedToday, setMealsLoggedToday] = useState(0);
  const [nextAppointment, setNextAppointment] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [userRole, setUserRole] = useState<string>('patient');
  const { toast } = useToast();

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load profile - use maybeSingle to handle missing profiles gracefully
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // If no profile, create one from auth metadata
      const effectiveProfile = profile || {
        id: '',
        user_id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        email: user.email || '',
      };

      setUserProfile(effectiveProfile as UserProfile);

      // If profile didn't exist, create it
      if (!profile) {
        await supabase.from('profiles').insert({
          user_id: user.id,
          full_name: effectiveProfile.full_name,
          email: effectiveProfile.email,
        });
      }

      // Check user role
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const role = userRoles?.[0]?.role || 'patient';
      setUserRole(role);

      // Load all patient data in parallel
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const [medsResult, logsResult, glucoseResult, glucoseCountResult, exerciseResult, mealsResult, appointmentResult, messagesResult] = await Promise.all([
        // Active medications
        supabase.from('medications').select('*').eq('patient_id', user.id).eq('is_active', true).order('created_at', { ascending: false }),
        // Recent medication logs
        supabase.from('medication_logs').select('*').eq('patient_id', user.id).order('taken_at', { ascending: false }).limit(10),
        // Latest glucose
        supabase.from('glucose_readings').select('glucose_value').eq('patient_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        // Total glucose readings
        supabase.from('glucose_readings').select('*', { count: 'exact', head: true }).eq('patient_id', user.id),
        // Today's exercise
        supabase.from('exercise_logs').select('duration_minutes').eq('patient_id', user.id).gte('date_time', todayStart).lt('date_time', todayEnd),
        // Today's meals
        supabase.from('meal_logs').select('*', { count: 'exact', head: true }).eq('patient_id', user.id).gte('date_time', todayStart).lt('date_time', todayEnd),
        // Next appointment
        supabase.from('appointments').select('start_time').eq('patient_id', user.id).eq('status', 'scheduled').gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(1).maybeSingle(),
        // Unread messages
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('to_patient_id', user.id).is('read_at', null),
      ]);

      setMedications(medsResult.data || []);
      setMedicationLogs(logsResult.data || []);
      if (glucoseResult.data) setLatestGlucose(glucoseResult.data.glucose_value);
      setGlucoseReadingsCount(glucoseCountResult.count || 0);
      setExerciseMinutesToday(exerciseResult.data?.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) || 0);
      setMealsLoggedToday(mealsResult.count || 0);
      setUnreadMessages(messagesResult.count || 0);
      
      if (appointmentResult.data) {
        const apptDate = new Date(appointmentResult.data.start_time);
        const isToday = apptDate.toDateString() === today.toDateString();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const isTomorrow = apptDate.toDateString() === tomorrow.toDateString();
        
        if (isToday) {
          setNextAppointment(`Today ${apptDate.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}`);
        } else if (isTomorrow) {
          setNextAppointment(`Tomorrow ${apptDate.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}`);
        } else {
          setNextAppointment(apptDate.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }));
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: "Error",
        description: "Failed to load some data. Please refresh.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
    
    // Single channel for all realtime updates
    const channel = supabase
      .channel('patient-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadUserData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medications' }, () => loadUserData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medication_logs' }, () => loadUserData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'glucose_readings' }, () => loadUserData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exercise_logs' }, () => loadUserData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_logs' }, () => loadUserData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => loadUserData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => loadUserData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getWelcomeMessage = () => {
    const firstName = userProfile?.full_name?.split(' ')[0] || 'there';
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return `${greeting}, ${firstName}!`;
  };

  const getTodaysMedicationStats = () => {
    const today = new Date().toDateString();
    const todaysLogs = medicationLogs.filter(log => 
      new Date(log.taken_at).toDateString() === today
    );
    return {
      totalMedications: medications.length,
      takenToday: todaysLogs.length,
      compliance: medications.length > 0 ? Math.round((todaysLogs.length / medications.length) * 100) : 0
    };
  };

  const getGlucoseStatus = () => {
    if (!latestGlucose) return { label: 'No data', color: 'text-muted-foreground' };
    if (latestGlucose < 70) return { label: 'Low', color: 'text-destructive' };
    if (latestGlucose <= 140) return { label: 'Normal', color: 'text-success' };
    if (latestGlucose <= 200) return { label: 'Elevated', color: 'text-warning' };
    return { label: 'High', color: 'text-destructive' };
  };

  const medStats = getTodaysMedicationStats();
  const glucoseStatus = getGlucoseStatus();

  return (
    <div className="space-y-6">
      {/* Announcements */}
      <AnnouncementBanner userRole={userRole} />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{getWelcomeMessage()}</h1>
          <p className="text-muted-foreground">Here's your health overview for today.</p>
        </div>
        {latestGlucose && (
          <Badge variant="outline" className={`${glucoseStatus.color} border-current`}>
            <Heart className="h-4 w-4 mr-1" />
            Glucose: {glucoseStatus.label}
          </Badge>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border pb-2">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'medications', label: 'Medications', icon: Pill },
          { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages },
        ].map(tab => (
          <Button 
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            className="relative"
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
            {tab.badge ? (
              <Badge variant="destructive" className="ml-2 h-5 min-w-[20px] text-xs px-1">
                {tab.badge}
              </Badge>
            ) : null}
          </Button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card 
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
              onClick={() => onNavigate?.('glucose')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Heart className="h-5 w-5 text-primary" />
                  <span className={`text-xs font-medium ${glucoseStatus.color}`}>{glucoseStatus.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {latestGlucose ? `${latestGlucose}` : '--'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {latestGlucose ? 'mg/dL • Last reading' : 'Log your first reading'}
                </p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
              onClick={() => setActiveTab('medications')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Pill className="h-5 w-5 text-secondary" />
                  <span className={`text-xs font-medium ${medStats.compliance >= 80 ? 'text-success' : medStats.compliance >= 50 ? 'text-warning' : 'text-destructive'}`}>
                    {medStats.compliance}%
                  </span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {medStats.takenToday}/{medStats.totalMedications}
                </p>
                <p className="text-xs text-muted-foreground">Doses taken today</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
              onClick={() => onNavigate?.('exercise')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="h-5 w-5 text-accent" />
                  <span className={`text-xs font-medium ${exerciseMinutesToday >= 30 ? 'text-success' : 'text-muted-foreground'}`}>
                    {exerciseMinutesToday >= 30 ? '✓ Goal met' : `${Math.max(0, 30 - exerciseMinutesToday)}m left`}
                  </span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {exerciseMinutesToday > 0 ? `${exerciseMinutesToday}m` : '--'}
                </p>
                <p className="text-xs text-muted-foreground">Exercise today</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
              onClick={() => onNavigate?.('appointments')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <p className="text-lg font-bold text-foreground truncate">
                  {nextAppointment || 'None'}
                </p>
                <p className="text-xs text-muted-foreground">Next appointment</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Activities */}
            <div className="lg:col-span-2 space-y-6">
              {/* Today's Medications */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Pill className="h-5 w-5 text-primary" />
                      Today's Medications
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('medications')}>
                      View All →
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {medications.length === 0 ? (
                    <div className="text-center py-6">
                      <Pill className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">No active medications</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Prescriptions from your clinician will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {medications.slice(0, 4).map(med => {
                        const today = new Date().toDateString();
                        const takenToday = medicationLogs.some(
                          log => log.medication_id === med.id && new Date(log.taken_at).toDateString() === today
                        );
                        return (
                          <div key={med.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{med.medication_name}</p>
                              <p className="text-xs text-muted-foreground">{med.dosage} • {med.frequency}</p>
                            </div>
                            {takenToday ? (
                              <Badge className="bg-success/10 text-success border-success/20">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Taken
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-warning border-warning/30">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
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
                    <div className="p-3 rounded-lg bg-success/5 border border-success/10">
                      <p className="text-sm font-medium text-muted-foreground">Med Adherence</p>
                      <p className="text-xl font-bold">{medStats.compliance}%</p>
                      <p className="text-xs text-muted-foreground">Today</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Quick Actions & Progress */}
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

              {/* Weekly Progress */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Today's Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Medication</span>
                      <span className="text-sm text-muted-foreground">{medStats.compliance}%</span>
                    </div>
                    <Progress value={medStats.compliance} className="h-2" />
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

              {/* Messages Preview */}
              {unreadMessages > 0 && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {unreadMessages} unread message{unreadMessages > 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">From your clinician</p>
                      </div>
                      <Button size="sm" variant="default" onClick={() => setActiveTab('messages')}>
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'medications' && userProfile && (
        <MedicationManager userRole={userRole} userId={userProfile.user_id} />
      )}

      {activeTab === 'messages' && (
        <MessagingCenter userRole="patient" />
      )}
    </div>
  );
};
