import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Navigation } from "@/components/Navigation";
import { LandingPage } from "@/components/LandingPage";
import { AuthPage } from "@/components/AuthPage";
import { FloatingYvonneButton } from "@/components/FloatingYvonneButton";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { InactivityWarning } from "@/components/InactivityWarning";
import { KeyboardShortcutsHelp } from "@/components/KeyboardShortcutsHelp";
import { PageLoader } from "@/components/LoadingSpinner";
import { PageErrorBoundary } from "@/components/ErrorBoundary";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { DashboardSkeleton, GlucoseTrackingSkeleton, MedicationSkeleton, AppointmentsSkeleton, MessagesSkeleton } from "@/components/ui/skeleton-loaders";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Lazy load heavy components
const Dashboard = lazy(() => import("@/components/Dashboard").then(m => ({ default: m.Dashboard })));
const ClinicianDashboardRefactored = lazy(() => import("@/components/clinician/ClinicianDashboardRefactored").then(m => ({ default: m.ClinicianDashboardRefactored })));
const AdminDashboard = lazy(() => import("@/components/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const GlucoseTracking = lazy(() => import("@/components/GlucoseTracking").then(m => ({ default: m.GlucoseTracking })));
const NutritionTrackingEnhanced = lazy(() => import("@/components/NutritionTrackingEnhanced").then(m => ({ default: m.NutritionTrackingEnhanced })));
const ExerciseTrackingEnhanced = lazy(() => import("@/components/ExerciseTrackingEnhanced").then(m => ({ default: m.ExerciseTrackingEnhanced })));
const AppointmentViewing = lazy(() => import("@/components/AppointmentViewing").then(m => ({ default: m.AppointmentViewing })));
const ProgressDashboard = lazy(() => import("@/components/ProgressDashboard").then(m => ({ default: m.ProgressDashboard })));
const EducationHub = lazy(() => import("@/components/EducationHub").then(m => ({ default: m.EducationHub })));
const PatientMedicationTracking = lazy(() => import("@/components/PatientMedicationTracking").then(m => ({ default: m.PatientMedicationTracking })));
const MessagingCenter = lazy(() => import("@/components/MessagingCenter").then(m => ({ default: m.MessagingCenter })));
const ProfilePage = lazy(() => import("@/components/ProfilePage").then(m => ({ default: m.ProfilePage })));
const GlucoseTrendAnalysis = lazy(() => import("@/components/GlucoseTrendAnalysis").then(m => ({ default: m.GlucoseTrendAnalysis })));
const MealImpactCorrelation = lazy(() => import("@/components/MealImpactCorrelation").then(m => ({ default: m.MealImpactCorrelation })));
const ExerciseImpactScoring = lazy(() => import("@/components/ExerciseImpactScoring").then(m => ({ default: m.ExerciseImpactScoring })));
const WeeklyHealthReport = lazy(() => import("@/components/WeeklyHealthReport").then(m => ({ default: m.WeeklyHealthReport })));
const RiskStratification = lazy(() => import("@/components/RiskStratification").then(m => ({ default: m.RiskStratification })));
const NaturalLanguageLogger = lazy(() => import("@/components/NaturalLanguageLogger").then(m => ({ default: m.NaturalLanguageLogger })));
const PredictiveGlucoseAlerts = lazy(() => import("@/components/PredictiveGlucoseAlerts").then(m => ({ default: m.PredictiveGlucoseAlerts })));
const EngagementDashboard = lazy(() => import("@/components/EngagementDashboard").then(m => ({ default: m.EngagementDashboard })));

type UserRole = "patient" | "clinician" | "admin";
type AuthMode = "patient" | "clinician" | null;

const ROLE_STORAGE_KEY = "diabesure_active_role";

const getPageSkeleton = (page: string) => {
  switch (page) {
    case "dashboard": return <DashboardSkeleton />;
    case "glucose": return <GlucoseTrackingSkeleton />;
    case "medications": return <MedicationSkeleton />;
    case "appointments": return <AppointmentsSkeleton />;
    case "messages": return <MessagesSkeleton />;
    default: return <DashboardSkeleton />;
  }
};

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [userId, setUserId] = useState<string>("");
  const [isInitializing, setIsInitializing] = useState(true);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const { toast } = useToast();

  const handleSignOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setIsLoggedIn(false);
      setUserRoles([]);
      setActiveRole(null);
      setUserId("");
      setShowAuth(false);
      setCurrentPage("dashboard");
      localStorage.removeItem(ROLE_STORAGE_KEY);
      toast({ title: "Signed out", description: "You have been successfully signed out." });
    } catch (error) {
      console.error('Sign out error:', error);
      toast({ title: "Error", description: "Failed to sign out. Please try again.", variant: "destructive" });
    }
  }, [toast]);

  // Session inactivity timeout (15 min idle = warning at 13 min)
  const { showWarning, remainingSeconds, stayActive } = useInactivityTimeout({
    timeoutMs: 15 * 60 * 1000,
    warningMs: 13 * 60 * 1000,
    onTimeout: handleSignOut,
    enabled: isLoggedIn,
  });

  // Keyboard shortcuts
  useKeyboardShortcuts((page) => {
    if (isLoggedIn && activeRole === "patient") {
      setCurrentPage(page);
    }
  }, isLoggedIn && activeRole === "patient");

  // Listen for "?" key to show shortcuts help
  useEffect(() => {
    const handleQuestion = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (e.key === "?" && !e.altKey && !e.ctrlKey && !e.metaKey) {
        setShowShortcutsHelp(true);
      }
    };
    document.addEventListener("keydown", handleQuestion);
    return () => document.removeEventListener("keydown", handleQuestion);
  }, []);

  const loadUserRoles = useCallback(async (uid: string) => {
    try {
      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', uid);
      
      if (error) {
        console.error('Error loading user roles:', error);
        setUserRoles(['patient']);
        setActiveRole('patient');
        return;
      }
      
      const roles = (roleData && roleData.length > 0) 
        ? roleData.map(r => r.role as UserRole) 
        : ['patient' as UserRole];
      
      setUserRoles(roles);
      
      const savedRole = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole | null;
      if (savedRole && roles.includes(savedRole)) {
        setActiveRole(savedRole);
      } else {
        if (roles.includes('admin')) setActiveRole('admin');
        else if (roles.includes('clinician')) setActiveRole('clinician');
        else setActiveRole('patient');
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
        }
      }
    );

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [loadUserRoles]);

  const handleGetStarted = () => { setAuthMode("patient"); setShowAuth(true); };
  const handleClinicianAccess = () => { setAuthMode("clinician"); setShowAuth(true); };
  const handleAuthSuccess = () => { setShowAuth(false); setAuthMode(null); };

  const handleRoleSwitch = (newRole: UserRole) => {
    setActiveRole(newRole);
    localStorage.setItem(ROLE_STORAGE_KEY, newRole);
    setCurrentPage("dashboard");
    toast({ title: "Role switched", description: `You are now viewing the ${newRole} dashboard.` });
  };

  const renderPatientPage = () => {
    switch (currentPage) {
      case "dashboard": return <Dashboard onNavigate={setCurrentPage} />;
      case "glucose": return userId ? <GlucoseTracking userId={userId} /> : null;
      case "medications": return userId ? <PatientMedicationTracking userId={userId} /> : null;
      case "nutrition": return userId ? <NutritionTrackingEnhanced userId={userId} /> : null;
      case "exercise": return userId ? <ExerciseTrackingEnhanced userId={userId} /> : null;
      case "appointments": return userId ? <AppointmentViewing userId={userId} /> : null;
      case "messages": return userId ? <MessagingCenter userRole="patient" /> : null;
      case "progress": return userId ? <ProgressDashboard userId={userId} /> : null;
      case "education": return <EducationHub />;
      case "profile": return <ProfilePage onSignOut={handleSignOut} />;
      case "glucose-trends": return userId ? <GlucoseTrendAnalysis userId={userId} /> : null;
      case "meal-impact": return userId ? <MealImpactCorrelation userId={userId} /> : null;
      case "exercise-impact": return userId ? <ExerciseImpactScoring userId={userId} /> : null;
      case "weekly-report": return userId ? <WeeklyHealthReport userId={userId} /> : null;
      case "risk-assessment": return userId ? <RiskStratification userId={userId} /> : null;
      case "quick-log": return userId ? <NaturalLanguageLogger userId={userId} /> : null;
      case "predictive-alerts": return userId ? <PredictiveGlucoseAlerts userId={userId} /> : null;
      case "engagement": return userId ? <EngagementDashboard userId={userId} /> : null;
      default: return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  if (isInitializing) {
    return <PageLoader text="Loading DiabeSure..." />;
  }

  if (!isLoggedIn && !showAuth) {
    return (
      <>
        <LandingPage onGetStarted={handleGetStarted} onClinicianAccess={handleClinicianAccess} />
        <PWAInstallPrompt />
      </>
    );
  }

  if (showAuth) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} defaultRole={authMode} />;
  }

  const roleSwitcherElement = userRoles.length > 1 && activeRole ? (
    <RoleSwitcher currentRole={activeRole} availableRoles={userRoles} onRoleChange={handleRoleSwitch} />
  ) : undefined;

  if (activeRole === 'clinician') {
    return (
      <PageErrorBoundary>
        <Suspense fallback={<PageLoader text="Loading clinician dashboard..." />}>
          <ClinicianDashboardRefactored onSignOut={handleSignOut} roleSwitcher={roleSwitcherElement} />
        </Suspense>
        <InactivityWarning open={showWarning} remainingSeconds={remainingSeconds} onStayActive={stayActive} onLogout={handleSignOut} />
        <PWAInstallPrompt />
      </PageErrorBoundary>
    );
  }

  if (activeRole === 'admin') {
    return (
      <div className="min-h-screen bg-background">
        <Navigation currentPage={currentPage} onPageChange={setCurrentPage} onSignOut={handleSignOut} roleSwitcher={roleSwitcherElement} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
          <PageErrorBoundary>
            <Suspense fallback={<DashboardSkeleton />}>
              <AdminDashboard />
            </Suspense>
          </PageErrorBoundary>
        </main>
        <FloatingYvonneButton />
        <InactivityWarning open={showWarning} remainingSeconds={remainingSeconds} onStayActive={stayActive} onLogout={handleSignOut} />
        <PWAInstallPrompt />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} onSignOut={handleSignOut} roleSwitcher={roleSwitcherElement} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8" role="main">
        <PageErrorBoundary key={currentPage}>
          <Suspense fallback={getPageSkeleton(currentPage)}>
            {renderPatientPage()}
          </Suspense>
        </PageErrorBoundary>
      </main>
      <FloatingYvonneButton />
      <InactivityWarning open={showWarning} remainingSeconds={remainingSeconds} onStayActive={stayActive} onLogout={handleSignOut} />
      <KeyboardShortcutsHelp open={showShortcutsHelp} onOpenChange={setShowShortcutsHelp} />
      <PWAInstallPrompt />
    </div>
  );
};

export default Index;
