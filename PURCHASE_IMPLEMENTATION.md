# 🎯 Implementação do Evento Purchase TikTok - Devotly

## 📋 Resumo da Implementação

Esta implementação garante que o evento "Purchase" do TikTok Pixel seja disparado corretamente na página create.html sempre que uma compra for concluída com sucesso.

### ✅ Componentes Implementados

#### 1. **Frontend - Página Create (`/create/create.html`)**
- ✅ **Purchase Tracker Script**: Arquivo `purchase-tracker.js` que monitora automaticamente:
  - Parâmetros de URL de retorno de pagamento (`status=approved`, `payment_id`)
  - Mudanças no localStorage com dados de pagamento
  - Mensagens de janelas de pagamento
  - Elementos DOM indicando sucesso de compra

- ✅ **Script de Detecção Inline**: Código JavaScript incorporado na página para:
  - Detectar retorno de pagamento aprovado via URL parameters
  - Disparar evento Purchase automaticamente
  - Evitar duplicação de eventos
  - Identificar usuário com dados de email/telefone

#### 2. **Frontend - TikTok Events Otimizado (`tiktok-events-optimized.js`)**
- ✅ **Função trackPurchase Melhorada**: 
  - Formato compatível com TikTok Events API v1.3
  - Todos os campos obrigatórios incluídos (`event`, `event_id`, `event_time`, `user`, `contents`, `value`, `currency`)
  - Pixel code correto: `D1QFD0RC77UF6MBM48MG`
  - Suporte a `test_event_code` para ambiente de desenvolvimento
  - Hash SHA-256+Base64 para dados sensíveis (email, telefone)

#### 3. **Backend - Services (`tiktokEventsV3.js`)**
- ✅ **API Endpoint Correto**: `https://business-api.tiktok.com/open_api/v1.3/pixel/track/`
- ✅ **Payload Formato v1.3**: Estrutura correta conforme documentação oficial
- ✅ **Dados Obrigatórios**: Todos os campos necessários incluídos
- ✅ **EMQ Otimizado**: Hash de dados de usuário para melhorar qualidade do evento

#### 4. **Backend - Routes (`tiktokV3.js`, `tiktok.js`)**
- ✅ **Endpoint `/api/tiktok/track-event`**: Recebe eventos do frontend
- ✅ **Endpoint `/api/tiktok-v3/track-event`**: Versão v3 otimizada
- ✅ **Validação de Dados**: Verificação de campos obrigatórios
- ✅ **Deduplicação**: Prevenção de eventos duplicados

#### 5. **Webhook Integration (`webhook.js`)**
- ✅ **Purchase via Webhook**: Evento disparado quando pagamento é confirmado
- ✅ **Dados Completos**: Informações do cartão, plano e usuário incluídas

### 📊 Estrutura do Evento Purchase

```javascript
{
  "event": "Purchase",
  "event_id": "unique_purchase_id_123",
  "event_time": 1706024400,
  "pixel_code": "D1QFD0RC77UF6MBM48MG",
  "user": {
    "ip": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "email": "hashed_email_sha256_base64",
    "phone_number": "hashed_phone_sha256_base64",
    "external_id": "hashed_user_id_sha256_base64"
  },
  "contents": [
    {
      "id": "card_123",
      "name": "Plano Devotly Para Sempre",
      "category": "digital_product",
      "quantity": 1,
      "price": 17.99
    }
  ],
  "value": 17.99,
  "currency": "BRL",
  "test_event_code": "test_purchase_devotly_1706024400" // apenas em desenvolvimento
}
```

### 🔄 Fluxo de Disparo do Evento

1. **Usuário inicia checkout** na página create.html
   - Evento `InitiateCheckout` é disparado
   - Dados são salvos no localStorage

2. **Usuário completa pagamento** no Mercado Pago
   - Webhook do backend recebe confirmação
   - Evento `Purchase` é disparado via backend

3. **Usuário retorna para create.html** com parâmetros de sucesso
   - Script de detecção identifica `status=approved`
   - Evento `Purchase` é disparado via frontend (backup)
   - Deduplicação evita eventos duplicados

### 🧪 Teste da Implementação

Arquivo de teste criado: `/test-purchase.html`
- ✅ Teste via TikTok Pixel JavaScript (`ttq.track`)
- ✅ Teste via Backend Events API
- ✅ Teste via TikTokEvents híbrido
- ✅ Logs detalhados para debugging

### 🛠️ Como Testar

#### Teste Manual na Página Create:
1. Acesse `/create/create.html`
2. Complete o processo de criação do cartão
3. Selecione um plano e vá para checkout
4. Complete o pagamento no Mercado Pago
5. Aguarde retorno para a página

#### Teste Direto:
1. Acesse `/test-purchase.html`
2. Configure os dados de teste
3. Clique nos botões de teste
4. Monitore os logs no console e na página

### 📈 Monitoramento

#### No Console do Navegador:
```bash
✅ Purchase Success: Pagamento aprovado detectado na página create
🔍 TikTok: Usuário identificado para Purchase
🎯 TikTok Purchase disparado: {cardId: "...", planType: "...", value: 17.99}
```

#### No Painel TikTok Business:
- Eventos aparecerão em "Events Manager"
- Métricas de EMQ (Event Match Quality) devem mostrar score alto
- Purchase events com valores corretos

### 🔧 Variáveis de Ambiente Necessárias

```bash
TIKTOK_ACCESS_TOKEN=08538eef624276105c15fff5c1dfefe76b9726f2
TIKTOK_PIXEL_CODE=D1QFD0RC77UF6MBM48MG
```

### 🚀 Endpoints da API

- **TikTok Events API**: `https://business-api.tiktok.com/open_api/v1.3/pixel/track/`
- **Backend Route v1**: `/api/tiktok/track-event`
- **Backend Route v3**: `/api/tiktok-v3/track-event`

### ⚠️ Pontos de Atenção

1. **Deduplicação**: Sistema evita eventos duplicados usando `event_id` únicos
2. **EMQ Score**: Dados de usuário são hasheados para melhorar qualidade
3. **Fallbacks**: Se frontend falhar, backend via webhook garante disparo
4. **Test Events**: Em desenvolvimento, eventos são marcados com `test_event_code`

### 📝 Próximos Passos

1. **Deploy**: Fazer deploy das mudanças
2. **Teste Real**: Fazer uma compra real para testar
3. **Monitoramento**: Verificar eventos no painel TikTok
4. **Otimização**: Ajustar EMQ com base nos resultados

---

**Status**: ✅ **IMPLEMENTAÇÃO COMPLETA**

O evento Purchase está totalmente implementado e configurado para disparar automaticamente na página create.html quando uma compra for concluída com sucesso.
