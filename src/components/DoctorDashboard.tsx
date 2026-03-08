import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Activity, TrendingUp, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MedicationManager } from "./MedicationManager";
import { PatientList } from "./PatientList";
import { AppointmentScheduling } from "./AppointmentScheduling";
import { PatientProgressView } from "./PatientProgressView";
import { MessagingCenter } from "./MessagingCenter";

export const DoctorDashboard = () => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [doctorDetails, setDoctorDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    loadDoctorData();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('doctor-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => loadDoctorData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'doctor_details'
        },
        () => loadDoctorData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadDoctorData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        setUserProfile(profile);

        // Load doctor details
        const { data: doctorData } = await supabase
          .from('doctor_details')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        setDoctorDetails(doctorData);
      }
    } catch (error) {
      console.error('Error loading doctor data:', error);
      toast({
        title: "Error",
        description: "Failed to load doctor data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getDoctorTitle = () => {
    if (!userProfile) return "Dr. Doctor";
    return `Dr. ${userProfile.full_name}`;
  };

  const getSpecialization = () => {
    if (!doctorDetails?.specialization) return "General Practice";
    return doctorDetails.specialization;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Doctor Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {getDoctorTitle()}. Here's your practice overview.
          </p>
          {doctorDetails && (
            <p className="text-sm text-muted-foreground">
              Specialization: {getSpecialization()} • License: {doctorDetails.license_number}
            </p>
          )}
        </div>
        <Badge variant="secondary" className="h-fit">
          Doctor Portal
        </Badge>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 mb-6">
        <Button 
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          onClick={() => { setActiveTab('overview'); setSelectedPatientId(null); }}
        >
          Overview
        </Button>
        <Button 
          variant={activeTab === 'patients' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('patients')}
        >
          My Patients
        </Button>
        <Button 
          variant={activeTab === 'appointments' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('appointments')}
        >
          Appointments
        </Button>
        <Button 
          variant={activeTab === 'medications' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('medications')}
        >
          Medications
        </Button>
        <Button 
          variant={activeTab === 'messages' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('messages')}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Messages
        </Button>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Real data coming soon</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">No appointments yet</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Patients</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Real data coming soon</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Health Alerts</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">No alerts yet</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and tools for managing your practice
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <Button className="h-20 flex flex-col space-y-2">
                  <Users className="h-6 w-6" />
                  <span>View All Patients</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col space-y-2"
                  onClick={() => setActiveTab('medications')}
                >
                  <Activity className="h-6 w-6" />
                  <span>Manage Medications</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col space-y-2">
                  <Calendar className="h-6 w-6" />
                  <span>Health Reports</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'patients' && userProfile && (
        selectedPatientId ? (
          <div className="space-y-4">
            <Button variant="ghost" onClick={() => setSelectedPatientId(null)}>
              ← Back to Patient List
            </Button>
            <PatientProgressView patientId={selectedPatientId} patientName={selectedPatientName} />
          </div>
        ) : (
          <PatientList 
            doctorId={userProfile.user_id} 
            onSelectPatient={(patientId, patientName) => {
              setSelectedPatientId(patientId);
              setSelectedPatientName(patientName);
            }} 
          />
        )
      )}

      {activeTab === 'appointments' && userProfile && (
        <AppointmentScheduling doctorId={userProfile.user_id} />
      )}

      {activeTab === 'medications' && userProfile && (
        <MedicationManager userRole="doctor" userId={userProfile.user_id} />
      )}

      {activeTab === 'messages' && (
        <MessagingCenter userRole="clinician" />
      )}
    </div>
  );
};
