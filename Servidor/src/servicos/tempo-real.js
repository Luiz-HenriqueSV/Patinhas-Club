// Entrega em tempo real com Server-Sent Events (SSE).
// O navegador abre uma conexão que fica aberta (EventSource) e o servidor empurra
// os eventos por ela. É HTTP comum: não precisa de biblioteca nem de WebSocket.
// Quem está sem a conexão (JavaScript desligado, rede instável) continua recebendo
// as mensagens ao recarregar a página ou pela consulta periódica do conversas.js.

const canais = new Map(); // usuarioId -> conexões abertas (uma por aba)
const MAXIMO_POR_USUARIO = 5;
const PULSO_MS = 25 * 1000; // comentário periódico: impede o proxy de fechar a conexão parada

function assinar(usuarioId, req, res) {
  let abertas = canais.get(usuarioId);
  if (!abertas) {
    abertas = new Set();
    canais.set(usuarioId, abertas);
  }
  if (abertas.size >= MAXIMO_POR_USUARIO) {
    const antiga = abertas.values().next().value;
    abertas.delete(antiga);
    antiga.end();
  }

  res.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write('retry: 4000\n\n'); // se cair, o navegador tenta de novo em 4 segundos
  abertas.add(res);

  const pulso = setInterval(() => res.write(': pulso\n\n'), PULSO_MS);
  pulso.unref();
  req.on('close', () => {
    clearInterval(pulso);
    abertas.delete(res);
    if (!abertas.size) canais.delete(usuarioId);
  });
}

/** Envia o evento para todas as abas abertas da pessoa. Devolve quantas receberam. */
function publicar(usuarioId, evento, dados) {
  const abertas = canais.get(usuarioId);
  if (!abertas) return 0;
  const pacote = `event: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`;
  for (const res of abertas) res.write(pacote);
  return abertas.size;
}

const conectado = (usuarioId) => canais.has(usuarioId);

module.exports = { assinar, publicar, conectado };
