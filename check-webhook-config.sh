#!/bin/bash
# Script para verificar e configurar permissões para o webhook do Mercado Pago

echo "===== Verificando configurações do webhook do Mercado Pago ====="

# Verificar se a pasta api/webhook existe
if [ -d "./api/webhook" ]; then
    echo "✅ Pasta webhook encontrada"
else
    echo "❌ Pasta webhook não encontrada!"
    echo "Criando estrutura..."
    mkdir -p ./api/webhook
    echo "✅ Estrutura criada"
fi

# Verificar se o arquivo webhook existe
if [ -f "./api/webhook/mercadopago.js" ]; then
    echo "✅ Arquivo webhook encontrado"
else
    echo "❌ Arquivo webhook não encontrado!"
    echo "Verifique se o arquivo api/webhook/mercadopago.js existe"
fi

# Verificar permissões
echo "Ajustando permissões..."
chmod 755 ./api/webhook
chmod 644 ./api/webhook/mercadopago.js
echo "✅ Permissões ajustadas"

# Verificar variáveis de ambiente
if [ -z "$MERCADO_PAGO_ACCESS_TOKEN" ]; then
    echo "❌ AVISO: Variável MERCADO_PAGO_ACCESS_TOKEN não encontrada no ambiente"
    echo "Lembre-se de configurá-la no painel da Vercel"
else
    echo "✅ Variável MERCADO_PAGO_ACCESS_TOKEN encontrada"
fi

echo "===== Verificação concluída ====="
