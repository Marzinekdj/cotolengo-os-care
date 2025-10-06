-- Drop da policy atual de SELECT
DROP POLICY IF EXISTS "Users can view service orders based on role" ON service_orders;

-- Criar nova policy de SELECT que permite técnicos sem setor verem O.S. abertas
CREATE POLICY "Users can view service orders based on role"
ON service_orders FOR SELECT
USING (
  -- Coordenação vê todas
  has_role(auth.uid(), 'coordenacao'::app_role) OR
  -- Solicitante vê apenas as próprias
  (has_role(auth.uid(), 'solicitante'::app_role) AND requester_id = auth.uid()) OR
  -- Técnico vê:
  (has_role(auth.uid(), 'tecnico'::app_role) AND (
    -- 1. O.S. atribuídas a ele
    technician_id = auth.uid() OR
    -- 2. O.S. do setor dele (se ele tem setor)
    (sector_id IN (SELECT sector_id FROM profiles WHERE id = auth.uid() AND sector_id IS NOT NULL)) OR
    -- 3. Se NÃO tem setor, vê todas as O.S. sem técnico atribuído
    (NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND sector_id IS NOT NULL) AND technician_id IS NULL)
  ))
);