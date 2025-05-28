# Script de Deploy Frontend para Railway
# Execute este comando no diretório frontend

echo "=== Deploy Frontend Devotly para Railway ==="

# Verificar se está no diretório correto
if (!(Test-Path "Dockerfile")) {
    Write-Error "Erro: Execute este script no diretório frontend (onde está o Dockerfile)"
    exit 1
}

echo "✓ Diretório correto detectado"

# Verificar arquivos necessários
$requiredFiles = @("Dockerfile", "nginx.conf.template", "railway.toml", "home.html")
foreach ($file in $requiredFiles) {
    if (!(Test-Path $file)) {
        Write-Error "Erro: Arquivo necessário não encontrado: $file"
        exit 1
    }
}

echo "✓ Todos os arquivos necessários encontrados"

# Fazer o deploy
echo "🚀 Iniciando deploy na Railway..."
echo "📍 URL esperada: https://frontend-production-2eeb.up.railway.app"
echo "🔍 Healthcheck: https://frontend-production-2eeb.up.railway.app/health"

# Instruções para o usuário
echo ""
echo "=== PRÓXIMOS PASSOS ==="
echo "1. Execute: railway login"
echo "2. Execute: railway link (selecione o projeto Devotly)"
echo "3. Execute: railway up"
echo ""
echo "=== URLs DE TESTE ==="
echo "🏠 Homepage: https://frontend-production-2eeb.up.railway.app"
echo "❤️ Health: https://frontend-production-2eeb.up.railway.app/health"
echo "📊 Status: https://frontend-production-2eeb.up.railway.app/status"
echo ""
echo "=== LOGS DE DEBUG ==="
echo "Para ver os logs: railway logs"
echo ""

# Mostrar configurações atuais
echo "=== CONFIGURAÇÕES ATUAIS ==="
echo "Porta: Dinâmica (Railway)"
echo "Healthcheck: /health"
echo "Backend: https://devotly-full-production.up.railway.app"
echo "Timeout: 60s"
