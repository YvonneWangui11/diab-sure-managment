import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "./useAuth";

export function useAuditLog() {
  const logAction = async (
    action: string,
    targetEntity: string,
    targetId?: string,
    metadata?: Record<string, any>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      await supabase.from("audit_logs").insert({
        actor_id: user.id,
        actor_role: roleData?.role as UserRole,
        action,
        target_entity: targetEntity,
        target_id: targetId,
        metadata,
      });
    } catch (error) {
      console.error("Error logging audit:", error);
    }
  };

  return { logAction };
}
