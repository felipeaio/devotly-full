-- Script SQL para adicionar campos de controle de email duplicado
-- Execute este script no Supabase SQL Editor

-- Adicionar colunas para controle de envio de email (se não existirem)
DO $$ 
BEGIN
    -- Verificar e adicionar coluna email_sent
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cards' AND column_name = 'email_sent'
    ) THEN
        ALTER TABLE cards ADD COLUMN email_sent BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Coluna email_sent adicionada';
    ELSE
        RAISE NOTICE 'Coluna email_sent já existe';
    END IF;
      -- Verificar e adicionar coluna email_sent_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cards' AND column_name = 'email_sent_at'
    ) THEN
        ALTER TABLE cards ADD COLUMN email_sent_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Coluna email_sent_at adicionada';
    ELSE
        RAISE NOTICE 'Coluna email_sent_at já existe';
    END IF;
    
    -- Verificar e adicionar coluna email_sending (para controle de concorrência)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cards' AND column_name = 'email_sending'
    ) THEN
        ALTER TABLE cards ADD COLUMN email_sending BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Coluna email_sending adicionada';
    ELSE
        RAISE NOTICE 'Coluna email_sending já existe';
    END IF;
    
    -- Verificar e adicionar coluna payment_id (se não existir)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cards' AND column_name = 'payment_id'
    ) THEN
        ALTER TABLE cards ADD COLUMN payment_id TEXT;
        RAISE NOTICE 'Coluna payment_id adicionada';
    ELSE
        RAISE NOTICE 'Coluna payment_id já existe';
    END IF;
END $$;

-- Criar índices para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_cards_payment_id ON cards(payment_id);
CREATE INDEX IF NOT EXISTS idx_cards_email_sent ON cards(email_sent);
CREATE INDEX IF NOT EXISTS idx_cards_email_sending ON cards(email_sending);
CREATE INDEX IF NOT EXISTS idx_cards_status_pagamento ON cards(status_pagamento);

-- Comentários para documentação
COMMENT ON COLUMN cards.email_sent IS 'Indica se o email de confirmação já foi enviado';
COMMENT ON COLUMN cards.email_sent_at IS 'Timestamp de quando o email foi enviado';
COMMENT ON COLUMN cards.email_sending IS 'Flag para controle de concorrência no envio de emails';
COMMENT ON COLUMN cards.payment_id IS 'ID do pagamento do Mercado Pago para evitar duplicação';

-- Verificar os dados após a atualização
SELECT id, email, status_pagamento, payment_id, email_sent, email_sent_at, created_at 
FROM cards 
WHERE status_pagamento = 'aprovado'
ORDER BY created_at DESC 
LIMIT 5;
