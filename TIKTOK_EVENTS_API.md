# Integração TikTok Events API v1.3

Este documento detalha a implementação da TikTok Events API v1.3 no projeto Devotly.

## Configuração

### Pixel do TikTok
- **Nome do Pixel:** pixel-rastreio
- **ID do Pixel:** D1QFD0RC77UF6MBM48MG
- **Versão da API:** v1.3
- **Endpoint:** https://business-api.tiktok.com/open_api/v1.3/event/track/

### Variáveis de Ambiente
Adicione estas variáveis ao arquivo `.env`:
```
TIKTOK_ACCESS_TOKEN=seu_token_de_acesso
TIKTOK_PIXEL_CODE=D1QFD0RC77UF6MBM48MG
```

O token de acesso deve ser gerado no painel do TikTok Events Manager:
1. Acesse Events Manager > Configuration > Event API
2. Gere um novo token de acesso
3. Copie e cole no arquivo `.env`

## Eventos Implementados

### Server-side (Backend)
O arquivo `backend/services/tiktokEvents.js` implementa os seguintes eventos:

- `trackPurchase`: Registra compra finalizada
- `trackInitiateCheckout`: Registra início de checkout
- `trackAddToCart`: Registra adição ao carrinho
- `trackViewContent`: Registra visualização de conteúdo
- `trackCompleteRegistration`: Registra registro completo
- `trackCustomEvent`: Permite enviar eventos personalizados

### Client-side (Frontend)
O arquivo `frontend/js/tiktok-events.js` complementa o tracking com eventos de frontend.

## Como Usar

### No Backend

```javascript
import tiktokEvents from '../services/tiktokEvents.js';

// Exemplo de uso no checkout
router.post('/create-preference', async (req, res) => {
  const { plano, email, cardId } = req.body;
  
  // Rastrear evento de checkout iniciado
  await tiktokEvents.trackInitiateCheckout(
    cardId,  // ID do produto
    plano,   // Tipo de plano
    plano === 'para_sempre' ? 297 : 97, // Valor baseado no plano
    email,   // Email do usuário
    req      // Request para obter IP e user agent
  );
  
  // Resto do código...
});

// Exemplo de uso no webhook de pagamento
router.post('/mercadopago', async (req, res) => {
  // Processar pagamento...
  
  // Rastrear compra finalizada
  await tiktokEvents.trackPurchase(
    orderId,
    planType,
    value,
    userEmail,
    userPhone,
    req
  );
});
```

### No Frontend

O frontend complementa o tracking através do arquivo `tiktok-events.js` que trabalha junto com o Pixel padrão.

## Requisitos Técnicos

1. **Email Hasheado**: Emails são hasheados com SHA-256 e codificados em base64
2. **Event ID Único**: Cada evento recebe um ID único para evitar duplicação
3. **Event Source**: Origem do evento (obrigatório na API v1.3) - deve ser 'web', 'app' ou 'offline'
4. **Event Source ID**: Identificador adicional da fonte do evento (obrigatório na API v1.3)
5. **Retry Automático**: Eventos falhos têm até 3 tentativas de envio
5. **Fila de Eventos**: Sistema de fila para eventos que falharem após as tentativas
6. **Timestamp Unix**: Tempo do evento em segundos (Unix time)

## Validação

Para validar a implementação:
1. Acesse o TikTok Ads Manager > Events Manager
2. Navegue para a seção de Diagnóstico
3. Verifique se os eventos estão sendo recebidos corretamente

## Troubleshooting

- **Eventos não aparecem**: Verifique o token de acesso e o código do pixel
- **Erros 403**: O token de acesso pode ter expirado ou não ter permissões suficientes
- **Erros de formato**: Verifique se o payload está conforme a documentação da TikTok
- **Erro "Invalid value for event_source"**: Certifique-se de que o campo `event_source` está sendo enviado e tem um dos valores permitidos: 'web', 'app' ou 'offline'
- **Erro "Invalid value for event_source_id"**: Certifique-se de que o campo `event_source_id` também está sendo enviado e possui um valor válido
- **Erro "Invalid email hash"**: Verifique se o email está sendo hasheado com SHA-256 e codificado em base64

---
Última atualização: Julho 2025
