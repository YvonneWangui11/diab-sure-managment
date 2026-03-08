import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Phone, Calendar, Edit, Save, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PatientDataExport } from "./PatientDataExport";
import { DataDeletionRequest } from "./DataDeletionRequest";
import { ConsentManager } from "./ConsentManager";
import { NotificationPreferences } from "./NotificationPreferences";

interface ProfilePageProps {
  onSignOut: () => void;
}

export const ProfilePage = ({ onSignOut }: ProfilePageProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    specialization: "",
    licenseNumber: "",
    hospitalAffiliation: "",
    yearsOfExperience: 0,
    consultationFee: 0,
    availabilityHours: "",
    medicalHistory: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    insuranceProvider: "",
    insuranceId: "",
    allergies: [] as string[],
    currentMedications: [] as string[],
  });
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();

      if (profile) {
        setProfileData(prev => ({
          ...prev,
          name: profile.full_name || "",
          email: profile.email || "",
          phone: profile.phone || "",
          dateOfBirth: profile.date_of_birth || "",
        }));

        const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
        const role = roleData?.role || "";
        setUserRole(role);

        if (role === 'clinician') {
          const { data: doctorDetails } = await supabase.from('doctor_details').select('*').eq('user_id', user.id).single();
          if (doctorDetails) {
            setProfileData(prev => ({
              ...prev,
              specialization: doctorDetails.specialization || "",
              licenseNumber: doctorDetails.license_number || "",
              hospitalAffiliation: doctorDetails.hospital_affiliation || "",
              yearsOfExperience: doctorDetails.years_of_experience || 0,
              consultationFee: doctorDetails.consultation_fee || 0,
              availabilityHours: doctorDetails.availability_hours || "",
            }));
          }
        } else if (role === 'patient') {
          const { data: patientDetails } = await supabase.from('patient_details').select('*').eq('user_id', user.id).single();
          if (patientDetails) {
            setProfileData(prev => ({
              ...prev,
              medicalHistory: patientDetails.medical_history || "",
              emergencyContactName: patientDetails.emergency_contact_name || "",
              emergencyContactPhone: patientDetails.emergency_contact_phone || "",
              insuranceProvider: patientDetails.insurance_provider || "",
              insuranceId: patientDetails.insurance_id || "",
              allergies: patientDetails.allergies || [],
              currentMedications: patientDetails.current_medications || [],
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: profileData.name, phone: profileData.phone, date_of_birth: profileData.dateOfBirth })
        .eq('user_id', user.id);
      if (profileError) throw profileError;

      if (userRole === 'clinician') {
        const { error } = await supabase.from('doctor_details').update({
          specialization: profileData.specialization,
          license_number: profileData.licenseNumber,
          hospital_affiliation: profileData.hospitalAffiliation,
          years_of_experience: profileData.yearsOfExperience,
          consultation_fee: profileData.consultationFee,
          availability_hours: profileData.availabilityHours,
        }).eq('user_id', user.id);
        if (error) throw error;
      } else if (userRole === 'patient') {
        const { error } = await supabase.from('patient_details').update({
          medical_history: profileData.medicalHistory,
          emergency_contact_name: profileData.emergencyContactName,
          emergency_contact_phone: profileData.emergencyContactPhone,
          insurance_provider: profileData.insuranceProvider,
          insurance_id: profileData.insuranceId,
        }).eq('user_id', user.id);
        if (error) throw error;
      }

      setIsEditing(false);
      toast({ title: "Profile updated successfully!", description: "Your changes have been saved." });
    } catch (error: any) {
      toast({ title: "Error updating profile", description: error.message, variant: "destructive" });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onSignOut();
  };

  const handleInputChange = (field: string, value: string | number) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return <div className="p-8 text-center">Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">Manage your personal information and preferences</p>
        </div>
        <div className="flex gap-2">
          <Button variant={isEditing ? "default" : "outline"} onClick={isEditing ? handleSave : () => setIsEditing(true)}>
            {isEditing ? <Save className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
            {isEditing ? "Save Changes" : "Edit Profile"}
          </Button>
          <Button variant="destructive" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </CardTitle>
          <Badge variant="secondary" className="mb-4">
            {userRole === 'clinician' ? 'Clinician Profile' : userRole === 'patient' ? 'Patient Profile' : 'Admin Profile'}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={profileData.name} onChange={(e) => handleInputChange("name", e.target.value)} disabled={!isEditing} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={profileData.email} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" value={profileData.phone} onChange={(e) => handleInputChange("phone", e.target.value)} disabled={!isEditing} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input id="dateOfBirth" type="date" value={profileData.dateOfBirth} onChange={(e) => handleInputChange("dateOfBirth", e.target.value)} disabled={!isEditing} />
            </div>
          </div>
        </CardContent>
      </Card>

      {userRole === 'clinician' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />Doctor Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="specialization">Specialization</Label><Input id="specialization" value={profileData.specialization} onChange={(e) => handleInputChange("specialization", e.target.value)} disabled={!isEditing} /></div>
              <div className="space-y-2"><Label htmlFor="licenseNumber">License Number</Label><Input id="licenseNumber" value={profileData.licenseNumber} onChange={(e) => handleInputChange("licenseNumber", e.target.value)} disabled={!isEditing} /></div>
              <div className="space-y-2"><Label htmlFor="hospitalAffiliation">Hospital Affiliation</Label><Input id="hospitalAffiliation" value={profileData.hospitalAffiliation} onChange={(e) => handleInputChange("hospitalAffiliation", e.target.value)} disabled={!isEditing} /></div>
              <div className="space-y-2"><Label htmlFor="yearsOfExperience">Years of Experience</Label><Input id="yearsOfExperience" type="number" value={profileData.yearsOfExperience} onChange={(e) => handleInputChange("yearsOfExperience", parseInt(e.target.value) || 0)} disabled={!isEditing} /></div>
              <div className="space-y-2"><Label htmlFor="consultationFee">Consultation Fee ($)</Label><Input id="consultationFee" type="number" step="0.01" value={profileData.consultationFee} onChange={(e) => handleInputChange("consultationFee", parseFloat(e.target.value) || 0)} disabled={!isEditing} /></div>
              <div className="space-y-2"><Label htmlFor="availabilityHours">Availability Hours</Label><Input id="availabilityHours" value={profileData.availabilityHours} onChange={(e) => handleInputChange("availabilityHours", e.target.value)} disabled={!isEditing} placeholder="e.g., Mon-Fri 9AM-5PM" /></div>
            </div>
          </CardContent>
        </Card>
      )}

      {userRole === 'patient' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />Medical Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="medicalHistory">Medical History</Label>
                <Textarea id="medicalHistory" value={profileData.medicalHistory} onChange={(e) => handleInputChange("medicalHistory", e.target.value)} disabled={!isEditing} rows={3} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Phone className="w-5 h-5" />Emergency Contact</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="emergencyContactName">Contact Name</Label><Input id="emergencyContactName" value={profileData.emergencyContactName} onChange={(e) => handleInputChange("emergencyContactName", e.target.value)} disabled={!isEditing} /></div>
                <div className="space-y-2"><Label htmlFor="emergencyContactPhone">Contact Phone</Label><Input id="emergencyContactPhone" value={profileData.emergencyContactPhone} onChange={(e) => handleInputChange("emergencyContactPhone", e.target.value)} disabled={!isEditing} /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" />Insurance Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="insuranceProvider">Insurance Provider</Label><Input id="insuranceProvider" value={profileData.insuranceProvider} onChange={(e) => handleInputChange("insuranceProvider", e.target.value)} disabled={!isEditing} /></div>
                <div className="space-y-2"><Label htmlFor="insuranceId">Insurance ID</Label><Input id="insuranceId" value={profileData.insuranceId} onChange={(e) => handleInputChange("insuranceId", e.target.value)} disabled={!isEditing} /></div>
              </div>
            </CardContent>
          </Card>

          <ConsentManager />
          <PatientDataExport />
          <DataDeletionRequest />
        </>
      )}

      {userRole === 'clinician' && <ConsentManager />}
    </div>
  );
};
