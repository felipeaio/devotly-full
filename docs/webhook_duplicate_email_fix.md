# Correção de Envio Duplicado de Emails - Webhook

## Problema Identificado
O sistema estava enviando emails duplicados quando o webhook do Mercado Pago era chamado múltiplas vezes simultaneamente para o mesmo pagamento.

## Causa Raiz
- **Condição de Corrida**: Múltiplas instâncias do webhook podiam passar pelas verificações antes que a primeira atualizasse o banco de dados
- **Falta de Atomicidade**: O processo de verificar + atualizar + enviar email não era atômico

## Solução Implementada

### 1. Transação Atômica com Condições
Substituímos a lógica de verificação + atualização por uma única operação UPDATE com condições:

```sql
UPDATE cards 
SET 
    status_pagamento = 'aprovado',
    payment_id = :paymentId,
    email_sent = true,
    email_sent_at = NOW(),
    updated_at = NOW()
WHERE 
    id = :cardId 
    AND email_sent = false 
    AND payment_id IS NULL
RETURNING *;
```

### 2. Verificação de Resultado
- Se a query retorna 0 registros = outro webhook já processou
- Se retorna 1 registro = este webhook tem exclusividade para processar

### 3. Rollback em Caso de Falha
Se o envio do email falhar, revertemos o status `email_sent` para permitir nova tentativa.

## Benefícios

1. **Eliminação de Duplicatas**: Apenas um webhook pode processar cada pagamento
2. **Atomicidade**: Operação de reserva é atômica no banco de dados
3. **Recuperação de Falhas**: Sistema pode tentar reenviar email se falhar
4. **Logs Detalhados**: Visibilidade completa do processo

## Arquivo Modificado
- `backend/routes/webhook.js`: Implementação da lógica de transação atômica

## Como Testar

### 1. Teste Manual
```bash
# No diretório backend/tests
node testWebhookDuplication.js <payment_id>
```

### 2. Verificar Logs
Os logs do backend mostrarão:
- `✅ Processamento reservado com sucesso` (apenas uma vez)
- `✅ Cartão já está sendo processado por outra instância` (demais tentativas)

### 3. Verificar Email
Apenas um email deve ser enviado por pagamento aprovado.

## Monitoramento
- Verificar logs do Railway para confirmar comportamento
- Monitorar tabela `cards` no Supabase para campos `email_sent` e `payment_id`
- Confirmar que apenas um email é enviado por cartão aprovado

## Status
✅ **IMPLEMENTADO** - Pronto para deploy e teste em produção
