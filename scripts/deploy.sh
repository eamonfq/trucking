#!/bin/bash
set -e  # Detiene el script si cualquier comando falla

echo "=== Deploy AYL Trucking ==="
cd /var/www/trucking

echo "[1/6] Bajando cambios de git..."
GIT_SSH_COMMAND="ssh -i /home/deployer/.ssh/github_trucking" git pull --ff-only origin master

echo "[2/6] Instalando dependencias..."
npm ci --include=dev

echo "[3/6] Aplicando migraciones..."
npm run db:migrate

echo "[4/6] Compilando (build)..."
npm run build

echo "[5/6] Reiniciando aplicacion y worker..."
pm2 restart truckingayl
pm2 restart truckingayl-worker
pm2 save

echo "[6/6] Verificando..."
sleep 3
CODE=$(curl -o /dev/null -s -w '%{http_code}' http://127.0.0.1:3100/admin)
if [ "$CODE" = "200" ] || [ "$CODE" = "307" ] || [ "$CODE" = "302" ]; then
  echo "✅ Deploy OK (HTTP $CODE)"
else
  echo "⚠️  Deploy terminado pero /admin devolvió HTTP $CODE — revisa: pm2 logs truckingayl"
fi
