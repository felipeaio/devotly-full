# Devotly - Cartões de Mensagem Cristã

Aplicação para criação e compartilhamento de cartões inspiradores com mensagens cristãs.

## Estrutura do Projeto

```
frontend/             # Frontend estático
├── api/              # API serverless
│   ├── cards/        # Endpoints para cartões
│   ├── checkout/     # Endpoints para checkout
│   └── webhook/      # Endpoints para webhooks
├── css/              # Estilos CSS
├── js/               # Scripts JavaScript
│   └── core/         # Core utilities (API config, etc.)
├── utils/            # Utilitários compartilhados
└── public/           # Arquivos estáticos
```

## Tecnologias

- Frontend: HTML, CSS, JavaScript puro
- Backend: API Serverless (Node.js)
- Banco de Dados: Supabase
- Processamento de Pagamentos: MercadoPago
- Deployment: Vercel

## Instruções de Deployment para Vercel

1. **Pré-requisitos:**
   - Conta na Vercel
   - Conta no Supabase com tabelas configuradas
   - Conta no MercadoPago (para processamento de pagamentos)

2. **Configurar variáveis de ambiente na Vercel:**
   ```
   SUPABASE_URL=sua_url_supabase
   SUPABASE_ANON_KEY=sua_chave_anon_supabase
   SUPABASE_SERVICE_KEY=sua_chave_service_supabase
   MERCADO_PAGO_ACCESS_TOKEN=seu_token_mercado_pago
   FRONTEND_URL=url_do_frontend_em_produção
   ```

3. **Fazer deploy:**
   ```bash
   # Instalar vercel CLI
   npm install -g vercel

   # Login na Vercel
   vercel login

   # Deploy para ambiente de desenvolvimento
   vercel

   # Deploy para produção
   vercel --prod
   ```

## Desenvolvimento Local

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Configurar variáveis de ambiente:**
   Crie um arquivo `.env` na raiz do projeto com as variáveis listadas acima.

3. **Iniciar servidor de desenvolvimento:**
   ```bash
   vercel dev
   ```

## Estrutura do Banco de Dados (Supabase)

### Tabela: cards
- `id`: UUID (chave primária)
- `slug`: String (URL amigável)
- `email`: String (email do criador)
- `conteudo`: JSON (conteúdo do cartão)
- `status_pagamento`: String (pendente, aprovado)
- `payment_id`: String (ID do pagamento no MercadoPago)
- `created_at`: Timestamp
- `updated_at`: Timestamp

## Fluxo da Aplicação

1. Usuário cria um cartão no frontend
2. Dados são enviados para API serverless
3. API cria registro no Supabase (status_pagamento: pendente)
4. Usuário é redirecionado para checkout do MercadoPago
5. Após pagamento, webhook recebe notificação
6. API atualiza status do cartão para "aprovado"
7. Cartão fica disponível para visualização e edição
