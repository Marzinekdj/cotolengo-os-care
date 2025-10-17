-- Adicionar campos created_by e is_active à tabela sectors
ALTER TABLE public.sectors
ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Inserir os dois setores padrão
INSERT INTO public.sectors (name, is_active) 
VALUES 
  ('Unidade Hospitalar São Luís Orione', true),
  ('Unidade de Cuidados Continuados Integrados Santa Terezinha', true)
ON CONFLICT DO NOTHING;

-- Atualizar a política de visualização de setores para mostrar apenas setores ativos por padrão
DROP POLICY IF EXISTS "Anyone can view sectors" ON public.sectors;

CREATE POLICY "Anyone can view active sectors"
ON public.sectors
FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'coordenacao'::app_role));

-- Atualizar política de gerenciamento para coordenação
DROP POLICY IF EXISTS "Coordenacao can manage sectors" ON public.sectors;

CREATE POLICY "Coordenacao can manage all sectors"
ON public.sectors
FOR ALL
USING (has_role(auth.uid(), 'coordenacao'::app_role))
WITH CHECK (has_role(auth.uid(), 'coordenacao'::app_role));

-- Permitir que usuários autenticados criem setores
CREATE POLICY "Authenticated users can create sectors"
ON public.sectors
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);