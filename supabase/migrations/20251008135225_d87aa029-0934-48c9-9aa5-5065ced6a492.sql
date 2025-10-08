-- Criar bucket público para fotos de O.S.
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-orders-photos', 'service-orders-photos', true);

-- Criar políticas de acesso ao bucket
CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'service-orders-photos');

CREATE POLICY "Qualquer um pode visualizar fotos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'service-orders-photos');

CREATE POLICY "Usuários podem deletar próprias fotos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'service-orders-photos' AND auth.uid()::text = (storage.foldername(name))[1]);