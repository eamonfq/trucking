#!/usr/bin/env bash
# Respaldo de la base de producción (servidor cargo) hacia esta Mac.
#
# En el servidor solo lee: ejecuta mysqldump con --single-transaction (no bloquea
# tablas InnoDB) y envía el resultado por SSH. No instala nada ni deja archivos allí.
#
# Uso:   scripts/respaldo-produccion.sh
# Destino: $AYL_RESPALDOS (por defecto ~/Respaldos/ayl-produccion), carpeta 700 y
# archivos 600. Conserva los $AYL_RESPALDOS_CONSERVAR más recientes (por defecto 30).
#
# El respaldo es completo (incluye hashes de contraseña, sesiones y la cola cifrada):
# no subirlo a Git, no compartirlo y no importarlo como base de desarrollo; para eso
# está la copia saneada (docs/arquitectura.md, «Copia local»).
set -euo pipefail

DESTINO="${AYL_RESPALDOS:-$HOME/Respaldos/ayl-produccion}"
CONSERVAR="${AYL_RESPALDOS_CONSERVAR:-30}"
SERVIDOR="${AYL_SERVIDOR:-cargo-deploy}"

umask 077
mkdir -p "$DESTINO"
chmod 700 "$DESTINO"

FECHA="$(date -u +%Y%m%dT%H%M%SZ)"
FINAL="$DESTINO/ayl_real-$FECHA.sql.gz"
PARCIAL="$DESTINO/.ayl_real-$FECHA.sql.gz.parcial"
trap 'rm -f "$PARCIAL"' EXIT

echo "Respaldando ayl_real desde ${SERVIDOR}…"
ssh -o BatchMode=yes "$SERVIDOR" 'bash -s' <<'REMOTO' | gzip -9 > "$PARCIAL"
set -euo pipefail
cd /var/www/trucking
exec node -e '
process.loadEnvFile(".env.local");
const u = new URL(process.env.DATABASE_URL);
const { spawn } = require("node:child_process");
const args = ["--host=" + u.hostname, "--port=" + (u.port || 3306), "--user=" + decodeURIComponent(u.username),
  "--single-transaction", "--quick", "--hex-blob", "--no-tablespaces", "--set-gtid-purged=OFF",
  "--default-character-set=utf8mb4", u.pathname.slice(1)];
const p = spawn("mysqldump", args, { env: { ...process.env, MYSQL_PWD: decodeURIComponent(u.password) }, stdio: ["ignore", "inherit", "inherit"] });
p.on("exit", code => process.exit(code ?? 1));
'
REMOTO

# Un dump cortado no termina con esta línea: no se guarda como respaldo válido.
if ! gzip -dc "$PARCIAL" | tail -1 | grep -q '^-- Dump completed'; then
  echo "ERROR: el respaldo está incompleto; no se guardó." >&2
  exit 1
fi

mv "$PARCIAL" "$FINAL"
(cd "$DESTINO" && shasum -a 256 "$(basename "$FINAL")" > "$(basename "$FINAL").sha256")

# Rotación: conservar solo los más recientes.
ls -1t "$DESTINO"/ayl_real-*.sql.gz 2>/dev/null | tail -n +"$((CONSERVAR + 1))" | while read -r viejo; do
  rm -f "$viejo" "$viejo.sha256"
done

echo "Respaldo guardado: $FINAL ($(du -h "$FINAL" | cut -f1))"
echo "Respaldos conservados: $(ls -1 "$DESTINO"/ayl_real-*.sql.gz | wc -l | tr -d ' ') (máximo $CONSERVAR)"
