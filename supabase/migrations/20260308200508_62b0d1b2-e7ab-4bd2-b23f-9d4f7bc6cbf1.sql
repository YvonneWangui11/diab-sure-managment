
-- Care Plans table
CREATE TABLE public.care_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  clinician_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Care Plan Goals table
CREATE TABLE public.care_plan_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_plan_id UUID NOT NULL REFERENCES public.care_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_value TEXT,
  current_value TEXT,
  goal_type TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'in_progress',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.care_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_plan_goals ENABLE ROW LEVEL SECURITY;

-- Care Plans RLS policies
CREATE POLICY "Clinicians can manage care plans for assigned patients"
  ON public.care_plans FOR ALL TO authenticated
  USING (
    auth.uid() = clinician_id
    OR has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    auth.uid() = clinician_id
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Patients can view own care plans"
  ON public.care_plans FOR SELECT TO authenticated
  USING (auth.uid() = patient_id);

-- Care Plan Goals RLS policies
CREATE POLICY "Clinicians can manage goals for their care plans"
  ON public.care_plan_goals FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.care_plans cp
      WHERE cp.id = care_plan_goals.care_plan_id
      AND (cp.clinician_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.care_plans cp
      WHERE cp.id = care_plan_goals.care_plan_id
      AND (cp.clinician_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Patients can view goals for their care plans"
  ON public.care_plan_goals FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.care_plans cp
      WHERE cp.id = care_plan_goals.care_plan_id
      AND cp.patient_id = auth.uid()
    )
  );

CREATE POLICY "Patients can update goal progress"
  ON public.care_plan_goals FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.care_plans cp
      WHERE cp.id = care_plan_goals.care_plan_id
      AND cp.patient_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.care_plans cp
      WHERE cp.id = care_plan_goals.care_plan_id
      AND cp.patient_id = auth.uid()
    )
  );

-- Updated_at triggers
CREATE TRIGGER care_plans_updated_at
  BEFORE UPDATE ON public.care_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER care_plan_goals_updated_at
  BEFORE UPDATE ON public.care_plan_goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
