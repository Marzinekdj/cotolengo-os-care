-- Permitir coordenação gerenciar roles dos usuários
CREATE POLICY "Coordenacao can manage user roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'coordenacao'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'coordenacao'::app_role));