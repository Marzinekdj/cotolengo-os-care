-- Atualizar enum de prioridade para incluir os novos níveis
ALTER TYPE os_priority RENAME TO os_priority_old;
CREATE TYPE os_priority AS ENUM ('baixa', 'media', 'alta', 'critica');

-- Atualizar coluna priority sem default primeiro
ALTER TABLE service_orders 
  ALTER COLUMN priority DROP DEFAULT;

ALTER TABLE service_orders 
  ALTER COLUMN priority TYPE os_priority USING 
    CASE 
      WHEN priority::text = 'urgente' THEN 'critica'::os_priority
      ELSE 'media'::os_priority
    END;

-- Agora adicionar o default
ALTER TABLE service_orders 
  ALTER COLUMN priority SET DEFAULT 'media'::os_priority;

DROP TYPE os_priority_old;

-- Adicionar campo SLA alvo (em horas)
ALTER TABLE service_orders
  ADD COLUMN sla_target_hours INTEGER DEFAULT 24;

-- Adicionar campo de tipo de manutenção
CREATE TYPE maintenance_type AS ENUM ('corretiva', 'preventiva', 'instalacao');
ALTER TABLE service_orders
  ADD COLUMN maintenance_type maintenance_type DEFAULT 'corretiva';

-- Função helper para label de prioridade
CREATE OR REPLACE FUNCTION get_priority_label(priority os_priority)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE priority
    WHEN 'critica' THEN 'Crítica'
    WHEN 'alta' THEN 'Alta'
    WHEN 'media' THEN 'Média'
    WHEN 'baixa' THEN 'Baixa'
  END;
$$;

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_service_orders_priority ON service_orders(priority);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status);
CREATE INDEX IF NOT EXISTS idx_service_orders_created_at ON service_orders(created_at DESC);

-- Adicionar campo role à tabela profiles para simplificar RBAC
ALTER TABLE profiles
  ADD COLUMN role TEXT DEFAULT 'solicitante';