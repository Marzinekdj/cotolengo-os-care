-- Drop da policy atual de UPDATE
DROP POLICY IF EXISTS "Users can update service orders based on role" ON service_orders;

-- Criar nova policy de UPDATE que permite técnicos atualizarem O.S. do setor ou sem técnico
CREATE POLICY "Users can update service orders based on role"
ON service_orders FOR UPDATE
USING (
  -- Coordenação pode atualizar todas
  has_role(auth.uid(), 'coordenacao'::app_role) OR
  
  -- Solicitante pode atualizar apenas as próprias
  (has_role(auth.uid(), 'solicitante'::app_role) AND requester_id = auth.uid()) OR
  
  -- Técnico pode atualizar:
  (has_role(auth.uid(), 'tecnico'::app_role) AND (
    -- 1. O.S. atribuídas a ele
    technician_id = auth.uid() OR
    
    -- 2. O.S. do setor dele (se ele tem setor)
    (sector_id IN (SELECT sector_id FROM profiles WHERE id = auth.uid() AND sector_id IS NOT NULL)) OR
    
    -- 3. O.S. sem técnico atribuído (se ele não tem setor)
    (NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND sector_id IS NOT NULL) 
     AND technician_id IS NULL)
  ))
);