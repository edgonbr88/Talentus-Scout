#!/usr/bin/env bash
set -e

echo "=== Levantando Entorno de Desarrollo Local Talentus Scout ==="
docker compose up -d

echo ""
echo "=== Estado de los Contenedores ==="
docker compose ps
