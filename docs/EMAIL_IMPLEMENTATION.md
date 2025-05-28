# Implementando o Sistema de Email Automático da Devotly

Siga estas instruções para implementar o sistema de email automático após pagamentos aprovados pelo Mercado Pago.

## Pré-requisitos

1. Conta no [Resend](https://resend.com) para envio de emails transacionais
2. Webhook do Mercado Pago configurado para enviar notificações para seu backend
3. Sistema backend do Devotly já configurado com Supabase

## Passos para Implementação

### 1. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```
RESEND_API_KEY=sua_chave_da_api_resend
FRONTEND_URL=https://seu-dominio-frontend.com.br
```

### 2. Testar o Envio de Email

Execute o seguinte comando para testar se o envio de emails está funcionando corretamente:

```powershell
cd "c:\Users\felipeaio\Desktop\DEVELOPER\Devotly\Devotly\backend"
npm run test-email seu-email@example.com
```

Verifique se o email de teste foi recebido corretamente e se o QR code está funcionando.

### 3. Verificar Configuração do Webhook

Certifique-se de que o webhook do Mercado Pago está apontando para o endpoint correto:

```
https://seu-backend.com/webhook/mercadopago
```

### 4. Testar o Fluxo Completo

Para testar o fluxo completo:

1. Crie uma compra de teste no ambiente de sandbox do Mercado Pago
2. Aprove o pagamento
3. Verifique nos logs do servidor se o webhook foi recebido
4. Confirme se o email foi enviado
5. Verifique se o QR code no email redireciona corretamente para o cartão

## Configuração do Zoho (Opcional)

Se você estiver usando Zoho para gerenciamento de clientes:

1. Configure a integração Zoho no seu backend (código separado necessário)
2. Atualize os registros no Zoho após pagamentos aprovados
3. Mantenha o histórico de emails enviados no Zoho CRM

## Personalização do Template de Email

O template de email está localizado em `services/emailService.js` na função `getEmailTemplate()`. Você pode personalizar:

- Cores e estilos
- Conteúdo da mensagem
- Layout do email
- Versículo bíblico

## Monitoramento e Manutenção

- Monitore as taxas de entrega dos emails no dashboard do Resend
- Verifique regularmente os logs para identificar falhas de envio
- Atualize a chave API do Resend periodicamente por segurança

## Suporte

Se precisar de ajuda com a implementação ou tiver dúvidas sobre o sistema de email, entre em contato com o desenvolvedor ou consulte a documentação em `docs/EMAIL_SYSTEM.md`.
