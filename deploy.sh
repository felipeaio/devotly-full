#!/bin/bash

echo "Iniciando deploy no Railway"

# Instala o CLI do Railway se ainda não estiver instalado
if ! command -v railway &> /dev/null; then
    echo "Instalando Railway CLI..."
    npm install -g @railway/cli
fi

# Login no Railway (se necessário)
echo "Verificando login no Railway..."
railway whoami || railway login

# Configuração das variáveis de ambiente
echo "Configurando variáveis de ambiente..."
railway link

# Deploy do backend
echo "Fazendo deploy do backend..."
cd backend
railway up
cd ..

# Deploy do frontend
echo "Fazendo deploy do frontend..."
cd frontend
railway up
cd ..

echo "Deploy concluído!"
echo "Certifique-se de configurar o domínio personalizado e as variáveis de ambiente no painel do Railway."
