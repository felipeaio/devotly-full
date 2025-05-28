FROM nginx:alpine

# Instalar envsubst e curl para healthcheck
RUN apk add --no-cache gettext curl

# Remover configuração padrão do nginx
RUN rm /etc/nginx/conf.d/default.conf
RUN rm -rf /usr/share/nginx/html/*

# Criar diretórios necessários
RUN mkdir -p /var/cache/nginx /var/log/nginx /etc/nginx/conf.d

# Copiar arquivos do site primeiro
COPY . /usr/share/nginx/html/

# Copiar template de configuração nginx
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Corrigir permissões
RUN chmod -R 755 /usr/share/nginx/html && \
    chmod -R 755 /var/cache/nginx && \
    chmod -R 755 /var/log/nginx && \
    chmod -R 755 /etc/nginx && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx

# Variável de ambiente para porta (Railway define automaticamente)
ENV PORT=8080

# Expor a porta
EXPOSE $PORT

# Healthcheck interno
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/health || exit 1

# Script de inicialização
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'echo "Starting nginx on port $PORT"' >> /start.sh && \
    echo 'envsubst '\''$PORT'\'' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf' >> /start.sh && \
    echo 'echo "Nginx config generated. Testing..."' >> /start.sh && \
    echo 'nginx -t' >> /start.sh && \
    echo 'echo "Starting nginx..."' >> /start.sh && \
    echo 'exec nginx -g "daemon off;"' >> /start.sh && \
    chmod +x /start.sh

CMD ["/start.sh"]
