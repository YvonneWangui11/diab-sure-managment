import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, message, alertType } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const atApiKey = Deno.env.get('AT_API_KEY');
    const atUsername = Deno.env.get('AT_USERNAME');

    if (!atApiKey || !atUsername) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'SMS service not configured. Set AT_API_KEY and AT_USERNAME secrets.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get user profile with phone and consent
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, phone, contact_phone, consent_flags')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ success: false, message: 'User profile not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check SMS consent per Kenya Data Protection Act
    const consentFlags = profile.consent_flags as Record<string, boolean> | null;
    if (!consentFlags?.sms_consent) {
      return new Response(
        JSON.stringify({ success: false, message: 'User has not consented to SMS communication' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const phone = profile.phone || profile.contact_phone;
    if (!phone) {
      return new Response(
        JSON.stringify({ success: false, message: 'No phone number on file' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone for Kenya (ensure +254 prefix)
    let formattedPhone = phone.replace(/\s+/g, '').replace(/-/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+254' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    // Send via Africa's Talking
    const atUrl = 'https://api.africastalking.com/version1/messaging';
    const smsBody = new URLSearchParams({
      username: atUsername,
      to: formattedPhone,
      message: `DiabeSure Alert: ${message}`,
      from: 'DiabeSure',
    });

    const smsResponse = await fetch(atUrl, {
      method: 'POST',
      headers: {
        'apiKey': atApiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: smsBody.toString(),
    });

    const smsResult = await smsResponse.json();

    // Log the SMS send attempt
    await supabase.rpc('log_audit_event', {
      p_action: 'sms_sent',
      p_target_entity: 'profiles',
      p_target_id: userId,
      p_metadata: { alert_type: alertType, phone: formattedPhone, result: smsResult },
    });

    return new Response(
      JSON.stringify({ success: true, result: smsResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
