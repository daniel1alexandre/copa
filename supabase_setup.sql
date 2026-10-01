-- ============================================================
-- COPA DAS FEDERAÇÕES DE BEACH TENNIS 2026 (CBT)
-- SCRIPT DE CONFIGURAÇÃO DO SUPABASE (BANCO DE DADOS & REALTIME)
-- ============================================================
-- Instruções:
-- 1. Acesse o painel do seu projeto no Supabase (https://supabase.com).
-- 2. No menu lateral esquerdo, clique em "SQL Editor".
-- 3. Clique em "+ New query", cole todo este código abaixo e clique em "Run" (Executar).
-- ============================================================

-- 1. Criar a tabela para armazenar o estado completo do torneio
CREATE TABLE IF NOT EXISTS public.tournament_state (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar o Supabase Realtime para a tabela tournament_state
-- Isso permite a transmissão instantânea via WebSocket de qualquer alteração de placar, chave ou horário!
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'tournament_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_state;
  END IF;
END $$;

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.tournament_state ENABLE ROW LEVEL SECURITY;

-- 4. Criar Políticas de Acesso
-- Permitir leitura pública para que todos os usuários/espectadores vejam os jogos em tempo real
DROP POLICY IF EXISTS "Permitir leitura publica de tournament_state" ON public.tournament_state;
CREATE POLICY "Permitir leitura publica de tournament_state" 
ON public.tournament_state 
FOR SELECT 
USING (true);

-- Permitir gravação/atualização para que a arbitragem/administrador atualize os placares
DROP POLICY IF EXISTS "Permitir gravacao de tournament_state" ON public.tournament_state;
CREATE POLICY "Permitir gravacao de tournament_state" 
ON public.tournament_state 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 5. Comentário descritivo na tabela
COMMENT ON TABLE public.tournament_state IS 'Armazena chaves, confrontos, categorias, ranking e placares da Copa das Federações 2026 com sincronização em tempo real.';
