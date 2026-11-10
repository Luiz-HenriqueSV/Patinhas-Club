// Chat entre adotante e ONG: regras comuns às rotas, às páginas e ao fluxo de adoção.
const { consulta } = require('../banco');
const { publicar } = require('./tempo-real');
const { ErroHttp } = require('../util/validacao');

// Cada lado da conversa enxerga as mesmas tabelas por colunas diferentes
const LADOS = {
  adotante: {
    eu: 'adotante', outro: 'ong', coluna: 'adotante_id', colunaOutro: 'ong_id',
    leu: 'adotante_leu_ate', leuOutro: 'ong_leu_ate', naoLidas: 'nao_lidas_adotante', nomeOutro: 'ong_nome',
  },
  ong: {
    eu: 'ong', outro: 'adotante', coluna: 'ong_id', colunaOutro: 'adotante_id',
    leu: 'ong_leu_ate', leuOutro: 'adotante_leu_ate', naoLidas: 'nao_lidas_ong', nomeOutro: 'adotante_nome',
  },
};
const ladoDe = (usuario) => LADOS[usuario.tipo] || null;

/** Abre a conversa do par adotante + ONG ou reaproveita a que já existe. Devolve o id. */
async function abrirConversa({ adotanteId, ongId, animalId = null }, q = consulta) {
  await q('INSERT IGNORE INTO conversas (adotante_id, ong_id, animal_id) VALUES (?, ?, ?)', [adotanteId, ongId, animalId]);
  const [conversa] = await q('SELECT id, animal_id FROM conversas WHERE adotante_id = ? AND ong_id = ?', [adotanteId, ongId]);
  if (!conversa) throw new ErroHttp(404, 'Não foi possível abrir a conversa.');
  if (animalId && conversa.animal_id !== animalId) await q('UPDATE conversas SET animal_id = ? WHERE id = ?', [animalId, conversa.id]);
  return conversa.id;
}

/** Total de mensagens que a pessoa ainda não viu, somando todas as conversas. */
async function totalNaoLidas(usuario) {
  const lado = ladoDe(usuario);
  if (!lado) return 0;
  const [r] = await consulta(`SELECT COALESCE(SUM(${lado.naoLidas}), 0) AS total FROM vw_conversas WHERE ${lado.coluna} = ?`, [usuario.id]);
  return Number(r.total) || 0;
}

/**
 * Grava a mensagem e entrega na hora para os dois lados que estiverem conectados.
 * O INSERT não cita a tabela "conversas": o gatilho trg_mensagens_conversa atualiza
 * essa tabela e o MySQL não deixa a mesma instrução ler e alterar a mesma tabela.
 */
async function registrarMensagem({ conversaId, autor, texto, tipo = 'texto' }) {
  const r = await consulta('INSERT INTO mensagens (conversa_id, autor, tipo, texto) VALUES (?, ?, ?, ?)', [conversaId, autor, tipo, texto]);
  const [[mensagem], [conversa]] = await Promise.all([
    consulta('SELECT id, conversa_id, autor, tipo, texto, enviada_em FROM mensagens WHERE id = ?', [r.insertId]),
    consulta('SELECT * FROM vw_conversas WHERE id = ?', [conversaId]),
  ]);
  for (const lado of Object.values(LADOS)) {
    const destino = conversa[lado.coluna];
    const [soma] = await consulta(`SELECT COALESCE(SUM(${lado.naoLidas}), 0) AS total FROM vw_conversas WHERE ${lado.coluna} = ?`, [destino]);
    publicar(destino, 'mensagem', {
      conversa: conversaId,
      mensagem,
      de: conversa[lado.nomeOutro],
      naoLidasNaConversa: Number(conversa[lado.naoLidas]) || 0,
      naoLidas: Number(soma.total) || 0,
    });
  }
  return mensagem;
}

/** Marca tudo como lido para um lado e avisa o outro (o "Visto" embaixo da mensagem). */
async function marcarLida(conversa, lado) {
  const [ultima] = await consulta('SELECT COALESCE(MAX(id), 0) AS id FROM mensagens WHERE conversa_id = ?', [conversa.id]);
  if (ultima.id <= conversa[lado.leu]) return conversa[lado.leu];
  await consulta(`UPDATE conversas SET ${lado.leu} = ? WHERE id = ?`, [ultima.id, conversa.id]);
  publicar(conversa[lado.colunaOutro], 'lida', { conversa: conversa.id, ate: ultima.id });
  publicar(conversa[lado.coluna], 'naoLidas', { naoLidas: await totalNaoLidasDe(lado, conversa[lado.coluna]) });
  return ultima.id;
}
async function totalNaoLidasDe(lado, usuarioId) {
  const [r] = await consulta(`SELECT COALESCE(SUM(${lado.naoLidas}), 0) AS total FROM vw_conversas WHERE ${lado.coluna} = ?`, [usuarioId]);
  return Number(r.total) || 0;
}

/**
 * Registro automático do andamento da adoção dentro da conversa ("Pedido enviado", "Visita marcada"...).
 * Nunca derruba o fluxo principal: se o chat falhar, o pedido de adoção continua valendo.
 */
async function registrarAviso({ adotanteId, ongId, animalId, autor, texto }) {
  if (!adotanteId) return; // pedido feito sem conta: não há com quem conversar pelo site
  try {
    const conversaId = await abrirConversa({ adotanteId, ongId, animalId });
    await registrarMensagem({ conversaId, autor, texto, tipo: 'aviso' });
  } catch (erro) {
    console.warn(`[chat] aviso não registrado: ${erro.message}`);
  }
}

module.exports = { LADOS, ladoDe, abrirConversa, totalNaoLidas, registrarMensagem, marcarLida, registrarAviso };
