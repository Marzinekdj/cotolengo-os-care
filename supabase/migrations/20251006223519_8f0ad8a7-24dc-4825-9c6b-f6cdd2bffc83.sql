-- Fase 1: Adicionar roles faltantes em user_roles
-- Inserir role 'solicitante' para todos os usuários que não têm role
INSERT INTO user_roles (user_id, role)
SELECT id, 'solicitante'::app_role
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Fase 2: Sincronizar profiles.role com user_roles.role
-- Atualizar todos os profiles para refletir o role correto de user_roles
UPDATE profiles p
SET role = ur.role::text
FROM user_roles ur
WHERE p.id = ur.user_id;