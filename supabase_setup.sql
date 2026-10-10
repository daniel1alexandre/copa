-- ================================================================
-- COPA DAS FEDERAÇÕES 2026 — SETUP OFICIAL SUPABASE
-- Cole no SQL Editor do seu projeto Supabase e clique em RUN
-- ================================================================

-- 1. Cria ou recria a tabela do estado do torneio
CREATE TABLE IF NOT EXISTS public.tournament_state (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. REPLICA IDENTITY FULL (necessário para sincronização CDC)
ALTER TABLE public.tournament_state REPLICA IDENTITY FULL;

-- 3. Habilita Row Level Security (RLS)
ALTER TABLE public.tournament_state ENABLE ROW LEVEL SECURITY;

-- 4. Remove políticas antigas se existirem para evitar conflitos
DROP POLICY IF EXISTS "leitura_publica" ON public.tournament_state;
DROP POLICY IF EXISTS "escrita_publica" ON public.tournament_state;

-- 5. Política: Qualquer visitante ou aparelho pode ler o torneio
CREATE POLICY "leitura_publica"
ON public.tournament_state FOR SELECT
TO public
USING (true);

-- 6. Política: Gravação e atualização permitida via chave pública/anon
CREATE POLICY "escrita_publica"
ON public.tournament_state FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 7. Adiciona à publicação Realtime se disponível
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'tournament_state'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_state;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 8. Mensagem de sucesso
SELECT '✅ Tabela tournament_state configurada com sucesso para a Copa das Federações 2026!' AS status;
