-- ================================================================
-- COPA DAS FEDERAÇÕES 2026 — SETUP LIMPO (DROP + CREATE)
-- Cole no SQL Editor do Supabase e execute
-- ================================================================

-- 1. Remove a tabela antiga completamente (começo do zero)
DROP TABLE IF EXISTS public.tournament_state CASCADE;

-- 2. Cria a tabela nova
CREATE TABLE public.tournament_state (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. REPLICA IDENTITY FULL (necessário para o Realtime)
ALTER TABLE public.tournament_state REPLICA IDENTITY FULL;

-- 4. Segurança (RLS)
ALTER TABLE public.tournament_state ENABLE ROW LEVEL SECURITY;

-- 5. Todos podem ler
CREATE POLICY "leitura_publica"
ON public.tournament_state FOR SELECT USING (true);

-- 6. Todos podem gravar (via anon key)
CREATE POLICY "escrita_publica"
ON public.tournament_state FOR ALL USING (true) WITH CHECK (true);

-- 7. Confirmação final
SELECT 'Tabela criada com sucesso!' AS resultado;
