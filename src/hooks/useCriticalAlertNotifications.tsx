import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CriticalAlert {
  id: string;
  patient_id: string;
  doctor_id: string;
  alert_type: string;
  message: string;
  severity: string;
  resolved: boolean;
  created_at: string;
}

interface UseCriticalAlertNotificationsOptions {
  doctorId: string | undefined;
  enabled?: boolean;
  onNewCriticalAlert?: (alert: CriticalAlert) => void;
}

export const useCriticalAlertNotifications = ({
  doctorId,
  enabled = true,
  onNewCriticalAlert,
}: UseCriticalAlertNotificationsOptions) => {
  const { toast } = useToast();
  const seenAlertIds = useRef<Set<string>>(new Set());
  const isInitialLoad = useRef(true);

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback((alert: CriticalAlert) => {
    if (Notification.permission === "granted") {
      const notification = new Notification("🚨 Critical Health Alert", {
        body: alert.message,
        icon: "/favicon.ico",
        tag: alert.id,
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }, []);

  // Play alert sound
  const playAlertSound = useCallback(() => {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.value = 0.3;

      oscillator.start();
      
      // Create urgency pattern: beep-beep-beep
      setTimeout(() => {
        oscillator.frequency.value = 0;
        setTimeout(() => {
          oscillator.frequency.value = 800;
          setTimeout(() => {
            oscillator.frequency.value = 0;
            setTimeout(() => {
              oscillator.frequency.value = 800;
              setTimeout(() => {
                oscillator.stop();
                audioContext.close();
              }, 150);
            }, 100);
          }, 150);
        }, 100);
      }, 150);
    } catch (error) {
      console.log("Could not play alert sound:", error);
    }
  }, []);

  // Handle new critical alert
  const handleCriticalAlert = useCallback(async (alert: CriticalAlert) => {
    // Skip if we've already seen this alert
    if (seenAlertIds.current.has(alert.id)) {
      return;
    }

    // Mark as seen
    seenAlertIds.current.add(alert.id);

    // Fetch patient name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", alert.patient_id)
      .maybeSingle();

    const patientName = profile?.full_name || "Unknown Patient";

    // Show in-app toast with high priority styling
    toast({
      title: `🚨 CRITICAL ALERT: ${alert.alert_type.replace(/_/g, " ").toUpperCase()}`,
      description: (
        <div className="space-y-1">
          <p className="font-semibold">{patientName}</p>
          <p className="text-sm">{alert.message}</p>
        </div>
      ),
      variant: "destructive",
      duration: 30000, // Keep visible for 30 seconds
    });

    // Play sound for critical alerts
    if (alert.severity === "critical") {
      playAlertSound();
    }

    // Show browser notification
    showBrowserNotification({
      ...alert,
      message: `${patientName}: ${alert.message}`,
    });

    // Call custom handler if provided
    onNewCriticalAlert?.(alert);
  }, [toast, playAlertSound, showBrowserNotification, onNewCriticalAlert]);

  useEffect(() => {
    if (!doctorId || !enabled) return;

    // Request notification permission on mount
    requestNotificationPermission();

    // Load existing alerts to populate seen IDs (prevent notifications for old alerts)
    const loadExistingAlerts = async () => {
      const { data: existingAlerts } = await supabase
        .from("health_alerts")
        .select("id")
        .eq("doctor_id", doctorId)
        .eq("resolved", false);

      if (existingAlerts) {
        existingAlerts.forEach((alert) => seenAlertIds.current.add(alert.id));
      }
      
      // Mark initial load as complete
      isInitialLoad.current = false;
    };

    loadExistingAlerts();

    // Subscribe to new health alerts
    const channel = supabase
      .channel(`critical-alerts-${doctorId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "health_alerts",
          filter: `doctor_id=eq.${doctorId}`,
        },
        async (payload) => {
          const newAlert = payload.new as CriticalAlert;
          
          // Only notify for critical/warning severity and if not during initial load
          if (!isInitialLoad.current && (newAlert.severity === "critical" || newAlert.severity === "warning")) {
            handleCriticalAlert(newAlert);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctorId, enabled, handleCriticalAlert, requestNotificationPermission]);

  return {
    requestNotificationPermission,
  };
};
