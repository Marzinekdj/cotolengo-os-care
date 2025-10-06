-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('solicitante', 'tecnico', 'coordenacao');

-- Create enum for O.S. status
CREATE TYPE public.os_status AS ENUM ('aberta', 'em_andamento', 'concluida', 'cancelada');

-- Create enum for O.S. category
CREATE TYPE public.os_category AS ENUM ('eletrica', 'hidraulica', 'equipamento_medico', 'outros');

-- Create enum for priority
CREATE TYPE public.os_priority AS ENUM ('normal', 'urgente');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create sectors table
CREATE TABLE public.sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create service_orders table
CREATE TABLE public.service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_number SERIAL UNIQUE NOT NULL,
  category os_category NOT NULL,
  sector_id UUID REFERENCES public.sectors(id) NOT NULL,
  equipment TEXT NOT NULL,
  description TEXT NOT NULL,
  priority os_priority DEFAULT 'normal' NOT NULL,
  status os_status DEFAULT 'aberta' NOT NULL,
  photo_url TEXT,
  requester_id UUID REFERENCES public.profiles(id) NOT NULL,
  technician_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create updates table for O.S. history
CREATE TABLE public.os_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID REFERENCES public.service_orders(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  service_order_id UUID REFERENCES public.service_orders(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for service_orders updated_at
CREATE TRIGGER update_service_orders_updated_at
  BEFORE UPDATE ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for sectors
CREATE POLICY "Anyone can view sectors"
  ON public.sectors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Coordenacao can manage sectors"
  ON public.sectors FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'coordenacao'));

-- RLS Policies for service_orders
CREATE POLICY "Users can view all service orders"
  ON public.service_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create service orders"
  ON public.service_orders FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Technicians and Coordenacao can update service orders"
  ON public.service_orders FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'tecnico') OR 
    public.has_role(auth.uid(), 'coordenacao') OR
    requester_id = auth.uid()
  );

CREATE POLICY "Coordenacao can delete service orders"
  ON public.service_orders FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'coordenacao'));

-- RLS Policies for os_updates
CREATE POLICY "Users can view updates for service orders they can see"
  ON public.os_updates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create updates"
  ON public.os_updates FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert default sectors
INSERT INTO public.sectors (name) VALUES
  ('Ala 1'),
  ('Ala 2'),
  ('Ala 3'),
  ('Centro Cirúrgico'),
  ('UTI'),
  ('Enfermaria'),
  ('Recepção'),
  ('Cozinha'),
  ('Lavanderia'),
  ('Manutenção');