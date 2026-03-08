
-- Assign the current patient to the test clinician
INSERT INTO public.doctor_patients (doctor_id, patient_id, status)
VALUES ('6e0c6bf5-6fca-4935-94e1-28f83a016628', 'a133ea16-c2ce-441a-8419-85fdf5299678', 'active')
ON CONFLICT DO NOTHING;

-- Also add a broader profiles SELECT policy so clinicians can see all patient profiles for messaging
-- (currently they can only see mapped patients)
CREATE POLICY "Clinicians can view all profiles for messaging"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'clinician'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);
