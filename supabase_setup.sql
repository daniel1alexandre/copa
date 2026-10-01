-- 1. Criar a tabela para armazenar o estado da Copa
CREATE TABLE IF NOT EXISTS public.tournament_state (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar o Supabase Realtime (transmissão ao vivo via WebSocket)
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.tournament_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_state;

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.tournament_state ENABLE ROW LEVEL SECURITY;

-- 4. Permitir leitura pública para que todos os usuários vejam os jogos em tempo real
DROP POLICY IF EXISTS "Permitir leitura publica de tournament_state" ON public.tournament_state;
CREATE POLICY "Permitir leitura publica de tournament_state" 
ON public.tournament_state 
FOR SELECT 
USING (true);

-- 5. Permitir gravação/atualização de placares
DROP POLICY IF EXISTS "Permitir gravacao de tournament_state" ON public.tournament_state;
CREATE POLICY "Permitir gravacao de tournament_state" 
ON public.tournament_state 
FOR ALL 
USING (true) 
WITH CHECK (true);
