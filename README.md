# Devotly - Cartões Cristãos Inspiradores

Devotly é uma plataforma para criação de cartões digitais cristãos com versículos bíblicos e mensagens de fé.

## Estrutura do Projeto

- **backend**: API Node.js com Express
- **frontend**: Interface web em HTML, CSS e JavaScript

## Integrações

### TikTok Pixel e API Events

O projeto inclui integração completa com TikTok Pixel (client-side) e TikTok API Events (server-side) para rastreamento de conversões e eventos de usuário.

- **TikTok Pixel Code**: `D1QFD0RC77UF6MBM48MG`
- **TikTok API Access Token**: `08538eef624276105c15fff5c1dfefe76b9726f2`

A documentação completa da integração pode ser encontrada em [TIKTOK_INTEGRATION.md](TIKTOK_INTEGRATION.md).

Para testar a integração do TikTok API Events, execute:

```bash
node backend/tests/tiktok-events-test.js
```

## Requisitos

- Node.js 18+
- Railway CLI (instalado automaticamente pelo script de deploy)
- Conta no Railway (https://railway.app)
- Conta no Supabase (https://supabase.com)
- Conta no Mercado Pago (para processamento de pagamentos)
- Conta no Resend (para envio de emails)
- Conta no TikTok Business (para tracking de conversões)

## Variáveis de Ambiente Necessárias

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```
SUPABASE_URL=sua_url_do_supabase
SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
SUPABASE_SERVICE_KEY=sua_chave_de_servico_do_supabase
MERCADO_PAGO_ACCESS_TOKEN=seu_token_do_mercado_pago
NGROK_URL=https://sua-url-railway-backend.up.railway.app
FRONTEND_URL=https://sua-url-railway-frontend.up.railway.app
RESEND_API_KEY=sua_chave_api_resend
PORT=3000
```

## Deploy no Railway

### Método 1: Deploy usando o script automatizado (Windows)

1. Execute o script PowerShell:

    ```powershell
    .\deploy.ps1
    ```

### Método 2: Deploy usando o script automatizado (Linux/Mac)

1. Dê permissão de execução ao script:

    ```bash
    chmod +x deploy.sh
    ```

2. Execute o script:

    ```bash
    ./deploy.sh
    ```

### Método 3: Deploy manual

1. Instale o CLI do Railway:

    ```bash
    npm install -g @railway/cli
    ```

2. Faça login no Railway:

    ```bash
    railway login
    ```

3. Vincule o projeto ao Railway:

    ```bash
    railway link
    ```

4. Configure as variáveis de ambiente:

    ```bash
    railway variables set SUPABASE_URL=sua_url_do_supabase
    railway variables set SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
    # ... continue com as demais variáveis
    ```

5. Deploy do backend:

    ```bash
    cd backend
    railway up
    cd ..
    ```

6. Deploy do frontend:

    ```bash
    cd frontend
    railway up
    cd ..
    ```

## Configuração Pós-Deploy

1. No painel do Railway, configure domínios personalizados para seus serviços.
2. Atualize a variável `NGROK_URL` para apontar para o domínio do backend.
3. Atualize a variável `FRONTEND_URL` para apontar para o domínio do frontend.

## Desenvolvimento Local

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

Não é necessário um servidor de desenvolvimento para o frontend em desenvolvimento local. 
Basta abrir os arquivos HTML em um navegador ou usar uma extensão como "Live Server" no VS Code.
