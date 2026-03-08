
-- Create storage bucket for education resources
INSERT INTO storage.buckets (id, name, public)
VALUES ('education-resources', 'education-resources', true)
ON CONFLICT (id) DO NOTHING;

-- Create table to track uploaded education resources
CREATE TABLE public.education_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'General',
  file_path text NOT NULL,
  file_size bigint,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.education_uploads ENABLE ROW LEVEL SECURITY;

-- Everyone can view uploaded resources
CREATE POLICY "Anyone authenticated can view education uploads"
  ON public.education_uploads FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage uploads
CREATE POLICY "Admins can manage education uploads"
  ON public.education_uploads FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Storage policies for the bucket
CREATE POLICY "Anyone can read education resources"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'education-resources');

CREATE POLICY "Admins can upload education resources"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'education-resources' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete education resources"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'education-resources' AND has_role(auth.uid(), 'admin'::app_role));
