-- ================================================================
-- COPA DAS FEDERAÇÕES 2026 — SUPABASE SETUP COMPLETO
-- Execute este script no SQL Editor do Supabase Dashboard
-- ================================================================

-- 1. Criar a tabela para armazenar o estado da Copa
CREATE TABLE IF NOT EXISTS public.tournament_state (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ESSENCIAL PARA REALTIME: habilitar REPLICA IDENTITY FULL
--    Sem isso, o Supabase Realtime não envia o campo "data" no payload
ALTER TABLE public.tournament_state REPLICA IDENTITY FULL;

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.tournament_state ENABLE ROW LEVEL SECURITY;

-- 4. Permitir leitura pública (todos veem os jogos em tempo real)
DROP POLICY IF EXISTS "Permitir leitura publica de tournament_state" ON public.tournament_state;
CREATE POLICY "Permitir leitura publica de tournament_state"
ON public.tournament_state
FOR SELECT
USING (true);

-- 5. Permitir gravação/atualização de placares (via anon key)
DROP POLICY IF EXISTS "Permitir gravacao de tournament_state" ON public.tournament_state;
CREATE POLICY "Permitir gravacao de tournament_state"
ON public.tournament_state
FOR ALL
USING (true)
WITH CHECK (true);

-- 6. Ativar Realtime para esta tabela na publicação do Supabase
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_state;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN others THEN NULL;
END $$;

-- 7. Verificar se está tudo certo (deve retornar a tabela listada)
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'tournament_state';
