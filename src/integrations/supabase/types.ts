export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          achievement_name: string
          achievement_type: string
          description: string | null
          earned_at: string
          icon: string
          id: string
          points: number
          user_id: string
        }
        Insert: {
          achievement_name: string
          achievement_type: string
          description?: string | null
          earned_at?: string
          icon?: string
          id?: string
          points?: number
          user_id: string
        }
        Update: {
          achievement_name?: string
          achievement_type?: string
          description?: string | null
          earned_at?: string
          icon?: string
          id?: string
          points?: number
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_published: boolean
          priority: string
          published_at: string | null
          target_role: Database["public"]["Enums"]["app_role"] | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_published?: boolean
          priority?: string
          published_at?: string | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_published?: boolean
          priority?: string
          published_at?: string | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          created_at: string
          doctor_id: string
          end_time: string | null
          id: string
          notes: string | null
          patient_id: string
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          end_time?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["app_role"] | null
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json | null
          target_entity: string
          target_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          target_entity: string
          target_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          target_entity?: string
          target_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      care_plan_goals: {
        Row: {
          care_plan_id: string
          completed_at: string | null
          created_at: string
          current_value: string | null
          description: string | null
          due_date: string | null
          goal_type: string
          id: string
          status: string
          target_value: string | null
          title: string
          updated_at: string
        }
        Insert: {
          care_plan_id: string
          completed_at?: string | null
          created_at?: string
          current_value?: string | null
          description?: string | null
          due_date?: string | null
          goal_type?: string
          id?: string
          status?: string
          target_value?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          care_plan_id?: string
          completed_at?: string | null
          created_at?: string
          current_value?: string | null
          description?: string | null
          due_date?: string | null
          goal_type?: string
          id?: string
          status?: string
          target_value?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_plan_goals_care_plan_id_fkey"
            columns: ["care_plan_id"]
            isOneToOne: false
            referencedRelation: "care_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      care_plans: {
        Row: {
          clinician_id: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          patient_id: string
          start_date: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          clinician_id: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          patient_id: string
          start_date?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          clinician_id?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          patient_id?: string
          start_date?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      data_retention_flags: {
        Row: {
          action_taken: string | null
          created_at: string
          data_type: string
          flagged_at: string
          id: string
          notes: string | null
          record_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          data_type: string
          flagged_at?: string
          id?: string
          notes?: string | null
          record_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          user_id: string
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          data_type?: string
          flagged_at?: string
          id?: string
          notes?: string | null
          record_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      data_retention_policies: {
        Row: {
          created_at: string
          data_type: string
          id: string
          is_active: boolean | null
          retention_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_type: string
          id?: string
          is_active?: boolean | null
          retention_days: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_type?: string
          id?: string
          is_active?: boolean | null
          retention_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      deletion_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          request_type: string
          requested_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          request_type: string
          requested_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          request_type?: string
          requested_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      doctor_details: {
        Row: {
          availability_hours: string | null
          consultation_fee: number | null
          created_at: string
          hospital_affiliation: string | null
          id: string
          license_number: string
          specialization: string
          updated_at: string
          user_id: string
          years_of_experience: number | null
        }
        Insert: {
          availability_hours?: string | null
          consultation_fee?: number | null
          created_at?: string
          hospital_affiliation?: string | null
          id?: string
          license_number: string
          specialization: string
          updated_at?: string
          user_id: string
          years_of_experience?: number | null
        }
        Update: {
          availability_hours?: string | null
          consultation_fee?: number | null
          created_at?: string
          hospital_affiliation?: string | null
          id?: string
          license_number?: string
          specialization?: string
          updated_at?: string
          user_id?: string
          years_of_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      doctor_patients: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          patient_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          patient_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          patient_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      education_content: {
        Row: {
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      engagement_points: {
        Row: {
          created_at: string
          id: string
          points: number
          reason: string
          source_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points: number
          reason: string
          source_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          reason?: string
          source_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      engagement_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_activity_date: string | null
          longest_streak: number
          streak_type: string
          total_days_active: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          streak_type: string
          total_days_active?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          streak_type?: string
          total_days_active?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exercise_logs: {
        Row: {
          created_at: string
          date_time: string
          duration_minutes: number
          exercise_type: string
          id: string
          intensity: string | null
          note: string | null
          patient_id: string
        }
        Insert: {
          created_at?: string
          date_time?: string
          duration_minutes: number
          exercise_type: string
          id?: string
          intensity?: string | null
          note?: string | null
          patient_id: string
        }
        Update: {
          created_at?: string
          date_time?: string
          duration_minutes?: number
          exercise_type?: string
          id?: string
          intensity?: string | null
          note?: string | null
          patient_id?: string
        }
        Relationships: []
      }
      glucose_readings: {
        Row: {
          created_at: string
          glucose_value: number
          id: string
          notes: string | null
          patient_id: string
          test_time: string
        }
        Insert: {
          created_at?: string
          glucose_value: number
          id?: string
          notes?: string | null
          patient_id: string
          test_time: string
        }
        Update: {
          created_at?: string
          glucose_value?: number
          id?: string
          notes?: string | null
          patient_id?: string
          test_time?: string
        }
        Relationships: []
      }
      health_alerts: {
        Row: {
          alert_type: string
          created_at: string
          doctor_id: string
          id: string
          message: string
          patient_id: string
          resolved: boolean
          severity: string
          updated_at: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          doctor_id: string
          id?: string
          message: string
          patient_id: string
          resolved?: boolean
          severity?: string
          updated_at?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          doctor_id?: string
          id?: string
          message?: string
          patient_id?: string
          resolved?: boolean
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      meal_logs: {
        Row: {
          created_at: string
          date_time: string
          description: string
          id: string
          meal_type: string | null
          note: string | null
          patient_id: string
          photo_url: string | null
          portion_size: string | null
        }
        Insert: {
          created_at?: string
          date_time?: string
          description: string
          id?: string
          meal_type?: string | null
          note?: string | null
          patient_id: string
          photo_url?: string | null
          portion_size?: string | null
        }
        Update: {
          created_at?: string
          date_time?: string
          description?: string
          id?: string
          meal_type?: string | null
          note?: string | null
          patient_id?: string
          photo_url?: string | null
          portion_size?: string | null
        }
        Relationships: []
      }
      medication_intake: {
        Row: {
          created_at: string
          id: string
          note: string | null
          patient_id: string
          prescription_id: string
          scheduled_time: string
          status: string | null
          taken_time: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          patient_id: string
          prescription_id: string
          scheduled_time: string
          status?: string | null
          taken_time?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          patient_id?: string
          prescription_id?: string
          scheduled_time?: string
          status?: string | null
          taken_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medication_intake_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_logs: {
        Row: {
          created_at: string
          id: string
          medication_id: string
          notes: string | null
          patient_id: string
          status: string
          taken_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          medication_id: string
          notes?: string | null
          patient_id: string
          status?: string
          taken_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          medication_id?: string
          notes?: string | null
          patient_id?: string
          status?: string
          taken_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_medication_logs_medication"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_reminders: {
        Row: {
          created_at: string | null
          days_of_week: number[] | null
          id: string
          is_active: boolean | null
          medication_id: string
          patient_id: string
          reminder_time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          days_of_week?: number[] | null
          id?: string
          is_active?: boolean | null
          medication_id: string
          patient_id: string
          reminder_time: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          days_of_week?: number[] | null
          id?: string
          is_active?: boolean | null
          medication_id?: string
          patient_id?: string
          reminder_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medication_reminders_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          created_at: string
          doctor_id: string
          dosage: string
          end_date: string | null
          frequency: string
          id: string
          instructions: string | null
          is_active: boolean
          medication_name: string
          patient_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          dosage: string
          end_date?: string | null
          frequency: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          medication_name: string
          patient_id: string
          start_date?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          dosage?: string
          end_date?: string | null
          frequency?: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          medication_name?: string
          patient_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          channel: string | null
          content: string
          created_at: string
          delivered_at: string | null
          from_user_id: string | null
          id: string
          parent_message_id: string | null
          read_at: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
          template_id: string | null
          thread_id: string | null
          to_clinician_id: string | null
          to_patient_id: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          channel?: string | null
          content: string
          created_at?: string
          delivered_at?: string | null
          from_user_id?: string | null
          id?: string
          parent_message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template_id?: string | null
          thread_id?: string | null
          to_clinician_id?: string | null
          to_patient_id?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          channel?: string | null
          content?: string
          created_at?: string
          delivered_at?: string | null
          from_user_id?: string | null
          id?: string
          parent_message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template_id?: string | null
          thread_id?: string | null
          to_clinician_id?: string | null
          to_patient_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          appointment_reminders: boolean | null
          created_at: string | null
          email_enabled: boolean | null
          id: string
          medication_reminders: boolean | null
          push_enabled: boolean | null
          refill_alerts: boolean | null
          reminder_advance_minutes: number | null
          sms_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          appointment_reminders?: boolean | null
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          medication_reminders?: boolean | null
          push_enabled?: boolean | null
          refill_alerts?: boolean | null
          reminder_advance_minutes?: number | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          appointment_reminders?: boolean | null
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          medication_reminders?: boolean | null
          push_enabled?: boolean | null
          refill_alerts?: boolean | null
          reminder_advance_minutes?: number | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      patient_details: {
        Row: {
          allergies: string[] | null
          created_at: string
          current_medications: string[] | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          id: string
          insurance_id: string | null
          insurance_provider: string | null
          medical_history: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: string[] | null
          created_at?: string
          current_medications?: string[] | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          insurance_id?: string | null
          insurance_provider?: string | null
          medical_history?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string[] | null
          created_at?: string
          current_medications?: string[] | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          insurance_id?: string | null
          insurance_provider?: string | null
          medical_history?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      pinned_messages: {
        Row: {
          id: string
          message_id: string
          pinned_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          pinned_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          pinned_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinned_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          clinician_id: string | null
          created_at: string
          dosage: string
          drug_name: string
          end_date: string | null
          frequency: string
          id: string
          instructions: string | null
          patient_id: string
          quantity: number | null
          start_date: string
          status: string | null
          updated_at: string
        }
        Insert: {
          clinician_id?: string | null
          created_at?: string
          dosage: string
          drug_name: string
          end_date?: string | null
          frequency: string
          id?: string
          instructions?: string | null
          patient_id: string
          quantity?: number | null
          start_date: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          clinician_id?: string | null
          created_at?: string
          dosage?: string
          drug_name?: string
          end_date?: string | null
          frequency?: string
          id?: string
          instructions?: string | null
          patient_id?: string
          quantity?: number | null
          start_date?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bmi: number | null
          consent_flags: Json | null
          contact_phone: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          sex: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bmi?: number | null
          consent_flags?: Json | null
          contact_phone?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          full_name: string
          id?: string
          phone?: string | null
          sex?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bmi?: number | null
          consent_flags?: Json | null
          contact_phone?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          sex?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_target_entity: string
          p_target_id?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "patient" | "clinician" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["patient", "clinician", "admin"],
    },
  },
} as const
