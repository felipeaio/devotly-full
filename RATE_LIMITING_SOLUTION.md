# 🛡️ Solução para Erros de Rate Limiting (429) - Devotly

## 📋 Resumo do Problema

Você estava enfrentando múltiplos erros 429 (Too Many Requests) ao finalizar cartões, causados por:

1. **Rate limiting excessivo** no backend (100 requests/15min era muito restritivo)
2. **Múltiplas chamadas simultâneas** do frontend para APIs de tracking
3. **Falta de deduplicação** de eventos duplicados
4. **Ausência de throttling** adequado entre requests

## ✅ Soluções Implementadas

### 1. **Sistema de Rate Limiting Inteligente**
- **Arquivo**: `backend/middleware/smartRateLimit.js`
- **Benefícios**: 
  - Adaptação automática baseada no comportamento do usuário
  - Limites mais generosos para usuários bem comportados
  - Penalização temporária apenas para abusadores

### 2. **Rate Limits Ajustados**
- **Geral**: 300 requests/15min (era 100)
- **Upload**: 15-30 requests/min adaptativo (era 10)
- **Tracking**: 50-75 requests/min adaptativo (era não limitado)
- **Criação**: 8-12 requests/min adaptativo (era 5)

### 3. **Throttling no Frontend**
- **TikTok Events V3**: Mínimo 2 segundos entre eventos similares
- **Multi-Pixel**: Mínimo 3 segundos entre eventos similares
- **Error Handler**: Mínimo 3 segundos entre requests similares

### 4. **Deduplicação de Eventos**
- Eventos idênticos em 5 segundos são ignorados
- Prevenção de múltiplas chamadas simultâneas
- Fila inteligente para retry de eventos falhados

### 5. **Circuit Breakers**
- **Arquivo**: `backend/middleware/circuitBreaker.js`
- Pausa temporária de endpoints com muitos erros
- Auto-recuperação quando sistema estabiliza
- Proteção contra cascata de falhas

### 6. **Sistema de Monitoramento**
- **Dashboard**: `/admin/rate-limiting`
- **API de Métricas**: `/api/monitoring/metrics`
- Monitoramento em tempo real de:
  - Requests bloqueados vs permitidos
  - Status dos circuit breakers
  - Estatísticas por endpoint
  - Log de violações recentes

## 🚀 Como Usar

### 1. **Monitoramento em Tempo Real**
```
Acesse: https://devotly-full-production.up.railway.app/admin/rate-limiting
```

### 2. **Reset Manual (se necessário)**
```bash
# Reset dos circuit breakers
curl -X POST https://devotly-full-production.up.railway.app/api/admin/reset-circuit-breakers

# Reset das métricas
curl -X POST https://devotly-full-production.up.railway.app/api/admin/reset-metrics
```

### 3. **Verificar Status dos Circuit Breakers**
```bash
curl https://devotly-full-production.up.railway.app/api/health/circuit-breakers
```

## 📊 Limites Recomendados por Uso

### Uso Normal (1 usuário)
- ✅ Criação de cartões: ~5-8 por minuto
- ✅ Uploads de imagem: ~10-15 por minuto  
- ✅ Eventos de tracking: ~30-50 por minuto

### Uso Intenso (múltiplos usuários)
- ✅ Sistema se adapta automaticamente
- ✅ Circuit breakers protegem contra sobrecarga
- ✅ Rate limiting inteligente permite rajadas temporárias

## 🔧 Configurações Avançadas

### Ajustar Limites (se necessário)
**Arquivo**: `backend/middleware/smartRateLimit.js`

```javascript
// Exemplo para aumentar limite de uploads
export const uploadRateLimit = smartRateLimit({
    windowMs: 60 * 1000,
    maxBase: 20, // Aumentar de 15 para 20
    burstMultiplier: 2.5, // Aumentar burst
    name: 'upload'
});
```

### Ajustar Throttling Frontend
**Arquivo**: `frontend/js/tiktok-events-v3.js`

```javascript
this.requestThrottle = {
    lastSentTimes: new Map(),
    minInterval: 1500, // Reduzir de 2000 para 1500ms se necessário
    pendingRequests: new Map()
};
```

## 🎯 Benefícios Esperados

1. **Eliminação dos erros 429** em uso normal
2. **Melhor performance** com menos bloqueios
3. **Proteção automática** contra sobrecarga
4. **Visibilidade total** do que está acontecendo
5. **Auto-recuperação** quando há problemas

## 🚨 Troubleshooting

### Se ainda houver erros 429:

1. **Verificar o dashboard**: `/admin/rate-limiting`
2. **Identificar endpoint problemático**
3. **Verificar se circuit breaker está aberto**
4. **Aguardar auto-recuperação** ou fazer reset manual
5. **Ajustar limites** se uso legítimo for alto

### Logs importantes para monitorar:
```
🔌 Circuit Breaker 'TikTokEvents' ABERTO - muitas falhas
⏰ Throttling InitiateCheckout: aguardando 2000ms
🔄 Request InitiateCheckout já pendente, ignorando duplicata
✅ InitiateCheckout enviado para API Events
```

## 📞 Próximos Passos

1. **Testar criação de cartões** - deve funcionar sem erros 429
2. **Monitorar dashboard** por alguns dias
3. **Ajustar limites** baseado no uso real
4. **Configurar alertas** se necessário

---

**Status**: ✅ **Implementado e Pronto para Uso**

Agora você pode finalizar cartões sem ser bloqueado por rate limiting!
