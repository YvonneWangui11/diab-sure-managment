import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Save, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";

interface ConsentFlags {
  data_collection: boolean;
  health_analytics: boolean;
  ai_insights: boolean;
  sms_notifications: boolean;
  data_sharing_clinician: boolean;
  research_participation: boolean;
  terms_accepted: boolean;
  terms_accepted_at?: string;
  last_reviewed_at?: string;
}

const DEFAULT_CONSENT: ConsentFlags = {
  data_collection: true,
  health_analytics: true,
  ai_insights: true,
  sms_notifications: false,
  data_sharing_clinician: true,
  research_participation: false,
  terms_accepted: false,
};

const CONSENT_ITEMS = [
  {
    key: "data_collection" as const,
    label: "Health Data Collection",
    description: "Allow DiabeSure to collect and store your glucose, nutrition, exercise, and medication data.",
    required: true,
  },
  {
    key: "health_analytics" as const,
    label: "Health Analytics & Trends",
    description: "Enable analysis of your health data to identify patterns and generate insights.",
    required: false,
  },
  {
    key: "ai_insights" as const,
    label: "AI-Powered Recommendations",
    description: "Allow Dr. Yvonne AI to use your health data for personalized advice and predictions.",
    required: false,
  },
  {
    key: "data_sharing_clinician" as const,
    label: "Share Data with Clinician",
    description: "Allow your assigned healthcare provider to view your health records and trends.",
    required: false,
  },
  {
    key: "sms_notifications" as const,
    label: "SMS Notifications",
    description: "Receive critical health alerts and medication reminders via SMS (Kenya +254 numbers).",
    required: false,
  },
  {
    key: "research_participation" as const,
    label: "Anonymized Research Data",
    description: "Contribute anonymized health data to improve diabetes care in Kenya (Kenya Data Protection Act compliant).",
    required: false,
  },
];

export const ConsentManager = () => {
  const [consent, setConsent] = useState<ConsentFlags>(DEFAULT_CONSENT);
  const [originalConsent, setOriginalConsent] = useState<ConsentFlags>(DEFAULT_CONSENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { logAction } = useAuditLog();

  useEffect(() => {
    loadConsent();
  }, []);

  const loadConsent = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("consent_flags")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.consent_flags && typeof profile.consent_flags === "object") {
        const flags = { ...DEFAULT_CONSENT, ...(profile.consent_flags as Record<string, unknown>) } as ConsentFlags;
        setConsent(flags);
        setOriginalConsent(flags);
      }
    } catch (error) {
      console.error("Error loading consent:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof ConsentFlags) => {
    const item = CONSENT_ITEMS.find((i) => i.key === key);
    if (item?.required) return; // Can't toggle required consents
    setConsent((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasChanges = JSON.stringify(consent) !== JSON.stringify(originalConsent);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updatedConsent = {
        ...consent,
        last_reviewed_at: new Date().toISOString(),
        terms_accepted: true,
        terms_accepted_at: consent.terms_accepted
          ? consent.terms_accepted_at
          : new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .update({ consent_flags: JSON.parse(JSON.stringify(updatedConsent)) })
        .eq("user_id", user.id);

      if (error) throw error;

      await logAction("UPDATE_CONSENT", "consent_flags", user.id, {
        changes: Object.keys(consent).filter(
          (k) => consent[k as keyof ConsentFlags] !== originalConsent[k as keyof ConsentFlags]
        ),
      });

      setOriginalConsent(updatedConsent);
      setConsent(updatedConsent);
      toast({
        title: "Consent preferences saved",
        description: "Your data privacy preferences have been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving preferences",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading consent preferences...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Data Privacy & Consent
        </CardTitle>
        <CardDescription>
          Manage how your health data is used. Compliant with the Kenya Data Protection Act (2019) and GDPR.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {CONSENT_ITEMS.map((item) => (
          <div
            key={item.key}
            className="flex items-start justify-between gap-4 pb-4 border-b border-border last:border-0 last:pb-0"
          >
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <Label htmlFor={item.key} className="text-sm font-medium cursor-pointer">
                  {item.label}
                </Label>
                {item.required && (
                  <Badge variant="secondary" className="text-xs">
                    Required
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
            <Switch
              id={item.key}
              checked={consent[item.key] as boolean}
              onCheckedChange={() => handleToggle(item.key)}
              disabled={item.required}
              aria-label={`${consent[item.key] ? "Disable" : "Enable"} ${item.label}`}
            />
          </div>
        ))}

        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <Info className="h-4 w-4 shrink-0" />
          <p>
            {consent.last_reviewed_at
              ? `Last reviewed: ${new Date(consent.last_reviewed_at).toLocaleDateString("en-KE")}`
              : "You haven't reviewed your consent preferences yet."}
          </p>
        </div>

        {hasChanges && (
          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
