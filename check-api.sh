#!/bin/bash
# Script para verificar a conexão com a API
# Use: ./check-api.sh

echo "=== Verificando API do Devotly ==="
echo ""

# Lista de endpoints a verificar
ENDPOINTS=(
  "https://devotly.shop/api/cards"
  "https://devotly.shop/api/upload-image"
  "https://devotly.shop/api/checkout/create-preference"
)

# Verifica cada endpoint
for endpoint in "${ENDPOINTS[@]}"; do
  echo "Verificando: $endpoint"
  
  # Verifica OPTIONS (CORS preflight)
  echo "  - Verificando CORS (OPTIONS):"
  OPTIONS_RESULT=$(curl -sI -X OPTIONS -H "Origin: https://devotly.shop" -H "Access-Control-Request-Method: POST" "$endpoint")
  
  if echo "$OPTIONS_RESULT" | grep -q "Access-Control-Allow-Origin"; then
    echo "    ✅ CORS configurado"
  else
    echo "    ❌ CORS não configurado corretamente"
    echo "    Resposta:"
    echo "$OPTIONS_RESULT"
  fi
  
  # Verifica se o endpoint está acessível
  echo "  - Verificando acesso (HEAD):"
  if curl -sI "$endpoint" | grep -q "200\|204\|301\|302"; then
    echo "    ✅ Endpoint acessível"
  else
    echo "    ❌ Endpoint não acessível"
  fi
  
  echo ""
done

echo "=== Verificação concluída ==="
