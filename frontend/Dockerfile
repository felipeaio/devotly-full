FROM nginx:alpine

# Copiar os arquivos do site
COPY . /usr/share/nginx/html

# Configurar nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Corrigir permissões 
RUN chmod -R 755 /usr/share/nginx/html && \
    chmod -R 755 /var/cache/nginx && \
    chmod -R 755 /var/log/nginx && \
    chmod -R 755 /etc/nginx/conf.d

# Expor a porta
EXPOSE 80

# Comando para iniciar o Nginx
CMD ["nginx", "-g", "daemon off;"]
