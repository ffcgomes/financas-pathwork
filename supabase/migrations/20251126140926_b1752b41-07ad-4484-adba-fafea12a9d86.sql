-- Criar políticas de storage para o bucket extratos
-- Permitir que qualquer pessoa faça upload
CREATE POLICY "Permitir upload de extratos para todos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'extratos');

-- Permitir que qualquer pessoa atualize (upsert)
CREATE POLICY "Permitir atualização de extratos para todos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'extratos');

-- Permitir que qualquer pessoa visualize
CREATE POLICY "Permitir visualização de extratos para todos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'extratos');

-- Permitir que qualquer pessoa delete
CREATE POLICY "Permitir deleção de extratos para todos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'extratos');