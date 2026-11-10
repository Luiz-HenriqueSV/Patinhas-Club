#!/bin/sh
# Liga o site no computador (Linux ou macOS). Antes, ligue o MySQL.
cd "$(dirname "$0")/Servidor" || exit 1
command -v node >/dev/null || { echo "Instale o Node.js 20 ou mais novo: https://nodejs.org"; exit 1; }
[ -d node_modules ] || npm install || exit 1
[ -f .env ] || cp .env.exemplo .env
echo "Abrindo http://localhost:3000 ..."
npm start
