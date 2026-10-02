-- ================================================================
-- COPA DAS FEDERAÇÕES 2026 — SUPABASE SETUP MÍNIMO
-- Execute no SQL Editor do Supabase Dashboard
-- ================================================================

-- 1. Criar tabela (se não existir)
CREATE TABLE IF NOT EXISTS public.tournament_state (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ESSENCIAL: REPLICA IDENTITY FULL para o Realtime enviar os dados completos
ALTER TABLE public.tournament_state REPLICA IDENTITY FULL;

-- 3. Habilitar Row Level Security
ALTER TABLE public.tournament_state ENABLE ROW LEVEL SECURITY;

-- 4. Política de leitura pública
DROP POLICY IF EXISTS "Permitir leitura publica de tournament_state" ON public.tournament_state;
CREATE POLICY "Permitir leitura publica de tournament_state"
ON public.tournament_state FOR SELECT USING (true);

-- 5. Política de escrita pública
DROP POLICY IF EXISTS "Permitir gravacao de tournament_state" ON public.tournament_state;
CREATE POLICY "Permitir gravacao de tournament_state"
ON public.tournament_state FOR ALL USING (true) WITH CHECK (true);

-- NOTA: A tabela já está na publicação supabase_realtime (erro 42710 confirmou isso).
-- Não é necessário executar ALTER PUBLICATION novamente.

-- 6. Verificação final
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'tournament_state';
