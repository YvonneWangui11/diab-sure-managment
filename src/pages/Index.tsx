import { useState, useEffect, useCallback } from "react";
import { Navigation } from "@/components/Navigation";
import { Dashboard } from "@/components/Dashboard";
import { ClinicianDashboardRefactored } from "@/components/clinician/ClinicianDashboardRefactored";
import { AdminDashboard } from "@/components/AdminDashboard";
import { GlucoseTracking } from "@/components/GlucoseTracking";
import { NutritionTrackingEnhanced } from "@/components/NutritionTrackingEnhanced";
import { ExerciseTrackingEnhanced } from "@/components/ExerciseTrackingEnhanced";
import { AppointmentViewing } from "@/components/AppointmentViewing";
import { ProgressDashboard } from "@/components/ProgressDashboard";
import { EducationHub } from "@/components/EducationHub";
import { ProfilePage } from "@/components/ProfilePage";
import { LandingPage } from "@/components/LandingPage";
import { AuthPage } from "@/components/AuthPage";
import { FloatingYvonneButton } from "@/components/FloatingYvonneButton";
import { PageLoader } from "@/components/LoadingSpinner";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type UserRole = "patient" | "clinician" | "admin";
type AuthMode = "patient" | "clinician" | null;

const ROLE_STORAGE_KEY = "diabesure_active_role";

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [userId, setUserId] = useState<string>("");
  const [isInitializing, setIsInitializing] = useState(true);
  const { toast } = useToast();

  const loadUserRoles = useCallback(async (uid: string) => {
    try {
      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', uid);
      
      if (error) {
        console.error('Error loading user roles:', error);
        // Default to patient if we can't load roles
        setUserRoles(['patient']);
        setActiveRole('patient');
        return;
      }
      
      // Default to patient if no roles found
      const roles = (roleData && roleData.length > 0) 
        ? roleData.map(r => r.role as UserRole) 
        : ['patient' as UserRole];
      
      setUserRoles(roles);
      
      // Check localStorage for saved role preference
      const savedRole = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole | null;
      
      // Use saved role if it exists and user still has that role
      if (savedRole && roles.includes(savedRole)) {
        setActiveRole(savedRole);
      } else {
        // Set default active role based on priority: admin > clinician > patient
        if (roles.includes('admin')) {
          setActiveRole('admin');
        } else if (roles.includes('clinician')) {
          setActiveRole('clinician');
        } else {
          setActiveRole('patient');
        }
      }
    } catch (error) {
      console.error('Error loading user roles:', error);
      setUserRoles(['patient']);
      setActiveRole('patient');
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          if (mounted) setIsInitializing(false);
          return;
        }

        if (session && mounted) {
          setIsLoggedIn(true);
          setUserId(session.user.id);
          await loadUserRoles(session.user.id);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted) setIsInitializing(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session) {
          setIsLoggedIn(true);
          setUserId(session.user.id);
          await loadUserRoles(session.user.id);
          setShowAuth(false);
        } else if (event === 'SIGNED_OUT') {
          setIsLoggedIn(false);
          setUserRoles([]);
          setActiveRole(null);
          setUserId("");
          setCurrentPage("dashboard");
          setShowAuth(false);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed');
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserRoles]);

  const handleGetStarted = () => {
    setAuthMode("patient");
    setShowAuth(true);
  };

  const handleClinicianAccess = () => {
    setAuthMode("clinician");
    setShowAuth(true);
  };

  const handleAuthSuccess = () => {
    setShowAuth(false);
    setAuthMode(null);
  };

  const handleRoleSwitch = (newRole: UserRole) => {
    setActiveRole(newRole);
    localStorage.setItem(ROLE_STORAGE_KEY, newRole); // Persist to localStorage
    setCurrentPage("dashboard"); // Reset to dashboard when switching roles
    toast({
      title: "Role switched",
      description: `You are now viewing the ${newRole} dashboard.`,
    });
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setIsLoggedIn(false);
      setUserRoles([]);
      setActiveRole(null);
      setUserId("");
      setShowAuth(false);
      setCurrentPage("dashboard");
      localStorage.removeItem(ROLE_STORAGE_KEY); // Clear saved role on sign out
      
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Render patient-specific pages
  const renderPatientPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard onNavigate={setCurrentPage} />;
      case "glucose":
        return userId ? <GlucoseTracking userId={userId} /> : null;
      case "nutrition":
        return userId ? <NutritionTrackingEnhanced userId={userId} /> : null;
      case "exercise":
        return userId ? <ExerciseTrackingEnhanced userId={userId} /> : null;
      case "appointments":
        return userId ? <AppointmentViewing userId={userId} /> : null;
      case "progress":
        return userId ? <ProgressDashboard userId={userId} /> : null;
      case "education":
        return <EducationHub />;
      case "profile":
        return <ProfilePage onSignOut={handleSignOut} />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  // Show loading state during initialization
  if (isInitializing) {
    return <PageLoader text="Loading DiabeSure..." />;
  }

  if (!isLoggedIn && !showAuth) {
    return <LandingPage onGetStarted={handleGetStarted} onClinicianAccess={handleClinicianAccess} />;
  }

  if (showAuth) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} defaultRole={authMode} />;
  }

  // Route based on active role
  if (activeRole === 'clinician') {
    return (
      <ClinicianDashboardRefactored 
        onSignOut={handleSignOut}
        roleSwitcher={
          userRoles.length > 1 ? (
            <RoleSwitcher 
              currentRole={activeRole} 
              availableRoles={userRoles} 
              onRoleChange={handleRoleSwitch} 
            />
          ) : undefined
        }
      />
    );
  }

  // Route admins to their dedicated dashboard
  if (activeRole === 'admin') {
    return (
      <div className="min-h-screen bg-background">
        <Navigation 
          currentPage={currentPage} 
          onPageChange={setCurrentPage}
          onSignOut={handleSignOut}
          roleSwitcher={
            userRoles.length > 1 ? (
              <RoleSwitcher 
                currentRole={activeRole} 
                availableRoles={userRoles} 
                onRoleChange={handleRoleSwitch} 
              />
            ) : undefined
          }
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AdminDashboard />
        </main>
        <FloatingYvonneButton />
      </div>
    );
  }

  // Default: Patient dashboard with patient navigation
  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        currentPage={currentPage} 
        onPageChange={setCurrentPage}
        onSignOut={handleSignOut}
        roleSwitcher={
          userRoles.length > 1 && activeRole ? (
            <RoleSwitcher 
              currentRole={activeRole} 
              availableRoles={userRoles} 
              onRoleChange={handleRoleSwitch} 
            />
          ) : undefined
        }
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderPatientPage()}
      </main>
      <FloatingYvonneButton />
    </div>
  );
};

export default Index;
