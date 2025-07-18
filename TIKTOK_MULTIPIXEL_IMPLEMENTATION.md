# TikTok Events API - Múltiplos Pixels OTIMIZADO

Este arquivo documenta as implementações realizadas para suportar múltiplos pixels TikTok simultaneamente com **otimizações para alta taxa de correspondência**.

## ✅ OTIMIZAÇÕES IMPLEMENTADAS

### 🎯 1. Taxa de Correspondência Melhorada (>60%)
- **Hash SHA-256 + Base64** para todos os dados sensíveis (email, telefone)
- **Dados de identificação completos**: email, phone, IP, user_agent, external_id
- **Parâmetros de tracking TikTok**: ttclid (Click ID) e ttp (Tracking Parameter)
- **Deduplicação** com event_id sincronizado entre frontend e backend

### 💰 2. Value e Currency Obrigatórios
- **Todos os eventos de conversão** agora incluem `value` e `currency`
- **Purchase**: Value obrigatório para otimização do algoritmo
- **InitiateCheckout**: Value obrigatório para funil de conversão
- **AddToCart**: Value estimado para leads
- **ViewContent**: Currency obrigatório mesmo com value 0

### 🔧 3. Formato Correto API v1.3
- **Payload simplificado** conforme documentação oficial
- **Endpoint correto**: `https://business-api.tiktok.com/open_api/v1.3/event/track/`
- **Headers obrigatórios**: `Content-Type` e `Access-Token`
- **Timestamp Unix** em segundos

## Mudanças Implementadas

### 1. Sistema de Múltiplos Pixels
- **Array de pixels**: O sistema agora suporta múltiplos pixels configurados via variáveis de ambiente
- **Compatibilidade**: Mantém total compatibilidade com o código existente
- **Configuração dinâmica**: Pixels adicionais são carregados automaticamente se as variáveis de ambiente estiverem definidas

### 2. Novos Métodos OTIMIZADOS

#### `sendEventToAllPixels(eventName, eventProperties, userData, context)`
- Envia o evento para todos os pixels configurados simultaneamente
- Usa `Promise.allSettled()` para enviar em paralelo
- Retorna estatísticas de sucesso/falha

#### `sendEventToPixel(pixel, eventName, eventProperties, userData, context)`
- **FORMATO CORRETO API v1.3**
- Envia evento para um pixel específico
- Permite customização por pixel
- Suporte a parâmetros específicos do TikTok (ttclid, ttp)
- Hash SHA-256 + Base64 para dados sensíveis

#### `extractTikTokParams(req)` - NOVO
- Extrai automaticamente ttclid e ttp da requisição
- Verifica query parameters, headers e cookies
- Essencial para alta taxa de correspondência

#### `prepareEventContext(req, eventId)` - NOVO
- Prepara contexto completo com todos os dados necessários
- Inclui IP, user_agent, parâmetros TikTok e event_id
- Simplifica o uso nos métodos de tracking

### 3. Controle de Ambiente OTIMIZADO
- **Modo desenvolvimento**: Não envia eventos em desenvolvimento (exceto se `testMode` estiver ativo)
- **Produção**: Envia eventos para todos os pixels configurados
- **Logs detalhados**: Mostra status de cada pixel individualmente
- **Validações**: Avisos quando value não está presente

## Configuração

### Variáveis de Ambiente

```env
# Primeiro pixel (obrigatório)
TIKTOK_PIXEL_CODE=D1QFD0RC77UF6MBM48MG
TIKTOK_ACCESS_TOKEN=08538eef624276105c15fff5c1dfefe76b9726f2

# Segundo pixel (opcional)
TIKTOK_PIXEL_CODE_2=SEU_SEGUNDO_PIXEL_ID
TIKTOK_ACCESS_TOKEN_2=SEU_SEGUNDO_TOKEN

# Terceiro pixel (opcional)
TIKTOK_PIXEL_CODE_3=SEU_TERCEIRO_PIXEL_ID
TIKTOK_ACCESS_TOKEN_3=SEU_TERCEIRO_TOKEN

# Ambiente
NODE_ENV=production
```

### Exemplo de Uso OTIMIZADO

```javascript
// Purchase com todos os parâmetros obrigatórios
await tiktokEvents.trackPurchase(
    cardId, 
    'para_sempre', 
    97.00, // VALUE OBRIGATÓRIO
    'cliente@email.com', 
    '+5511999887766', // PHONE para melhor correspondência
    req, // REQUEST para capturar IP, user_agent, ttclid
    'purchase_123' // EVENT_ID para deduplicação
);

// InitiateCheckout otimizado
await tiktokEvents.trackInitiateCheckout(
    cardId,
    'para_sempre',
    97.00, // VALUE OBRIGATÓRIO
    'cliente@email.com',
    req,
    'checkout_123'
);

// Contexto completo preparado automaticamente
const context = tiktokEvents.prepareEventContext(req, 'custom_event_id');
```

## 📊 Payload Exemplo (Formato Correto)

```json
{
  "pixel_code": "D1QFD0RC77UF6MBM48MG",
  "event": "Purchase",
  "event_id": "purchase_123",
  "timestamp": 1720287122,
  "user": {
    "email": "hash_sha256_base64_do_email",
    "phone_number": "hash_sha256_base64_do_telefone",
    "external_id": "hash_sha256_base64_do_id_cliente",
    "ip": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "ttclid": "click_id_do_anuncio",
    "ttp": "tracking_parameter"
  },
  "properties": {
    "value": 97.00,
    "currency": "BRL",
    "content_id": "card_123",
    "content_type": "product",
    "content_name": "Plano Para Sempre",
    "content_category": "digital_product",
    "url": "https://devotly.shop/checkout"
  }
}
```

## 🎯 Vantagens da Implementação OTIMIZADA

1. **Taxa de correspondência >60%**: Dados completos de identificação
2. **Otimização do algoritmo**: Value e currency obrigatórios
3. **Deduplicação precisa**: Event_id sincronizado
4. **Retrocompatibilidade**: Todo código existente continua funcionando
5. **Escalabilidade**: Fácil adicionar/remover pixels
6. **Monitoramento**: Logs detalhados por pixel
7. **Performance**: Envios em paralelo
8. **Robustez**: Falha em um pixel não afeta os outros
9. **Flexibilidade**: Configuração via variáveis de ambiente

## 📈 Logs de Exemplo OTIMIZADOS

```
[TikTok Events] Inicializado com 2 pixel(s)
[TikTok Events] Pixel 1: D1QFD0RC77UF6MBM48MG
[TikTok Events] Pixel 2: SEGUNDO_PIXEL_ID
[TikTok Events] Evento Purchase: 2 sucessos, 0 falhas
[TikTok Events] Evento Purchase enviado para pixel D1QFD0RC77UF6MBM48MG: {...}
[TikTok Events] Evento Purchase enviado para pixel SEGUNDO_PIXEL_ID: {...}
```

## 🧪 Como Testar

```bash
# Executar teste otimizado
node backend/tests/test-tiktok-optimized.js

# Verificar no TikTok Ads Manager
# 1. Events Manager > Diagnostics
# 2. Taxa de correspondência deve ser >60%
# 3. Eventos Purchase devem mostrar values corretos
```

## ✅ Checklist Final

- [x] **Value e Currency obrigatórios** em eventos de conversão
- [x] **Hash SHA-256 + Base64** para dados sensíveis
- [x] **Dados de identificação completos** (email, phone, IP, user_agent)
- [x] **Parâmetros TikTok** (ttclid, ttp) capturados automaticamente
- [x] **Event_id único** para deduplicação
- [x] **Formato correto API v1.3**
- [x] **Suporte múltiplos pixels**
- [x] **Logs detalhados** para monitoramento
- [x] **Validações** e avisos para parâmetros obrigatórios

## 🎯 Casos de Uso

- **Campanhas múltiplas**: Diferentes pixels para diferentes campanhas
- **Testes A/B**: Comparar performance entre pixels
- **Segmentação**: Pixels específicos para públicos diferentes
- **Backup**: Redundância em caso de falha de um pixel
- **Otimização**: Alta taxa de correspondência e dados completos para o algoritmo

- **Campanhas múltiplas**: Diferentes pixels para diferentes campanhas
- **Testes A/B**: Comparar performance entre pixels
- **Segmentação**: Pixels específicos para públicos diferentes
- **Backup**: Redundância em caso de falha de um pixel
