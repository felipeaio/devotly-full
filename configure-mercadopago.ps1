# Script para configurar e testar webhook do Mercado Pago
# Para executar: .\configure-mercadopago.ps1

$ErrorActionPreference = "Stop"
Write-Host "===== Configuração do Webhook do Mercado Pago =====" -ForegroundColor Cyan

# Verificar existência dos arquivos de configuração
if (-not (Test-Path ".\api\webhook\mercadopago.js")) {
    Write-Host "❌ Arquivo webhook não encontrado!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ Arquivo webhook encontrado" -ForegroundColor Green
}

# Verificar token do Mercado Pago
if ([string]::IsNullOrEmpty($env:MP_ACCESS_TOKEN)) {
    $continue = Read-Host "❌ Token do Mercado Pago não encontrado. Deseja configurá-lo agora? (S/N)"
    if ($continue -eq 'S' -or $continue -eq 's') {
        $token = Read-Host "Digite seu token do Mercado Pago" -AsSecureString
        $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($token)
        try {
            $tokenString = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
            $env:MP_ACCESS_TOKEN = $tokenString
        } finally {
            [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        }
    } else {
        Write-Host "⚠️ Continuando sem token. Alguns recursos não funcionarão." -ForegroundColor Yellow
    }
}

# Menu de opções
Write-Host "`nEscolha uma opção:" -ForegroundColor Cyan
Write-Host "1. Configurar webhook no Mercado Pago"
Write-Host "2. Testar webhook em ambiente local (localhost)"
Write-Host "3. Testar webhook em produção (devotly.shop)"
Write-Host "4. Sair"

$option = Read-Host "Digite o número da opção"

switch ($option) {
    "1" {
        Write-Host "`n🔧 Configurando webhook no Mercado Pago..." -ForegroundColor Cyan
        if ([string]::IsNullOrEmpty($env:MP_ACCESS_TOKEN)) {
            Write-Host "❌ Token não configurado!" -ForegroundColor Red
            exit 1
        }
        node configure-webhook.js
    }
    "2" {
        Write-Host "`n🧪 Testando webhook em ambiente local..." -ForegroundColor Cyan
        # Modificar ambiente para local
        (Get-Content -Path .\test-webhook.js) -replace "environment: 'production'", "environment: 'local'" | Set-Content -Path .\test-webhook.js
        node test-webhook.js
        # Restaurar para production
        (Get-Content -Path .\test-webhook.js) -replace "environment: 'local'", "environment: 'production'" | Set-Content -Path .\test-webhook.js
    }
    "3" {
        Write-Host "`n🧪 Testando webhook em produção..." -ForegroundColor Cyan
        node test-webhook.js
    }
    "4" {
        Write-Host "Saindo..." -ForegroundColor Cyan
        exit 0
    }
    default {
        Write-Host "Opção inválida!" -ForegroundColor Red
    }
}

Write-Host "`n✅ Operação concluída!" -ForegroundColor Green
