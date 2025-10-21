-- Update os_priority enum to new values
-- First, drop the dependent function
DROP FUNCTION IF EXISTS public.get_priority_label(os_priority);

-- Add new enum type with new values
CREATE TYPE public.os_priority_new AS ENUM ('nao_urgente', 'urgente', 'emergencial');

-- Add temporary column with new type
ALTER TABLE public.service_orders 
ADD COLUMN priority_new public.os_priority_new;

-- Migrate existing data
UPDATE public.service_orders
SET priority_new = CASE 
  WHEN priority = 'baixa' THEN 'nao_urgente'::os_priority_new
  WHEN priority = 'media' THEN 'urgente'::os_priority_new
  WHEN priority = 'alta' THEN 'urgente'::os_priority_new
  WHEN priority = 'critica' THEN 'emergencial'::os_priority_new
  ELSE 'nao_urgente'::os_priority_new
END;

-- Drop old column and rename new one
ALTER TABLE public.service_orders DROP COLUMN priority;
ALTER TABLE public.service_orders RENAME COLUMN priority_new TO priority;
ALTER TABLE public.service_orders ALTER COLUMN priority SET DEFAULT 'nao_urgente'::os_priority_new;
ALTER TABLE public.service_orders ALTER COLUMN priority SET NOT NULL;

-- Drop old enum type
DROP TYPE public.os_priority;

-- Rename new enum type to original name
ALTER TYPE public.os_priority_new RENAME TO os_priority;

-- Recreate the get_priority_label function with new values
CREATE OR REPLACE FUNCTION public.get_priority_label(priority os_priority)
RETURNS text
LANGUAGE sql
IMMUTABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT CASE priority
    WHEN 'nao_urgente' THEN 'Não Urgente'
    WHEN 'urgente' THEN 'Urgente'
    WHEN 'emergencial' THEN 'Emergencial'
  END;
$$;