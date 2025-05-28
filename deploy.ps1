# Script PowerShell para deploy no Railway

Write-Host "Iniciando deploy no Railway" -ForegroundColor Green

# Verifica se o Railway CLI está instalado
if (!(Get-Command railway -ErrorAction SilentlyContinue)) {
    Write-Host "Instalando Railway CLI..." -ForegroundColor Yellow
    npm install -g @railway/cli
}

# Login no Railway (se necessário)
Write-Host "Verificando login no Railway..." -ForegroundColor Yellow
railway whoami 
if ($LASTEXITCODE -ne 0) {
    railway login
}

# Configuração das variáveis de ambiente
Write-Host "Configurando variáveis de ambiente..." -ForegroundColor Yellow
railway link

# Deploy do backend
Write-Host "Fazendo deploy do backend..." -ForegroundColor Yellow
Set-Location -Path ".\backend"
railway up
Set-Location -Path ".."

# Deploy do frontend
Write-Host "Fazendo deploy do frontend..." -ForegroundColor Yellow
Set-Location -Path ".\frontend"
# Cria um novo serviço para o frontend se não existir
if (-not (railway service list | Select-String -Pattern "devotly-frontend")) {
    Write-Host "Criando novo serviço para o frontend..." -ForegroundColor Yellow
    railway service create devotly-frontend
}
# Configura o serviço frontend
Write-Host "Selecionando serviço frontend..." -ForegroundColor Yellow
railway service devotly-frontend
# Faz o deploy do frontend
railway up
Set-Location -Path ".."

Write-Host "Deploy concluído!" -ForegroundColor Green
Write-Host "Certifique-se de configurar o domínio personalizado e as variáveis de ambiente no painel do Railway." -ForegroundColor Yellow
