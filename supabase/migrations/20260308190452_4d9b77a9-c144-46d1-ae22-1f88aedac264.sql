
-- Create a function to auto-create profile and role if missing (safety net)
CREATE OR REPLACE FUNCTION public.ensure_user_setup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create profile if not exists
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Create default role if not exists
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'patient'));
  END IF;

  RETURN NEW;
END;
$$;

-- Insert missing profile for existing user
INSERT INTO public.profiles (user_id, full_name, email)
VALUES ('a133ea16-c2ce-441a-8419-85fdf5299678', 'mmme', 'bnjoroge090@gmail.com')
ON CONFLICT (user_id) DO NOTHING;

-- Insert missing role for existing user
INSERT INTO public.user_roles (user_id, role)
VALUES ('a133ea16-c2ce-441a-8419-85fdf5299678', 'patient')
ON CONFLICT (user_id, role) DO NOTHING;
