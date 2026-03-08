import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, Calendar, AlertTriangle, Pill, 
  Clock, ChevronRight, MessageSquare, 
  CheckCircle, FileText, Bell, Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { ClinicianSidebar } from "./ClinicianSidebar";
import { TriageFeed } from "./TriageFeed";
import { CarePlanManager } from "../CarePlanManager";
import { ClinicianYvonneButton } from "./ClinicianYvonneButton";
import { PatientList } from "@/components/PatientList";
import { PatientProgressView } from "@/components/PatientProgressView";
import { AppointmentScheduling } from "@/components/AppointmentScheduling";
import { PrescriptionsManager } from "@/components/PrescriptionsManager";
import { HealthAlertsManager } from "@/components/HealthAlertsManager";
import { MessagingCenter } from "@/components/MessagingCenter";
import { ReportsExports } from "@/components/ReportsExports";
import { EducationHub } from "@/components/EducationHub";
import { ProfilePage } from "@/components/ProfilePage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useCriticalAlertNotifications } from "@/hooks/useCriticalAlertNotifications";
// Admin components
import { UserRoleManagement } from "@/components/UserRoleManagement";
import { AuditLogViewer } from "@/components/AuditLogViewer";
import { AnnouncementsManager } from "@/components/AnnouncementsManager";
import { DataRetentionManager } from "@/components/DataRetentionManager";

interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  activeAlerts: number;
  activePrescriptions: number;
  unreadMessages: number;
}

interface TodayAppointment {
  id: string;
  patient_id: string;
  patient_name: string;
  start_time: string;
  end_time: string | null;
  status: string;
  notes: string | null;
}

interface ClinicianDashboardProps {
  onSignOut?: () => void;
  roleSwitcher?: React.ReactNode;
}

export const ClinicianDashboardRefactored = ({ onSignOut, roleSwitcher }: ClinicianDashboardProps) => {
  const [userProfile, setUserProfile] = useState<Record<string, unknown> | null>(null);
  const [doctorDetails, setDoctorDetails] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('overview');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState<string>('');
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [hasAdminRole, setHasAdminRole] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    todayAppointments: 0,
    activeAlerts: 0,
    activePrescriptions: 0,
    unreadMessages: 0,
  });
  const [todaySchedule, setTodaySchedule] = useState<TodayAppointment[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<Array<{
    id: string;
    patient_name: string;
    severity: string;
    message: string;
    created_at: string;
  }>>([]);
  const { toast } = useToast();

  // Enable real-time critical alert notifications
  useCriticalAlertNotifications({
    doctorId: (userProfile as Record<string, string>)?.user_id,
    enabled: !loading,
    onNewCriticalAlert: () => {
      loadStats();
      loadRecentAlerts();
    },
  });

  useEffect(() => {
    loadClinicianData();
    
    const channel = supabase
      .channel('clinician-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadClinicianData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'doctor_details' }, () => loadClinicianData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'doctor_patients' }, () => loadStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => { loadStats(); loadTodaySchedule(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'health_alerts' }, () => { loadStats(); loadRecentAlerts(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions' }, () => loadStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => loadStats())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadClinicianData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user has admin role (clinicians can have admin privileges)
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (roles) {
        const hasAdmin = roles.some(r => r.role === 'admin');
        setHasAdminRole(hasAdmin);
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setUserProfile(profile);

        const { data: doctorData } = await supabase
          .from('doctor_details')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        setDoctorDetails(doctorData);
        
        await Promise.all([
          loadStats(user.id),
          loadTodaySchedule(user.id),
          loadRecentAlerts(user.id)
        ]);
      }
    } catch (error) {
      console.error('Error loading clinician data:', error);
      toast({
        title: "Error",
        description: "Failed to load clinician data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (userId?: string) => {
    try {
      const uid = userId || (userProfile as Record<string, string>)?.user_id;
      if (!uid) return;

      const today = new Date();

      const [patientCount, appointmentCount, alertCount, prescriptionCount, messageCount] = await Promise.all([
        supabase.from('doctor_patients').select('*', { count: 'exact', head: true }).eq('doctor_id', uid).eq('status', 'active'),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('doctor_id', uid).gte('start_time', startOfDay(today).toISOString()).lte('start_time', endOfDay(today).toISOString()),
        supabase.from('health_alerts').select('*', { count: 'exact', head: true }).eq('doctor_id', uid).eq('resolved', false),
        supabase.from('prescriptions').select('*', { count: 'exact', head: true }).eq('clinician_id', uid).eq('status', 'active'),
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('to_clinician_id', uid).is('read_at', null),
      ]);

      setStats({
        totalPatients: patientCount.count || 0,
        todayAppointments: appointmentCount.count || 0,
        activeAlerts: alertCount.count || 0,
        activePrescriptions: prescriptionCount.count || 0,
        unreadMessages: messageCount.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadTodaySchedule = async (userId?: string) => {
    try {
      const uid = userId || (userProfile as Record<string, string>)?.user_id;
      if (!uid) return;

      const today = new Date();
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', uid)
        .gte('start_time', startOfDay(today).toISOString())
        .lte('start_time', endOfDay(today).toISOString())
        .order('start_time', { ascending: true });

      if (appointments && appointments.length > 0) {
        const patientIds = [...new Set(appointments.map(a => a.patient_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', patientIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
        
        setTodaySchedule(appointments.map(apt => ({
          ...apt,
          patient_name: profileMap.get(apt.patient_id) || 'Unknown Patient'
        })));
      } else {
        setTodaySchedule([]);
      }
    } catch (error) {
      console.error('Error loading today schedule:', error);
    }
  };

  const loadRecentAlerts = async (userId?: string) => {
    try {
      const uid = userId || (userProfile as Record<string, string>)?.user_id;
      if (!uid) return;

      const { data: alerts } = await supabase
        .from('health_alerts')
        .select('*')
        .eq('doctor_id', uid)
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (alerts && alerts.length > 0) {
        const patientIds = [...new Set(alerts.map(a => a.patient_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', patientIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
        
        setRecentAlerts(alerts.map(alert => ({
          ...alert,
          patient_name: profileMap.get(alert.patient_id) || 'Unknown Patient'
        })));
      } else {
        setRecentAlerts([]);
      }
    } catch (error) {
      console.error('Error loading recent alerts:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'in-progress': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'warning': return 'bg-warning text-warning-foreground';
      default: return 'bg-primary text-primary-foreground';
    }
  };

  const handleViewPatient = (patientId: string, patientName: string) => {
    setSelectedPatientId(patientId);
    setSelectedPatientName(patientName);
    setCurrentPage('patients');
  };

  const handleSendMessage = (patientId: string, patientName: string) => {
    // Navigate to messages with context
    setCurrentPage('messages');
    toast({
      title: "Message Patient",
      description: `Opening message composer for ${patientName}`,
    });
  };

  const handleScheduleAppointment = (patientId: string, patientName: string) => {
    setCurrentPage('appointments');
    toast({
      title: "Schedule Appointment",
      description: `Opening scheduler for ${patientName}`,
    });
  };

  const handlePatientSearch = (query: string) => {
    setPatientSearchQuery(query);
    if (query.trim()) {
      setCurrentPage('patients');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner size="xl" text="Loading clinician portal..." />
        </div>
      </div>
    );
  }

  const getDoctorTitle = () => {
    if (!userProfile) return "Doctor";
    return (userProfile as Record<string, string>).full_name || "Doctor";
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'patients':
        return selectedPatientId ? (
          <div className="space-y-4">
            <Button variant="ghost" onClick={() => setSelectedPatientId(null)}>
              ← Back to Patient List
            </Button>
            <PatientProgressView patientId={selectedPatientId} patientName={selectedPatientName} />
          </div>
        ) : (
          <PatientList 
            doctorId={(userProfile as Record<string, string>)?.user_id} 
            onSelectPatient={(patientId, patientName) => {
              setSelectedPatientId(patientId);
              setSelectedPatientName(patientName);
            }} 
          />
        );
      
      case 'triage':
        return (
          <TriageFeed
            doctorId={(userProfile as Record<string, string>)?.user_id}
            onViewPatient={handleViewPatient}
            onSendMessage={handleSendMessage}
            onScheduleAppointment={handleScheduleAppointment}
          />
        );
      
      case 'appointments':
        return <AppointmentScheduling doctorId={(userProfile as Record<string, string>)?.user_id} />;
      
      case 'prescriptions':
        return <PrescriptionsManager clinicianId={(userProfile as Record<string, string>)?.user_id} />;
      
      case 'alerts':
        return <HealthAlertsManager doctorId={(userProfile as Record<string, string>)?.user_id} />;
      
      case 'messages':
        return <MessagingCenter userRole="clinician" />;
      
      case 'reports':
        return <ReportsExports />;

      case 'education':
        return <EducationHub />;
      
      case 'profile':
        return <ProfilePage onSignOut={onSignOut || (() => {})} />;
      
      // Admin pages - only accessible if user has admin role
      case 'admin-users':
        return hasAdminRole ? <UserRoleManagement /> : renderOverview();
      
      case 'admin-audit':
        return hasAdminRole ? <AuditLogViewer /> : renderOverview();
      
      case 'admin-announcements':
        return hasAdminRole ? <AnnouncementsManager /> : renderOverview();
      
      case 'admin-retention':
        return hasAdminRole ? <DataRetentionManager /> : renderOverview();
      
      default:
        return renderOverview();
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Welcome Header with Gradient */}
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/5 p-6 border border-border/50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back, Dr. {getDoctorTitle()}</h1>
            <p className="text-muted-foreground mt-1">
              {(doctorDetails as Record<string, string>)?.specialization || 'General Practice'} • License: {(doctorDetails as Record<string, string>)?.license_number || 'N/A'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="h-fit text-sm px-3 py-1">
              <Sparkles className="h-3 w-3 mr-1" />
              Clinician Portal
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card 
          className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
          onClick={() => setCurrentPage('patients')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPatients}</div>
            <p className="text-xs text-muted-foreground">Active patients</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
          onClick={() => setCurrentPage('appointments')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayAppointments}</div>
            <p className="text-xs text-muted-foreground">Appointments</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover:shadow-md transition-all ${stats.activeAlerts > 0 ? 'border-destructive/50 bg-destructive/5 hover:border-destructive' : 'hover:border-primary/50'}`}
          onClick={() => setCurrentPage('triage')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats.activeAlerts > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.activeAlerts > 0 ? 'text-destructive' : ''}`}>
              {stats.activeAlerts}
            </div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
          onClick={() => setCurrentPage('prescriptions')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rx</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePrescriptions}</div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover:shadow-md transition-all ${stats.unreadMessages > 0 ? 'border-primary/50 bg-primary/5 hover:border-primary' : 'hover:border-primary/50'}`}
          onClick={() => setCurrentPage('messages')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <MessageSquare className={`h-4 w-4 ${stats.unreadMessages > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.unreadMessages > 0 ? 'text-primary' : ''}`}>
              {stats.unreadMessages}
            </div>
            <p className="text-xs text-muted-foreground">Unread</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Schedule */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Today's Schedule
              </CardTitle>
              <CardDescription>
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage('appointments')}>
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {todaySchedule.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No appointments scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaySchedule.slice(0, 5).map((apt) => (
                  <div 
                    key={apt.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => handleViewPatient(apt.patient_id, apt.patient_name)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[60px]">
                        <p className="text-sm font-semibold">
                          {format(parseISO(apt.start_time), 'h:mm a')}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">{apt.patient_name}</p>
                        {apt.notes && (
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {apt.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge className={getStatusColor(apt.status)}>
                      {apt.status}
                    </Badge>
                  </div>
                ))}
                {todaySchedule.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    +{todaySchedule.length - 5} more appointments
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Recent Alerts
              </CardTitle>
              <CardDescription>
                Active patient health alerts
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage('triage')}>
              Triage Feed
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentAlerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-success opacity-50" />
                <p>No active alerts - all patients healthy!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAlerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => setCurrentPage('triage')}
                  >
                    <Badge className={getSeverityColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{alert.patient_name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {alert.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(alert.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={() => setCurrentPage('patients')}
            >
              <Users className="h-5 w-5" />
              <span className="text-xs">View Patients</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={() => setCurrentPage('appointments')}
            >
              <Calendar className="h-5 w-5" />
              <span className="text-xs">Schedule</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={() => setCurrentPage('prescriptions')}
            >
              <Pill className="h-5 w-5" />
              <span className="text-xs">Prescriptions</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={() => setCurrentPage('reports')}
            >
              <FileText className="h-5 w-5" />
              <span className="text-xs">Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <ClinicianSidebar
          currentPage={currentPage}
          onPageChange={(page) => {
            setCurrentPage(page);
            setSelectedPatientId(null);
          }}
          onSignOut={onSignOut}
          roleSwitcher={roleSwitcher}
          doctorName={getDoctorTitle()}
          specialization={(doctorDetails as Record<string, string>)?.specialization || 'General Practice'}
          stats={{
            activeAlerts: stats.activeAlerts,
            unreadMessages: stats.unreadMessages,
          }}
          onPatientSearch={handlePatientSearch}
          showAdminSection={hasAdminRole}
        />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
            <SidebarTrigger className="-ml-2" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold capitalize">{currentPage === 'overview' ? 'Dashboard' : currentPage.replace('-', ' ')}</h2>
            </div>
          </header>
          <main className="flex-1 p-6">
            {renderContent()}
          </main>
        </SidebarInset>
      </div>
      <ClinicianYvonneButton
        context={{
          patientId: selectedPatientId || undefined,
          patientName: selectedPatientName || undefined,
          currentPage,
        }}
      />
    </SidebarProvider>
  );
};
