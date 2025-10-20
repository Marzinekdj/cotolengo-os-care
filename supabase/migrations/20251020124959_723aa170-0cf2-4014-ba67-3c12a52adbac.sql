-- Create service_departments table
CREATE TABLE public.service_departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS on service_departments
ALTER TABLE public.service_departments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_departments
CREATE POLICY "Anyone can view active departments"
  ON public.service_departments
  FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'coordenacao'));

CREATE POLICY "Coordenacao can manage all departments"
  ON public.service_departments
  FOR ALL
  USING (has_role(auth.uid(), 'coordenacao'))
  WITH CHECK (has_role(auth.uid(), 'coordenacao'));

CREATE POLICY "Authenticated users can create departments"
  ON public.service_departments
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Insert default departments
INSERT INTO public.service_departments (name, description, is_active) VALUES
  ('Engenharia Clínica', 'Responsável por equipamentos médicos e hospitalares', true),
  ('Manutenção', 'Responsável por manutenção predial, elétrica e hidráulica', true),
  ('T.I Tasy', 'Responsável pelo sistema Tasy e integrações', true),
  ('T.I Manutenção', 'Responsável por computadores, periféricos e redes', true);

-- Add responsible_department_id to service_orders
ALTER TABLE public.service_orders
  ADD COLUMN responsible_department_id UUID REFERENCES public.service_departments(id) ON DELETE SET NULL;