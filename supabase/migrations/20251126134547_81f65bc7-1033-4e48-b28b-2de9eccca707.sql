-- Create table for log_extratos (consolidated unique records)
CREATE TABLE public.log_extratos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dt_movimento TEXT NOT NULL,
  dt_balancete TEXT NOT NULL,
  ag_origem TEXT,
  lote TEXT,
  historico TEXT,
  documento TEXT,
  valor TEXT,
  saldo TEXT,
  extrato_origem TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups when checking duplicates
CREATE INDEX idx_log_extratos_lookup ON public.log_extratos(dt_movimento, dt_balancete, documento, valor);

-- Enable Row Level Security (but allow public access for this financial app)
ALTER TABLE public.log_extratos ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to read
CREATE POLICY "Anyone can view log_extratos"
  ON public.log_extratos
  FOR SELECT
  USING (true);

-- Policy to allow anyone to insert
CREATE POLICY "Anyone can insert log_extratos"
  ON public.log_extratos
  FOR INSERT
  WITH CHECK (true);

-- Create storage bucket for extrato files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('extratos', 'extratos', true);

-- Storage policies for extrato files
CREATE POLICY "Anyone can view extratos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'extratos');

CREATE POLICY "Anyone can upload extratos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'extratos');