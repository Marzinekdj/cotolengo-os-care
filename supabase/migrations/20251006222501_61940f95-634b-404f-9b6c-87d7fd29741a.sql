-- Adicionar coluna sector_id na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN sector_id uuid REFERENCES public.sectors(id) ON DELETE SET NULL;

-- Atualizar RLS policies para service_orders

-- Remover a policy antiga de SELECT
DROP POLICY IF EXISTS "Users can view all service orders" ON public.service_orders;

-- Criar nova policy de SELECT baseada em roles
CREATE POLICY "Users can view service orders based on role" 
ON public.service_orders 
FOR SELECT 
USING (
  -- Coordenação vê todas
  has_role(auth.uid(), 'coordenacao'::app_role) OR
  -- Solicitante vê apenas as próprias
  (has_role(auth.uid(), 'solicitante'::app_role) AND requester_id = auth.uid()) OR
  -- Técnico vê as atribuídas a ele OU do setor dele
  (has_role(auth.uid(), 'tecnico'::app_role) AND (
    technician_id = auth.uid() OR
    sector_id IN (SELECT sector_id FROM public.profiles WHERE id = auth.uid())
  ))
);

-- Atualizar policy de UPDATE para técnicos só atualizarem O.S. atribuídas
DROP POLICY IF EXISTS "Technicians and Coordenacao can update service orders" ON public.service_orders;

CREATE POLICY "Users can update service orders based on role" 
ON public.service_orders 
FOR UPDATE 
USING (
  -- Coordenação pode atualizar todas
  has_role(auth.uid(), 'coordenacao'::app_role) OR
  -- Técnico pode atualizar apenas as atribuídas a ele
  (has_role(auth.uid(), 'tecnico'::app_role) AND technician_id = auth.uid()) OR
  -- Solicitante pode atualizar suas próprias
  (has_role(auth.uid(), 'solicitante'::app_role) AND requester_id = auth.uid())
);