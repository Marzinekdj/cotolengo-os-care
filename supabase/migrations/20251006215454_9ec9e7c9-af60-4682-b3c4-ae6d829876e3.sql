-- Corrigir search_path da função get_priority_label
DROP FUNCTION IF EXISTS get_priority_label(os_priority);

CREATE OR REPLACE FUNCTION get_priority_label(priority os_priority)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE priority
    WHEN 'critica' THEN 'Crítica'
    WHEN 'alta' THEN 'Alta'
    WHEN 'media' THEN 'Média'
    WHEN 'baixa' THEN 'Baixa'
  END;
$$;