# Configurações para Resolver Problemas de Redirecionamento e Status

## Problema 1: Loop de Redirecionamento

### Causa
O Mercado Pago estava redirecionando para as `back_urls` configuradas, que por sua vez redirecionavam novamente, criando um loop.

### Solução Implementada
1. **Mudança no `binary_mode`**: Alterado de `true` para `false` para garantir que o webhook seja sempre chamado
2. **Configuração correta de URLs**: Ajuste nas `back_urls` para apontar para o backend em vez do frontend diretamente
3. **Redirecionamentos com status 302**: Usando `res.status(302).redirect()` para evitar cache
4. **Controle de sessão no frontend**: Adicionado controle para evitar loops de redirecionamento

## Problema 2: Status não sendo atualizado

### Causa
O webhook estava sendo chamado, mas havia problemas na atualização do status no banco de dados.

### Solução Implementada
1. **Separação de responsabilidades**: 
   - Primeiro, atualiza o status de pagamento para "aprovado" 
   - Em seguida, gerencia o envio de email separadamente

2. **Logs detalhados**: Cada etapa do webhook agora tem logs específicos que facilitam o diagnóstico

## Configurações do Mercado Pago

### Webhooks (no painel do MP)
```
URL: https://sua-url-railway-backend.up.railway.app/webhook/mercadopago
Eventos: payment
```

### Variáveis de Ambiente Necessárias
```env
BACKEND_URL=https://sua-url-railway-backend.up.railway.app
FRONTEND_URL=https://sua-url-railway-frontend.up.railway.app
MERCADO_PAGO_ACCESS_TOKEN=seu_token_real_do_mercado_pago
SUPABASE_URL=sua_url_supabase
SUPABASE_ANON_KEY=sua_chave_anonima_supabase
SUPABASE_SERVICE_KEY=sua_chave_servico_supabase (opcional, mas recomendado para webhooks)
```

## Fluxo Correto Após as Correções

1. **Usuário finaliza pagamento no MP**
2. **MP chama webhook** → Status atualizado para "aprovado"
3. **MP redireciona para back_url** → Usuário vai para página de sucesso
4. **Email é enviado** (processo separado, não bloqueia o fluxo)

## Testes

Execute o teste de fluxo de pagamento:
```bash
node backend/tests/testWebhookDuplication.js <payment_id>
```

Execute o teste de email:
```bash
node backend/tests/emailTest.js seu-email@exemplo.com
```

## Monitoramento

### Logs importantes para acompanhar:
- `=== INÍCIO DO PROCESSAMENTO DO WEBHOOK ===`
- `Status do pagamento: approved`
- `✅ Status do pagamento atualizado com sucesso`
- `✅ Email enviado com sucesso`

### Em caso de problemas:
1. Verificar se o webhook está sendo chamado
2. Verificar se as variáveis de ambiente estão corretas
3. Verificar se o token do MP tem permissões adequadas
4. Verificar se o Supabase está acessível
