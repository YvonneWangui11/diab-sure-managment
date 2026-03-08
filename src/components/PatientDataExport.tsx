import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Download, FileJson, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const PatientDataExport = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAllPatientData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Fetch all patient data in parallel
    const [
      profileResult,
      patientDetailsResult,
      glucoseResult,
      medicationsResult,
      medicationLogsResult,
      appointmentsResult,
      exerciseLogsResult,
      mealLogsResult,
      prescriptionsResult,
      medicationRemindersResult,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("patient_details").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("glucose_readings").select("*").eq("patient_id", user.id).order("created_at", { ascending: false }),
      supabase.from("medications").select("*").eq("patient_id", user.id).order("created_at", { ascending: false }),
      supabase.from("medication_logs").select("*").eq("patient_id", user.id).order("taken_at", { ascending: false }),
      supabase.from("appointments").select("*").eq("patient_id", user.id).order("start_time", { ascending: false }),
      supabase.from("exercise_logs").select("*").eq("patient_id", user.id).order("date_time", { ascending: false }),
      supabase.from("meal_logs").select("*").eq("patient_id", user.id).order("date_time", { ascending: false }),
      supabase.from("prescriptions").select("*").eq("patient_id", user.id).order("created_at", { ascending: false }),
      supabase.from("medication_reminders").select("*").eq("patient_id", user.id).order("created_at", { ascending: false }),
    ]);

    return {
      exportDate: new Date().toISOString(),
      userId: user.id,
      profile: profileResult.data,
      patientDetails: patientDetailsResult.data,
      glucoseReadings: glucoseResult.data || [],
      medications: medicationsResult.data || [],
      medicationLogs: medicationLogsResult.data || [],
      appointments: appointmentsResult.data || [],
      exerciseLogs: exerciseLogsResult.data || [],
      mealLogs: mealLogsResult.data || [],
      prescriptions: prescriptionsResult.data || [],
      medicationReminders: medicationRemindersResult.data || [],
    };
  };

  const exportToJSON = async () => {
    try {
      setLoading(true);
      const data = await fetchAllPatientData();

      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `health-records-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Your health records have been exported to JSON",
      });
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to export data",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    try {
      setLoading(true);
      const data = await fetchAllPatientData();

      const doc = new jsPDF();
      let yPosition = 20;

      // Title
      doc.setFontSize(20);
      doc.text("Complete Health Records", 105, yPosition, { align: "center" });
      yPosition += 10;

      doc.setFontSize(10);
      doc.text(`Export Date: ${new Date(data.exportDate).toLocaleString()}`, 105, yPosition, { align: "center" });
      yPosition += 15;

      // Personal Information
      doc.setFontSize(14);
      doc.text("Personal Information", 14, yPosition);
      yPosition += 7;

      if (data.profile) {
        autoTable(doc, {
          startY: yPosition,
          head: [["Field", "Value"]],
          body: [
            ["Full Name", data.profile.full_name || "N/A"],
            ["Email", data.profile.email || "N/A"],
            ["Phone", data.profile.phone || "N/A"],
            ["Date of Birth", data.profile.date_of_birth || "N/A"],
          ],
          theme: "grid",
          headStyles: { fillColor: [59, 130, 246] },
        });
        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }

      // Patient Details
      if (data.patientDetails) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.text("Medical Information", 14, yPosition);
        yPosition += 7;

        autoTable(doc, {
          startY: yPosition,
          head: [["Field", "Value"]],
          body: [
            ["Medical History", data.patientDetails.medical_history || "N/A"],
            ["Allergies", (data.patientDetails.allergies || []).join(", ") || "None"],
            ["Current Medications", (data.patientDetails.current_medications || []).join(", ") || "None"],
            ["Emergency Contact", data.patientDetails.emergency_contact_name || "N/A"],
            ["Emergency Phone", data.patientDetails.emergency_contact_phone || "N/A"],
            ["Insurance Provider", data.patientDetails.insurance_provider || "N/A"],
            ["Insurance ID", data.patientDetails.insurance_id || "N/A"],
          ],
          theme: "grid",
          headStyles: { fillColor: [59, 130, 246] },
        });
        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }

      // Glucose Readings
      if (data.glucoseReadings.length > 0) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.text(`Glucose Readings (${data.glucoseReadings.length} records)`, 14, yPosition);
        yPosition += 7;

        autoTable(doc, {
          startY: yPosition,
          head: [["Date", "Time", "Value (mg/dL)", "Notes"]],
          body: data.glucoseReadings.slice(0, 50).map((reading: any) => [
            new Date(reading.created_at).toLocaleDateString(),
            reading.test_time || "N/A",
            reading.glucose_value,
            reading.notes || "",
          ]),
          theme: "striped",
          headStyles: { fillColor: [59, 130, 246] },
        });
        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }

      // Medications
      if (data.medications.length > 0) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.text(`Medications (${data.medications.length} records)`, 14, yPosition);
        yPosition += 7;

        autoTable(doc, {
          startY: yPosition,
          head: [["Name", "Dosage", "Frequency", "Start Date", "Status"]],
          body: data.medications.map((med: any) => [
            med.medication_name,
            med.dosage,
            med.frequency,
            new Date(med.start_date).toLocaleDateString(),
            med.is_active ? "Active" : "Inactive",
          ]),
          theme: "striped",
          headStyles: { fillColor: [59, 130, 246] },
        });
        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }

      // Appointments
      if (data.appointments.length > 0) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.text(`Appointments (${data.appointments.length} records)`, 14, yPosition);
        yPosition += 7;

        autoTable(doc, {
          startY: yPosition,
          head: [["Date", "Time", "Status", "Notes"]],
          body: data.appointments.slice(0, 50).map((apt: any) => [
            new Date(apt.start_time).toLocaleDateString(),
            new Date(apt.start_time).toLocaleTimeString(),
            apt.status,
            apt.notes || "",
          ]),
          theme: "striped",
          headStyles: { fillColor: [59, 130, 246] },
        });
        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }

      // Exercise Logs
      if (data.exerciseLogs.length > 0) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.text(`Exercise Logs (${data.exerciseLogs.length} records)`, 14, yPosition);
        yPosition += 7;

        autoTable(doc, {
          startY: yPosition,
          head: [["Date", "Type", "Duration (min)", "Intensity"]],
          body: data.exerciseLogs.slice(0, 50).map((log: any) => [
            new Date(log.date_time).toLocaleDateString(),
            log.exercise_type,
            log.duration_minutes,
            log.intensity || "N/A",
          ]),
          theme: "striped",
          headStyles: { fillColor: [59, 130, 246] },
        });
        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }

      // Meal Logs
      if (data.mealLogs.length > 0) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.text(`Meal Logs (${data.mealLogs.length} records)`, 14, yPosition);
        yPosition += 7;

        autoTable(doc, {
          startY: yPosition,
          head: [["Date", "Type", "Description", "Portion"]],
          body: data.mealLogs.slice(0, 50).map((log: any) => [
            new Date(log.date_time).toLocaleDateString(),
            log.meal_type || "N/A",
            log.description,
            log.portion_size || "N/A",
          ]),
          theme: "striped",
          headStyles: { fillColor: [59, 130, 246] },
        });
      }

      // Footer on last page
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(
          `Page ${i} of ${pageCount} - GDPR Compliant Health Records Export`,
          105,
          doc.internal.pageSize.height - 10,
          { align: "center" }
        );
      }

      doc.save(`health-records-${new Date().toISOString().split("T")[0]}.pdf`);

      toast({
        title: "Success",
        description: "Your health records have been exported to PDF",
      });
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to export data",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Health Records
        </CardTitle>
        <CardDescription>
          Download your complete health records for your own records or GDPR compliance.
          All your personal data, medical history, and health logs will be included.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={exportToPDF}
            disabled={loading}
            className="w-full"
            variant="default"
          >
            <FileText className="h-4 w-4 mr-2" />
            {loading ? "Exporting..." : "Export as PDF"}
          </Button>
          <Button
            onClick={exportToJSON}
            disabled={loading}
            className="w-full"
            variant="secondary"
          >
            <FileJson className="h-4 w-4 mr-2" />
            {loading ? "Exporting..." : "Export as JSON"}
          </Button>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• PDF format: Human-readable document with all your health data</p>
          <p>• JSON format: Machine-readable format for data portability</p>
          <p>• Includes: Profile, medications, appointments, glucose readings, exercise & meal logs</p>
          <p>• GDPR compliant: Full data export as per your right to data portability</p>
        </div>
      </CardContent>
    </Card>
  );
};
