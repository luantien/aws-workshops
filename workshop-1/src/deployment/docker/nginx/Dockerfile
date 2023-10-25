FROM nginx:alpine
ADD ./src/deployment/docker/nginx/default.conf /etc/nginx/conf.d

COPY ./src/store /var/www/html

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
