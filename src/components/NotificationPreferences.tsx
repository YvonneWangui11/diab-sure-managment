import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Save, Smartphone, Mail, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Preferences {
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  medication_reminders: boolean;
  appointment_reminders: boolean;
  refill_alerts: boolean;
  reminder_advance_minutes: number;
}

const DEFAULTS: Preferences = {
  push_enabled: true,
  email_enabled: true,
  sms_enabled: false,
  medication_reminders: true,
  appointment_reminders: true,
  refill_alerts: true,
  reminder_advance_minutes: 30,
};

export const NotificationPreferences = () => {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [original, setOriginal] = useState<Preferences>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        const loaded: Preferences = {
          push_enabled: data.push_enabled ?? true,
          email_enabled: data.email_enabled ?? true,
          sms_enabled: data.sms_enabled ?? false,
          medication_reminders: data.medication_reminders ?? true,
          appointment_reminders: data.appointment_reminders ?? true,
          refill_alerts: data.refill_alerts ?? true,
          reminder_advance_minutes: data.reminder_advance_minutes ?? 30,
        };
        setPrefs(loaded);
        setOriginal(loaded);
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existing } = await supabase
        .from("notification_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase.from("notification_preferences").update({
          ...prefs,
        }).eq("user_id", user.id);
      } else {
        await supabase.from("notification_preferences").insert({
          user_id: user.id,
          ...prefs,
        });
      }

      setOriginal(prefs);
      toast({ title: "Notification preferences saved" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(prefs) !== JSON.stringify(original);
  const toggle = (key: keyof Preferences) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  if (loading) return <div className="text-center py-4">Loading preferences...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Notification Preferences
        </CardTitle>
        <CardDescription>Choose how and when you want to receive health reminders and alerts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Channels */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Channels</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Push Notifications</Label>
                  <p className="text-xs text-muted-foreground">Browser & app notifications</p>
                </div>
              </div>
              <Switch checked={prefs.push_enabled} onCheckedChange={() => toggle("push_enabled")} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">Important alerts to your email</p>
                </div>
              </div>
              <Switch checked={prefs.email_enabled} onCheckedChange={() => toggle("email_enabled")} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">SMS Alerts</Label>
                  <p className="text-xs text-muted-foreground">Critical alerts via SMS (+254 Kenya)</p>
                </div>
              </div>
              <Switch checked={prefs.sms_enabled} onCheckedChange={() => toggle("sms_enabled")} />
            </div>
          </div>
        </div>

        {/* Types */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Notification Types</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label className="text-sm font-medium">Medication Reminders</Label>
                <p className="text-xs text-muted-foreground">Reminders to take your medications on time</p>
              </div>
              <Switch checked={prefs.medication_reminders} onCheckedChange={() => toggle("medication_reminders")} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label className="text-sm font-medium">Appointment Reminders</Label>
                <p className="text-xs text-muted-foreground">Upcoming appointment notifications</p>
              </div>
              <Switch checked={prefs.appointment_reminders} onCheckedChange={() => toggle("appointment_reminders")} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label className="text-sm font-medium">Refill Alerts</Label>
                <p className="text-xs text-muted-foreground">Alerts when prescriptions are running low</p>
              </div>
              <Switch checked={prefs.refill_alerts} onCheckedChange={() => toggle("refill_alerts")} />
            </div>
          </div>
        </div>

        {/* Advance time */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Reminder Timing</h3>
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <Label className="text-sm font-medium">Advance Notice</Label>
              <p className="text-xs text-muted-foreground">How far in advance to send reminders</p>
            </div>
            <Select
              value={String(prefs.reminder_advance_minutes)}
              onValueChange={(v) => setPrefs((p) => ({ ...p, reminder_advance_minutes: Number(v) }))}
            >
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {hasChanges && (
          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
