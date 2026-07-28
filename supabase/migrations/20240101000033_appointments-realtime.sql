-- Habilita Realtime na tabela appointments para sincronização em tempo real
-- Isso permite que clientes escutem INSERT, UPDATE e DELETE via websocket

-- Adiciona a tabela appointments à publicação do Supabase Realtime
alter publication supabase_realtime add table appointments;
