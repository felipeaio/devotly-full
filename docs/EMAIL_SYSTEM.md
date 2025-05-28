# Sistema de Email da Devotly

Este documento explica como funciona o sistema de envio automático de emails da Devotly após pagamentos aprovados pelo Mercado Pago.

## Visão Geral do Sistema

O sistema de email é acionado automaticamente quando um webhook do Mercado Pago notifica nosso backend sobre um pagamento aprovado. Ele envia um email personalizado contendo:

1. Link para o cartão criado
2. QR code personalizado para acesso rápido
3. Informações sobre o cartão
4. Mensagem personalizada

## Arquitetura

O sistema utiliza as seguintes tecnologias:

- **Resend**: Serviço de email transacional com alta taxa de entregabilidade
- **QRCode**: Biblioteca para geração de QR codes personalizados
- **Supabase**: Banco de dados onde as informações dos cartões são armazenadas
- **Mercado Pago Webhooks**: Para notificação em tempo real dos pagamentos aprovados

## Fluxo de Funcionamento

1. Cliente realiza pagamento via Mercado Pago
2. Mercado Pago envia webhook quando o status do pagamento muda para "aprovado"
3. Nosso servidor recebe o webhook e verifica a autenticidade da notificação
4. O sistema extrai o ID do cartão e email do cliente da referência externa (external_reference)
5. O sistema busca informações detalhadas do cartão no Supabase
6. Um QR code é gerado dinamicamente para o cartão
7. O email é montado com as informações do cartão e o QR code
8. O email é enviado para o cliente via Resend
9. O sistema registra o envio do email

## Configuração Necessária

Para que o sistema funcione corretamente, as seguintes variáveis de ambiente precisam estar configuradas:

```
RESEND_API_KEY=chave_da_api_do_resend
FRONTEND_URL=url_do_frontend (ex: https://devotly.shop)
```

## Testando o Sistema de Email

Você pode testar o envio de email usando o comando:

```
npm run test-email your-email@example.com
```

Este comando enviará um email de teste para o endereço fornecido.

## Template do Email

O template do email é responsivo e otimizado para dispositivos móveis. Ele inclui:

- Cabeçalho com o logo da Devotly
- Informações personalizadas sobre o cartão
- Um botão grande para acessar o cartão diretamente
- QR code para acesso rápido via dispositivos móveis
- Um versículo bíblico inspirador
- Links para suporte, termos de serviço e política de privacidade

## Solução de Problemas

Se os emails não estiverem sendo enviados:

1. Verifique se a chave da API do Resend está correta
2. Verifique se o webhook do Mercado Pago está configurado corretamente
3. Verifique os logs do servidor para mensagens de erro
4. Teste o envio manual de emails usando o script de teste

## Monitoramento

A performance do sistema de email pode ser monitorada através:

1. Do dashboard do Resend (taxas de entrega, abertura, etc.)
2. Dos logs do servidor para verificar sucessos e falhas de envio
