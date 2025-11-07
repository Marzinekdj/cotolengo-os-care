-- Passo 1: Atualizar função notify_coordenacao_new_os para remover categorias inválidas
CREATE OR REPLACE FUNCTION public.notify_coordenacao_new_os()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  coord_user_id uuid;
  os_sector_name text;
  os_category_label text;
BEGIN
  -- Buscar nome do setor
  SELECT name INTO os_sector_name
  FROM sectors
  WHERE id = NEW.sector_id;
  
  -- Mapear categoria para rótulo legível (SOMENTE categorias válidas)
  os_category_label := CASE NEW.category
    WHEN 'eletrica' THEN 'Elétrica'
    WHEN 'hidraulica' THEN 'Hidráulica'
    WHEN 'equipamento_medico' THEN 'Equipamento Médico'
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
$function$;

-- Passo 2: Criar função que força categorias válidas (FALLBACK BLINDADO)
CREATE OR REPLACE FUNCTION public.ensure_valid_os_category()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  valid_categories text[] := ARRAY['eletrica','hidraulica','equipamento_medico','outros'];
BEGIN
  -- Se categoria for NULL ou não estiver na lista válida, forçar para 'outros'
  IF NEW.category IS NULL OR NEW.category::text <> ALL(valid_categories) THEN
    RAISE WARNING 'Categoria inválida detectada: %. Forçando para: outros', NEW.category;
    NEW.category := 'outros'::os_category;
  END IF;
  RETURN NEW;
END;
$$;

-- Passo 3: Remover trigger antigo se existir
DROP TRIGGER IF EXISTS trg_ensure_valid_os_category ON public.service_orders;

-- Passo 4: Criar trigger BEFORE INSERT OR UPDATE
CREATE TRIGGER trg_ensure_valid_os_category
BEFORE INSERT OR UPDATE ON public.service_orders
FOR EACH ROW
EXECUTE FUNCTION public.ensure_valid_os_category();