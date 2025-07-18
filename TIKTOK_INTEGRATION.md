# TikTok Pixel e API Events - Documentação de Integração

Este documento descreve a integração do TikTok Pixel e API Events no Devotly para rastreamento de eventos de usuário e conversão.

## Visão Geral

A integração do TikTok foi implementada em duas partes:

1. **TikTok Pixel** (client-side): rastreia eventos no navegador do usuário
2. **TikTok API Events** (server-side): envia eventos do servidor para garantir precisão

Esta abordagem híbrida garante melhor precisão nas métricas de conversão e atribui corretamente as conversões mesmo quando os usuários bloqueiam cookies.

## Configuração

### Credenciais

- **TikTok Pixel Code**: `D1QFD0RC77UF6MBM48MG`
- **TikTok API Access Token**: `08538eef624276105c15fff5c1dfefe76b9726f2`

### Arquivos Principais

#### Frontend

- `frontend/js/tiktok-events.js`: Biblioteca centralizada para todos os eventos de TikTok
- HTML pages: Todas as páginas principais contêm o código base do TikTok Pixel

#### Backend

- `backend/services/tiktokEvents.js`: Serviço para enviar eventos server-side
- Backend routes: Integração em rotas como checkout, webhook e cards

## Eventos Implementados

### Client-Side (TikTok Pixel)

| Evento | Descrição | Páginas/Componentes |
|--------|-----------|---------------------|
| `ViewContent` | Visualização de página ou conteúdo | Todas as páginas HTML |
| `AddToCart` | Adição de produto ao carrinho | create.js (seleção de plano) |
| `InitiateCheckout` | Início do checkout | create.js (checkout) |
| `AddPaymentInfo` | Adição de informações de pagamento | checkout.html |
| `Purchase` | Compra concluída | success.html |
| `CompleteRegistration` | Registro concluído | create.js (criação de cartão) |

### Server-Side (TikTok API Events)

| Evento | Descrição | Arquivos |
|--------|-----------|----------|
| `AddToCart` | Adição de produto ao carrinho | backend/routes/cards.js |
| `InitiateCheckout` | Início do checkout | backend/routes/checkout.js |
| `Purchase` | Compra concluída | backend/routes/webhook.js |

## Tratamento de Dados PII

Todos os dados PII (Personally Identifiable Information) são hasheados usando SHA-256:

- Email
- Número de telefone
- ID de usuário (external_id)

Isso é feito tanto no frontend quanto no backend.

## Mecanismos de Resiliência

### Frontend

- Fila de eventos no localStorage para envio posterior em caso de falha
- Retry automático quando o pixel fica disponível
- Processamento da fila em intervalos regulares

### Backend

- Sistema de retry com backoff exponencial
- Fila em memória para eventos não enviados
- Processamento periódico da fila de eventos

## Testes e Validação

Para validar os eventos do TikTok:

1. Use o TikTok Events Manager: https://ads.tiktok.com/i18n/events_manager
2. Verifique o "Test Events" para confirmar se os eventos estão sendo recebidos
3. Verifique o console do navegador para logs de eventos com prefixo "TikTok:"
4. No servidor, verifique os logs para mensagens com "TikTok API response"

## Solução de Problemas

### Eventos não aparecem no Events Manager

- Verifique se o pixel está corretamente instalado nas páginas HTML
- Confirme se não há bloqueadores de anúncios/cookies ativos
- Verifique os logs do console para erros

### Erros de API no Backend

- Verifique se o token de acesso é válido
- Confirme se o formato do payload está correto
- Verifique os logs do servidor para mensagens de erro detalhadas

## Manutenção

Para adicionar novos eventos:

1. Defina a função de rastreamento em `tiktok-events.js`
2. Adicione chamadas nos pontos relevantes do frontend/backend
3. Siga o mesmo padrão de tratamento de erros e resiliência

## Recursos

- [Documentação do TikTok Pixel](https://ads.tiktok.com/marketing_api/docs?id=1701890980108353)
- [Documentação do TikTok Events API](https://ads.tiktok.com/marketing_api/docs?id=1701890979375106)
- [Guia de Implementação Server-Side](https://ads.tiktok.com/marketing_api/docs?id=1701890914536450)
