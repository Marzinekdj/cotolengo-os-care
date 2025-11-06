-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS trigger_notify_coordenacao_new_os ON service_orders;

-- Remover função existente se houver
DROP FUNCTION IF EXISTS public.notify_coordenacao_new_os();

-- Criar função para notificar coordenação quando nova O.S. é criada
CREATE OR REPLACE FUNCTION public.notify_coordenacao_new_os()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  coord_user_id uuid;
  os_sector_name text;
  os_category_label text;
BEGIN
  -- Buscar nome do setor
  SELECT name INTO os_sector_name
  FROM sectors
  WHERE id = NEW.sector_id;
  
  -- Mapear categoria para rótulo legível
  os_category_label := CASE NEW.category
    WHEN 'eletrica' THEN 'Elétrica'
    WHEN 'hidraulica' THEN 'Hidráulica'
    WHEN 'equipamento_medico' THEN 'Equipamento Médico'
    WHEN 'climatizacao' THEN 'Climatização'
    WHEN 'estrutura_predial' THEN 'Estrutura Predial'
    WHEN 'outros' THEN 'Outros'
    ELSE 'Outros'
  END;
  
  -- Inserir notificação para cada usuário da coordenação
  FOR coord_user_id IN 
    SELECT user_id 
    FROM user_roles 
    WHERE role = 'coordenacao'
  LOOP
    INSERT INTO notifications (
      user_id,
      service_order_id,
      title,
      message,
      is_read
    ) VALUES (
      coord_user_id,
      NEW.id,
      'Nova O.S. #' || NEW.os_number || ' criada',
      'Uma nova ordem de serviço de ' || os_category_label || 
      ' foi criada no setor ' || COALESCE(os_sector_name, 'N/A') || 
      '. Equipamento: ' || NEW.equipment,
      false
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para executar a função após inserção de nova O.S.
CREATE TRIGGER trigger_notify_coordenacao_new_os
  AFTER INSERT ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_coordenacao_new_os();