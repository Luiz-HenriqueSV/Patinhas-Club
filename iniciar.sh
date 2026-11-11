#!/usr/bin/env bash
# Patinhas Club no Linux ou macOS. Não precisa instalar nada:
#   ./iniciar.sh          liga o site e abre o navegador
#   ./iniciar.sh banco    recria o banco com os dados de exemplo e liga o site
# Na primeira vez baixa um Node.js portátil só para esta pasta (se o computador não tiver o 22.13
# ou mais novo), instala as bibliotecas do servidor e cria o banco (Servidor/dados/patinhas.db).
set -e
cd "$(dirname "$0")"
RAIZ="$(pwd)"
PORTATIL="$RAIZ/.node/node"

node_do_computador_serve() {
  command -v node >/dev/null 2>&1 || return 1
  grep -qiE '^ *BANCO *= *mysql' Servidor/.env 2>/dev/null && return 0
  node -e "process.exit(typeof require('node:sqlite').DatabaseSync.prototype.function === 'function' ? 0 : 1)" >/dev/null 2>&1
}

baixar_node() {
  echo "Este computador não tem o Node.js 22 ou mais novo. Baixando uma cópia portátil só para esta pasta (~30 MB)..."
  case "$(uname -s)" in Linux) so=linux ;; Darwin) so=darwin ;; *) echo "Sistema não suportado: instale o Node.js 22 em https://nodejs.org"; return 1 ;; esac
  case "$(uname -m)" in x86_64 | amd64) arq=x64 ;; arm64 | aarch64) arq=arm64 ;; *) echo "Processador não suportado: instale o Node.js 22 em https://nodejs.org"; return 1 ;; esac
  local site=https://nodejs.org/dist/latest-v22.x
  local tmp="$RAIZ/.node/baixando"
  rm -rf "$tmp" && mkdir -p "$tmp"
  curl -fsSL "$site/SHASUMS256.txt" -o "$tmp/SHASUMS256.txt"
  local linha arquivo oficial baixado
  linha=$(grep -- "-$so-$arq.tar.gz\$" "$tmp/SHASUMS256.txt")
  oficial=${linha%% *}
  arquivo=${linha##* }
  curl -fL --progress-bar "$site/$arquivo" -o "$tmp/$arquivo"
  if command -v sha256sum >/dev/null 2>&1; then baixado=$(sha256sum "$tmp/$arquivo"); else baixado=$(shasum -a 256 "$tmp/$arquivo"); fi
  [ "${baixado%% *}" = "$oficial" ] || { echo "O arquivo baixado veio diferente do oficial. Tente de novo."; return 1; }
  tar -xzf "$tmp/$arquivo" -C "$tmp"
  rm -rf "$PORTATIL"
  mv "$tmp/${arquivo%.tar.gz}" "$PORTATIL"
  rm -rf "$tmp"
}

if [ -x "$PORTATIL/bin/node" ]; then
  export PATH="$PORTATIL/bin:$PATH"
elif ! node_do_computador_serve; then
  baixar_node
  export PATH="$PORTATIL/bin:$PATH"
fi

cd Servidor
if ! node -e "for (const d of Object.keys(require('./package.json').dependencies)) require.resolve(d)" >/dev/null 2>&1; then
  echo "Instalando as bibliotecas do servidor (só na primeira vez, precisa de internet)..."
  npm install --no-audit --no-fund
fi
[ -f .env ] || cp .env.exemplo .env
if [ "${1:-}" = "banco" ]; then
  echo "Recriando o banco de dados com os dados de exemplo..."
  node src/criar-banco.js
fi
echo "Ligando o Patinhas Club. O navegador abre sozinho; para desligar, Ctrl+C."
exec node src/servidor.js --abrir
