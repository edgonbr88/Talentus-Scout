#!/usr/bin/env bash
set -e

mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/server.key \
  -out nginx/ssl/server.crt \
  -subj "/C=VE/ST=Miranda/L=Caracas/O=Talentus Scout Dev/CN=localhost"

echo "Certificados SSL locales generados en nginx/ssl/"
