import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Heart, User, Phone, Shield, CheckCircle, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PatientOnboardingProps {
  userId: string;
  onComplete: () => void;
}

const STEPS = [
  { id: "welcome", title: "Welcome", description: "Let's set up your account" },
  { id: "profile", title: "Profile", description: "Basic information" },
  { id: "medical", title: "Medical Info", description: "Your health background" },
  { id: "emergency", title: "Emergency Contact", description: "For safety" },
  { id: "consent", title: "Privacy & Consent", description: "Your data preferences" },
  { id: "complete", title: "All Set!", description: "You're ready to go" },
];

export const PatientOnboarding = ({ userId, onComplete }: PatientOnboardingProps) => {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    phone: "",
    dateOfBirth: "",
    medicalHistory: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    insuranceProvider: "",
    insuranceId: "",
    consentDataCollection: true,
    consentAnalytics: true,
    consentAI: true,
    consentClinicianSharing: true,
    consentSMS: false,
  });

  const update = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  const handleSaveAndContinue = async () => {
    setSaving(true);
    try {
      if (step === 1) {
        // Save profile
        await supabase.from("profiles").update({
          phone: formData.phone || null,
          date_of_birth: formData.dateOfBirth || null,
        }).eq("user_id", userId);
      } else if (step === 2) {
        // Save medical info
        const { data: existing } = await supabase.from("patient_details").select("id").eq("user_id", userId).maybeSingle();
        if (existing) {
          await supabase.from("patient_details").update({
            medical_history: formData.medicalHistory || null,
            insurance_provider: formData.insuranceProvider || null,
            insurance_id: formData.insuranceId || null,
          }).eq("user_id", userId);
        } else {
          await supabase.from("patient_details").insert({
            user_id: userId,
            medical_history: formData.medicalHistory || null,
            insurance_provider: formData.insuranceProvider || null,
            insurance_id: formData.insuranceId || null,
          });
        }
      } else if (step === 3) {
        // Save emergency contact
        const { data: existing } = await supabase.from("patient_details").select("id").eq("user_id", userId).maybeSingle();
        if (existing) {
          await supabase.from("patient_details").update({
            emergency_contact_name: formData.emergencyContactName || null,
            emergency_contact_phone: formData.emergencyContactPhone || null,
          }).eq("user_id", userId);
        } else {
          await supabase.from("patient_details").insert({
            user_id: userId,
            emergency_contact_name: formData.emergencyContactName || null,
            emergency_contact_phone: formData.emergencyContactPhone || null,
          });
        }
      } else if (step === 4) {
        // Save consent flags
        const consentFlags = {
          data_collection: formData.consentDataCollection,
          health_analytics: formData.consentAnalytics,
          ai_insights: formData.consentAI,
          data_sharing_clinician: formData.consentClinicianSharing,
          sms_notifications: formData.consentSMS,
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          last_reviewed_at: new Date().toISOString(),
        };
        await supabase.from("profiles").update({
          consent_flags: JSON.parse(JSON.stringify(consentFlags)),
        }).eq("user_id", userId);
      }

      setStep((s) => s + 1);
    } catch (error: any) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 0: // Welcome
        return (
          <div className="text-center space-y-6 py-8">
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Heart className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Welcome to DiabeSure! 🎉</h2>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Let's set up your profile in a few quick steps so we can provide you with personalized diabetes management.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto text-center">
              <div className="p-3 rounded-lg bg-primary/5">
                <p className="text-xs text-muted-foreground">Track</p>
                <p className="text-sm font-medium">Glucose & Meals</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/5">
                <p className="text-xs text-muted-foreground">Get</p>
                <p className="text-sm font-medium">AI Insights</p>
              </div>
              <div className="p-3 rounded-lg bg-accent/5">
                <p className="text-xs text-muted-foreground">Connect</p>
                <p className="text-sm font-medium">With Clinician</p>
              </div>
            </div>
            <Button onClick={() => setStep(1)} size="lg">
              Get Started <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
          </div>
        );

      case 1: // Profile
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" placeholder="+254 7XX XXX XXX" value={formData.phone} onChange={(e) => update("phone", e.target.value)} />
              <p className="text-xs text-muted-foreground">Kenyan mobile number for medication reminders</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input id="dob" type="date" value={formData.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} />
            </div>
          </div>
        );

      case 2: // Medical info
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Medical History</Label>
              <Textarea placeholder="Any conditions, surgeries, or relevant medical history..." value={formData.medicalHistory} onChange={(e) => update("medicalHistory", e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Insurance Provider</Label>
                <Input placeholder="e.g., NHIF, Jubilee, AAR" value={formData.insuranceProvider} onChange={(e) => update("insuranceProvider", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Insurance ID</Label>
                <Input placeholder="Your policy number" value={formData.insuranceId} onChange={(e) => update("insuranceId", e.target.value)} />
              </div>
            </div>
          </div>
        );

      case 3: // Emergency contact
        return (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-sm text-muted-foreground">
              <Phone className="h-4 w-4 inline mr-2 text-destructive" />
              This contact will be notified only in case of critical health emergencies.
            </div>
            <div className="space-y-2">
              <Label>Contact Name</Label>
              <Input placeholder="Full name" value={formData.emergencyContactName} onChange={(e) => update("emergencyContactName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input placeholder="+254 7XX XXX XXX" value={formData.emergencyContactPhone} onChange={(e) => update("emergencyContactPhone", e.target.value)} />
            </div>
          </div>
        );

      case 4: // Consent
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose how your health data is used. Compliant with the Kenya Data Protection Act (2019).
            </p>
            {[
              { key: "consentDataCollection", label: "Health Data Collection", desc: "Store glucose, nutrition, and exercise data", required: true },
              { key: "consentAnalytics", label: "Health Analytics", desc: "Analyze patterns in your health data" },
              { key: "consentAI", label: "AI Recommendations", desc: "Let Dr. Yvonne provide personalized advice" },
              { key: "consentClinicianSharing", label: "Share with Clinician", desc: "Let your doctor view your health records" },
              { key: "consentSMS", label: "SMS Reminders", desc: "Receive medication reminders via SMS" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">
                    {item.label}
                    {(item as any).required && <Badge variant="secondary" className="ml-2 text-xs">Required</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={formData[item.key as keyof typeof formData] as boolean}
                  onCheckedChange={(v) => update(item.key, v)}
                  disabled={(item as any).required}
                />
              </div>
            ))}
          </div>
        );

      case 5: // Complete
        return (
          <div className="text-center space-y-6 py-8">
            <div className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">You're All Set! 🎉</h2>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Your profile is configured. Start by logging your first glucose reading or exploring the dashboard.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={onComplete} size="lg">
                <Sparkles className="h-5 w-5 mr-2" />
                Go to Dashboard
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Step {step + 1} of {STEPS.length}</span>
          <span className="text-sm text-muted-foreground">{STEPS[step].title}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {step < 5 ? STEPS[step].title : "Complete"}
          </CardTitle>
          <CardDescription>{STEPS[step].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {renderStepContent()}

          {step > 0 && step < 5 && (
            <div className="flex justify-between mt-6">
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />Back
              </Button>
              <Button onClick={handleSaveAndContinue} disabled={saving}>
                {saving ? "Saving..." : step === 4 ? "Complete Setup" : "Continue"}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
