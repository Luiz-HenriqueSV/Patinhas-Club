// Central de ajuda: chamados de suporte, com ou sem conta.
// Quem abriu sem conta acompanha pelo protocolo + e-mail; a sessão lembra os protocolos já confirmados.
const crypto = require('node:crypto');
const express = require('express');
const { consulta, transacao } = require('../banco');
const { leitor, ErroHttp, ErroValidacao } = require('../util/validacao');
const { concluir, limitar } = require('../util/resposta');
const { enviarEmail, notificar, linkAbsoluto } = require('../servicos/mensagens');
const { CATEGORIAS } = require('../modelos-atendimento');

const rotas = express.Router();
const limiteAbrir = limitar({ maximo: 6, janelaMs: 10 * 60 * 1000 });
const limiteConsulta = limitar({ maximo: 20, janelaMs: 10 * 60 * 1000 });

// Sem 0/O e 1/I/L, que se confundem quando a pessoa digita o protocolo
const LETRAS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const novoProtocolo = () => `SUP-${Array.from(crypto.randomBytes(8), (b) => LETRAS[b % LETRAS.length]).join('')}`;
const PROTOCOLO = /^SUP-[2-9A-Z]{8}$/;

const destino = (protocolo) => `ajuda.html?chamado=${protocolo}#chamado`;

function lembrar(req, protocolo) {
  const lista = new Set(req.session.chamados || []);
  lista.add(protocolo);
  req.session.chamados = [...lista].slice(-10);
}

/** Quem pode ver o chamado: quem abriu (pela conta ou pela sessão) e a equipe. */
function podeVer(req, chamado) {
  const u = req.session.usuario;
  return Boolean((req.session.chamados || []).includes(chamado.protocolo)
    || (u && (u.tipo === 'admin' || (chamado.usuario_id && chamado.usuario_id === u.id))));
}

async function chamadoDoPedido(req) {
  const protocolo = String(req.params.protocolo || '').toUpperCase();
  if (!PROTOCOLO.test(protocolo)) throw new ErroHttp(404, 'Chamado não encontrado.');
  const [chamado] = await consulta('SELECT * FROM chamados_suporte WHERE protocolo = ?', [protocolo]);
  if (!chamado || !podeVer(req, chamado)) {
    throw new ErroHttp(404, 'Chamado não encontrado. Confira o protocolo em "Acompanhar chamado".');
  }
  return chamado;
}

/** Avisa a equipe (aparece nos avisos do painel de administração). */
async function avisarEquipe(titulo, mensagem, link) {
  const equipe = await consulta('SELECT usuario_id FROM administradores');
  for (const a of equipe) notificar(a.usuario_id, 'sistema', titulo, mensagem, link);
}

rotas.post('/api/suporte/chamados', limiteAbrir, async (req, res) => {
  const l = leitor(req.body);
  const d = {
    categoria: l.opcao('categoria', Object.keys(CATEGORIAS), { obrigatorio: true }),
    assunto: l.texto('assunto', { obrigatorio: true, max: 150 }),
    mensagem: l.texto('mensagem', { obrigatorio: true, max: 2000, multilinha: true }),
    nome: l.texto('nome', { obrigatorio: true, max: 120 }),
    email: l.email('email', { obrigatorio: true }),
  };
  l.validar();
  const u = req.session.usuario;
  const usuarioId = u && u.tipo !== 'admin' ? u.id : null;

  let protocolo;
  for (let tentativa = 0; ; tentativa += 1) {
    protocolo = novoProtocolo();
    try {
      await transacao(async (q) => {
        const r = await q(
          'INSERT INTO chamados_suporte (protocolo, usuario_id, nome, email, categoria, assunto) VALUES (?, ?, ?, ?, ?, ?)',
          [protocolo, usuarioId, d.nome, d.email, d.categoria, d.assunto],
        );
        await q("INSERT INTO chamado_mensagens (chamado_id, autor, texto) VALUES (?, 'solicitante', ?)", [r.insertId, d.mensagem]);
      });
      break;
    } catch (erro) {
      if (erro.code !== 'ER_DUP_ENTRY' || tentativa >= 3) throw erro; // protocolo repetido: sorteia outro
    }
  }

  lembrar(req, protocolo);
  enviarEmail(d.email, `Recebemos o seu pedido de ajuda (${protocolo})`,
    `Olá, ${d.nome}! Recebemos a sua mensagem sobre "${d.assunto}".\nAcompanhe a resposta em ${linkAbsoluto(req, `/${destino(protocolo)}`)}\nProtocolo: ${protocolo}`);
  avisarEquipe(`Novo chamado: ${d.assunto}`, `${d.nome} · ${CATEGORIAS[d.categoria]}`, 'admin.html#chamados').catch(() => {});
  concluir(req, res, destino(protocolo), { protocolo });
});

rotas.post('/api/suporte/acompanhar', limiteConsulta, async (req, res) => {
  const l = leitor(req.body);
  const protocolo = String(l.texto('protocolo', { obrigatorio: true, max: 12 }) || '').toUpperCase();
  const email = l.email('email', { obrigatorio: true });
  l.validar();
  const [chamado] = PROTOCOLO.test(protocolo)
    ? await consulta('SELECT protocolo FROM chamados_suporte WHERE protocolo = ? AND email = ?', [protocolo, email])
    : [];
  // Mesma mensagem para protocolo e e-mail: ninguém descobre chamados dos outros testando protocolos
  if (!chamado) throw new ErroValidacao({ protocolo: 'Protocolo ou e-mail não conferem.' }, 'Protocolo ou e-mail não conferem.');
  lembrar(req, chamado.protocolo);
  concluir(req, res, destino(chamado.protocolo));
});

rotas.post('/api/suporte/chamados/:protocolo/mensagens', limiteAbrir, async (req, res) => {
  const chamado = await chamadoDoPedido(req);
  const l = leitor(req.body);
  const texto = l.texto('texto', { obrigatorio: true, max: 2000, multilinha: true });
  l.validar();
  await consulta("INSERT INTO chamado_mensagens (chamado_id, autor, texto) VALUES (?, 'solicitante', ?)", [chamado.id, texto]);
  avisarEquipe(`Chamado ${chamado.protocolo} tem novidade`, chamado.assunto, 'admin.html#chamados').catch(() => {});
  concluir(req, res, destino(chamado.protocolo));
});

rotas.post('/api/suporte/chamados/:protocolo/resolver', async (req, res) => {
  const chamado = await chamadoDoPedido(req);
  await consulta("UPDATE chamados_suporte SET status = 'resolvido', atualizado_em = NOW() WHERE id = ?", [chamado.id]);
  concluir(req, res, destino(chamado.protocolo));
});

module.exports = { rotas, podeVer, PROTOCOLO };
