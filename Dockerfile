## Builder
FROM node:24.13.1-alpine AS builder

WORKDIR /src

COPY .npmrc package.json package-lock.json /src/
RUN npm ci
COPY . /src/
ENV NODE_OPTIONS=--max_old_space_size=4096
RUN npm run build


## App
FROM nginx:1.31.4-alpine

COPY --from=builder /src/dist /app
COPY --from=builder /src/docker-nginx.conf /etc/nginx/conf.d/default.conf

RUN rm -rf /usr/share/nginx/html \
  && ln -s /app /usr/share/nginx/html \
  && mkdir -p /etc/nginx/certs \
  && apk add --no-cache openssl \
  && printf "[req]\ndistinguished_name=req\nx509_extensions=v3_req\n[req_distinguished_name]\n[v3_req]\nsubjectAltName=@alt_names\n[alt_names]\nDNS.1=localhost\nIP.1=134.65.28.106\nIP.2=127.0.0.1\n" > /tmp/openssl.cnf \
  && openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
       -keyout /etc/nginx/certs/key.pem \
       -out /etc/nginx/certs/cert.pem \
       -subj "/CN=localhost" \
       -config /tmp/openssl.cnf -extensions v3_req \
  && chmod 600 /etc/nginx/certs/key.pem \
  && chmod 644 /etc/nginx/certs/cert.pem

EXPOSE 80 443
