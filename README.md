# Devotly - Serverless para Vercel

Este projeto foi adaptado para ser implantado na Vercel usando a arquitetura serverless.

## Migração para o Domínio devotly.shop

Todas as URLs no código foram atualizadas para utilizar o novo domínio `devotly.shop` em vez de `localhost`. As principais alterações incluem:

1. Configuração centralizada de API no arquivo `frontend/js/core/api-config.js`
2. URLs de callback e redirecionamento no processamento de pagamentos
3. Meta tags para compartilhamento em redes sociais
4. URLs para visualização e busca de cartões

Todas as referências anteriores a `localhost:3000` e domínios provisórios foram atualizadas para o domínio de produção.

## Estrutura do Projeto

```
- api/                      # Funções serverless para Vercel
  - _middleware.js          # Middleware para Supabase
  - upload-image.js         # Upload de imagens
  - cards/                  # Rotas para cartões
    - index.js              # GET e POST para cartões
    - [id].js               # Obter um cartão específico
    - search.js             # Buscar cartões por email
    - [id]/
      - edit.js             # Editar um cartão
  - checkout/
    - create-preference.js  # Criação de preferência no Mercado Pago
  - webhook/
    - mercadopago.js        # Webhook para notificações do Mercado Pago
- vercel.json               # Configuração da Vercel
- frontend/                 # Frontend estático
  - js/core/api-config.js   # Configuração de URLs da API
```

## Configuração na Vercel

Antes de fazer o deploy, você precisa configurar as variáveis de ambiente no dashboard da Vercel:

1. Acesse o dashboard da Vercel
2. Selecione seu projeto
3. Vá para "Settings" > "Environment Variables"
4. Adicione todas as variáveis abaixo:

| Variável | Descrição |
|----------|-----------|
| `SUPABASE_URL` | URL da sua instância do Supabase |
| `SUPABASE_ANON_KEY` | Chave anônima do Supabase |
| `SUPABASE_SERVICE_KEY` | Chave de serviço do Supabase (opcional para funções admin) |
| `MERCADO_PAGO_ACCESS_TOKEN` | Token de acesso do Mercado Pago |

## Configuração do Webhook do Mercado Pago

O projeto inclui utilitários para configurar e testar o webhook do Mercado Pago:

### Configurar o Webhook

Use o script `configure-webhook.js` para configurar automaticamente o webhook no painel do Mercado Pago:

```bash
# Definir o token de acesso do Mercado Pago
$env:MP_ACCESS_TOKEN="SEU_TOKEN_AQUI"

# Executar o script de configuração
node configure-webhook.js
```

O script irá:
1. Verificar webhooks existentes
2. Criar um novo webhook se necessário
3. Confirmar que a URL está configurada corretamente

### Testar o Webhook

O arquivo `test-webhook.js` permite simular uma notificação de pagamento:

```bash
# Testar o webhook em produção
node test-webhook.js
```

Você pode editar o script para alterar o ambiente de teste (local ou produção) e o ID do pagamento.
| `MERCADO_PAGO_PUBLIC_KEY` | Chave pública do Mercado Pago |
| `FRONTEND_URL` | URL do frontend (será usada para callbacks) |

## Deploy

### Opção 1: Deploy pela CLI da Vercel

```bash
# Instalar a Vercel CLI globalmente (se ainda não tiver)
npm install -g vercel

# Fazer login na Vercel (se necessário)
vercel login

# Deploy para produção
vercel --prod
```

### Opção 2: Deploy por GitHub/GitLab

1. Conecte seu repositório ao projeto na Vercel
2. A Vercel detectará automaticamente a estrutura do projeto
3. Configure as variáveis de ambiente mencionadas acima
4. Clique em "Deploy"

## Diferenças em Relação à Versão Original

1. Funções Express foram convertidas para funções serverless da Vercel
2. Middleware do Supabase foi adaptado para o ambiente sem estado
3. Routes API utilizam a sintaxe baseada em arquivos da Vercel
4. URLs de API no frontend utilizam o `api-config.js` para facilitar manutenção
5. Variáveis de ambiente são obtidas do ambiente Vercel (não de um arquivo .env)

## Testando Localmente

Para testar localmente antes de fazer o deploy:

```bash
# Instalar dependências
npm install

# Executar o servidor de desenvolvimento da Vercel
vercel dev
```

Isso iniciará um servidor local que emula o ambiente da Vercel.

## Observações

1. As funções serverless têm um limite de execução de 10 segundos na Vercel. 
2. O armazenamento de arquivos continua sendo feito no Supabase Storage.
3. A funcionalidade de webhook do Mercado Pago está configurada para responder sempre com 200 OK para evitar retentativas desnecessárias.
