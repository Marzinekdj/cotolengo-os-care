-- Corrigir search_path da função ensure_valid_os_category
CREATE OR REPLACE FUNCTION public.ensure_valid_os_category()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
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