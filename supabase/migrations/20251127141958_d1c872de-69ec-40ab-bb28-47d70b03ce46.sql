-- Criar tabela de cadastro de alunos
CREATE TABLE public.cadastro_alunos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  nome TEXT NOT NULL,
  formacao TEXT,
  turma TEXT,
  inicio DATE,
  cpf TEXT,
  fone TEXT,
  email TEXT,
  profissao TEXT,
  nascimento DATE
);

-- Criar tabela de cadastro de associados
CREATE TABLE public.cadastro_associados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  nome TEXT NOT NULL,
  status TEXT,
  observacoes TEXT
);

-- Criar tabela de outros pagadores/recebedores
CREATE TABLE public.cadastro_outros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL, -- contador, energia, agua, etc
  cpf_cnpj TEXT,
  observacoes TEXT
);

-- Criar tabela de histórico de identificações (para aprendizado)
CREATE TABLE public.historico_identificacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  documento TEXT NOT NULL, -- CPF/CNPJ extraído do campo documento
  historico TEXT NOT NULL, -- texto do histórico para matching
  tipo_cadastro TEXT NOT NULL, -- 'aluno', 'associado', 'outro'
  cadastro_id UUID NOT NULL,
  cadastro_nome TEXT NOT NULL
);

-- Adicionar colunas de identificação na tabela log_extratos
ALTER TABLE public.log_extratos
ADD COLUMN identificado_tipo TEXT,
ADD COLUMN identificado_id UUID,
ADD COLUMN identificado_nome TEXT;

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.cadastro_alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadastro_associados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadastro_outros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_identificacao ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para permitir acesso público (ajustar conforme necessário)
CREATE POLICY "Qualquer um pode visualizar alunos" ON public.cadastro_alunos
  FOR SELECT USING (true);

CREATE POLICY "Qualquer um pode inserir alunos" ON public.cadastro_alunos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar alunos" ON public.cadastro_alunos
  FOR UPDATE USING (true);

CREATE POLICY "Qualquer um pode deletar alunos" ON public.cadastro_alunos
  FOR DELETE USING (true);

CREATE POLICY "Qualquer um pode visualizar associados" ON public.cadastro_associados
  FOR SELECT USING (true);

CREATE POLICY "Qualquer um pode inserir associados" ON public.cadastro_associados
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar associados" ON public.cadastro_associados
  FOR UPDATE USING (true);

CREATE POLICY "Qualquer um pode deletar associados" ON public.cadastro_associados
  FOR DELETE USING (true);

CREATE POLICY "Qualquer um pode visualizar outros" ON public.cadastro_outros
  FOR SELECT USING (true);

CREATE POLICY "Qualquer um pode inserir outros" ON public.cadastro_outros
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar outros" ON public.cadastro_outros
  FOR UPDATE USING (true);

CREATE POLICY "Qualquer um pode deletar outros" ON public.cadastro_outros
  FOR DELETE USING (true);

CREATE POLICY "Qualquer um pode visualizar histórico" ON public.historico_identificacao
  FOR SELECT USING (true);

CREATE POLICY "Qualquer um pode inserir histórico" ON public.historico_identificacao
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar histórico" ON public.historico_identificacao
  FOR UPDATE USING (true);

CREATE POLICY "Qualquer um pode deletar histórico" ON public.historico_identificacao
  FOR DELETE USING (true);

-- Criar índices para melhor performance
CREATE INDEX idx_historico_documento ON public.historico_identificacao(documento);
CREATE INDEX idx_historico_historico ON public.historico_identificacao(historico);
CREATE INDEX idx_alunos_cpf ON public.cadastro_alunos(cpf);
CREATE INDEX idx_outros_cpf_cnpj ON public.cadastro_outros(cpf_cnpj);
CREATE INDEX idx_extratos_identificado ON public.log_extratos(identificado_tipo, identificado_id);