// Chat entre adotante e ONG (exige login de um dos dois).
const express = require('express');
const { consulta } = require('../banco');
const { leitor, idDaRota, ErroHttp } = require('../util/validacao');
const { concluir, exigir, querJson, limitar } = require('../util/resposta');
const { assinar } = require('../servicos/tempo-real');
const { ladoDe, abrirConversa, totalNaoLidas, registrarMensagem, marcarLida } = require('../servicos/conversas');

const rotas = express.Router();
rotas.use('/api/conversas', exigir('adotante', 'ong'));

const limiteEnvio = limitar({ maximo: 40, janelaMs: 60 * 1000 });

/** A conversa só existe para quem participa dela. */
async function minhaConversa(req) {
  const id = idDaRota(req.params.id);
  const lado = ladoDe(req.session.usuario);
  const [conversa] = await consulta(`SELECT * FROM vw_conversas WHERE id = ? AND ${lado.coluna} = ?`, [id, req.session.usuario.id]);
  if (!conversa) throw new ErroHttp(404, 'Conversa não encontrada.');
  return { conversa, lado };
}

/* ---------- Abrir conversa ---------- */

rotas.post('/api/conversas', async (req, res) => {
  const u = req.session.usuario;
  const l = leitor(req.body);
  let par;

  if (u.tipo === 'adotante') {
    const ongId = l.inteiro('ong_id', { obrigatorio: true, min: 1, max: 4294967295 });
    const animalId = l.inteiro('animal_id', { min: 1, max: 4294967295 });
    l.validar();
    const [ong] = await consulta("SELECT usuario_id FROM ongs WHERE usuario_id = ? AND status_verificacao = 'verificada'", [ongId]);
    if (!ong) throw new ErroHttp(404, 'Esta organização não está disponível para conversa.');
    const [animal] = animalId
      ? await consulta("SELECT id FROM animais WHERE id = ? AND ong_id = ? AND status <> 'rascunho'", [animalId, ongId])
      : [];
    par = { adotanteId: u.id, ongId, animalId: animal ? animal.id : null };
  } else {
    // A ONG só puxa conversa com quem pediu para adotar um dos animais dela (evita mensagens indesejadas)
    const adotanteId = l.inteiro('adotante_id', { obrigatorio: true, min: 1, max: 4294967295 });
    l.validar();
    const [pedido] = await consulta(
      `SELECT p.animal_id FROM pedidos_adocao p JOIN animais a ON a.id = p.animal_id
        WHERE p.adotante_id = ? AND a.ong_id = ? ORDER BY p.criado_em DESC LIMIT 1`,
      [adotanteId, u.id],
    );
    if (!pedido) throw new ErroHttp(403, 'Você só pode conversar com quem pediu para adotar um dos seus animais.');
    par = { adotanteId, ongId: u.id, animalId: pedido.animal_id };
  }

  const id = await abrirConversa(par);
  concluir(req, res, `mensagens.html?c=${id}`, { conversa: id });
});

/* ---------- Tempo real e contadores ---------- */

rotas.get('/api/conversas/eventos', (req, res) => {
  assinar(req.session.usuario.id, req, res);
});

rotas.get('/api/conversas/nao-lidas', async (req, res) => {
  res.set('Cache-Control', 'no-store').json({ ok: true, naoLidas: await totalNaoLidas(req.session.usuario) });
});

/* ---------- Mensagens de uma conversa ---------- */

// Usado quando a conexão em tempo real cai: traz o que chegou depois da última mensagem na tela
rotas.get('/api/conversas/:id/mensagens', async (req, res) => {
  const { conversa, lado } = await minhaConversa(req);
  const depois = Math.max(0, Number(req.query.depois) || 0);
  const mensagens = await consulta(
    'SELECT id, conversa_id, autor, tipo, texto, enviada_em FROM mensagens WHERE conversa_id = ? AND id > ? ORDER BY id LIMIT 200',
    [conversa.id, depois],
  );
  res.set('Cache-Control', 'no-store').json({ ok: true, mensagens, vistoAte: conversa[lado.leuOutro] });
});

rotas.post('/api/conversas/:id/mensagens', limiteEnvio, async (req, res) => {
  const { conversa, lado } = await minhaConversa(req);
  const l = leitor(req.body);
  const texto = l.texto('texto', { obrigatorio: true, max: 1000, multilinha: true });
  l.validar();
  const mensagem = await registrarMensagem({ conversaId: conversa.id, autor: lado.eu, texto });
  if (querJson(req)) return res.json({ ok: true, mensagem });
  return res.redirect(303, `/mensagens.html?c=${conversa.id}#fim`);
});

rotas.post('/api/conversas/:id/lida', async (req, res) => {
  const { conversa, lado } = await minhaConversa(req);
  const ate = await marcarLida(conversa, lado);
  res.json({ ok: true, ate, naoLidas: await totalNaoLidas(req.session.usuario) });
});

module.exports = rotas;
