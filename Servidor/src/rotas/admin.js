// Administração (exige conta da equipe): valida ONGs, analisa denúncias e responde o suporte.
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const config = require('../config');
const { consulta, transacao } = require('../banco');
const { leitor, idDaRota, ErroHttp } = require('../util/validacao');
const { concluir, exigir } = require('../util/resposta');
const { enviarEmail, notificar, linkAbsoluto } = require('../servicos/mensagens');
const { criarLinkDeSenha } = require('../servicos/senhas');
const { STATUS_DENUNCIA } = require('../modelos-atendimento');

const rotas = express.Router();
rotas.use('/api/admin', exigir('admin'));

/* ---------- Validação das ONGs ---------- */

async function ongPendente(req) {
  const id = idDaRota(req.params.id);
  const [ong] = await consulta(
    `SELECT o.usuario_id AS id, o.nome, o.responsavel, u.email, u.senha_hash FROM ongs o JOIN usuarios u ON u.id = o.usuario_id
      WHERE o.usuario_id = ? AND o.status_verificacao = 'pendente'`,
    [id],
  );
  if (!ong) throw new ErroHttp(404, 'Este cadastro já foi analisado.');
  return ong;
}

rotas.post('/api/admin/ongs/:id/aprovar', async (req, res) => {
  const ong = await ongPendente(req);
  const link = await transacao(async (q) => {
    await q("UPDATE ongs SET status_verificacao = 'verificada', verificada_em = NOW(), motivo_recusa = NULL WHERE usuario_id = ?", [ong.id]);
    return ong.senha_hash ? null : criarLinkDeSenha(q, ong.id, 24 * 7);
  });
  enviarEmail(ong.email, 'Seu cadastro no Patinhas Club foi aprovado!',
    `Olá, ${ong.responsavel}! ${ong.nome} já aparece no Patinhas Club.\n`
    + (link ? `Crie a sua senha pelo link abaixo (vale por 7 dias):\n${linkAbsoluto(req, link)}` : 'Entre com o seu e-mail e senha de sempre.'));
  notificar(ong.id, 'sistema', 'Cadastro aprovado', 'Sua organização já aparece no site. Cadastre o primeiro animal!', 'cadastrar-animal.html');
  concluir(req, res, 'admin.html#ong-aprovada');
});

rotas.post('/api/admin/ongs/:id/recusar', async (req, res) => {
  const ong = await ongPendente(req);
  const l = leitor(req.body);
  const motivo = l.texto('motivo', { obrigatorio: true, max: 255, multilinha: true });
  l.validar();
  await consulta("UPDATE ongs SET status_verificacao = 'recusada', motivo_recusa = ? WHERE usuario_id = ?", [motivo, ong.id]);
  enviarEmail(ong.email, 'Sobre o cadastro no Patinhas Club',
    `Olá, ${ong.responsavel}! Não conseguimos aprovar o cadastro de ${ong.nome} agora.\nMotivo: ${motivo}\n`
    + `Se quiser, responda pela Central de ajuda: ${linkAbsoluto(req, '/ajuda.html#falar')}`);
  concluir(req, res, 'admin.html#ong-recusada');
});

/* ---------- Denúncias ---------- */

rotas.post('/api/admin/denuncias/:id', async (req, res) => {
  const id = idDaRota(req.params.id);
  const l = leitor(req.body);
  const status = l.opcao('status', Object.keys(STATUS_DENUNCIA), { obrigatorio: true });
  const parecer = l.texto('parecer', { max: 500, multilinha: true });
  l.validar();
  const [denuncia] = await consulta('SELECT id, status, usuario_id, receber_andamento, denunciante_email FROM denuncias WHERE id = ?', [id]);
  if (!denuncia) throw new ErroHttp(404, 'Denúncia não encontrada.');
  await consulta('UPDATE denuncias SET status = ?, parecer = ? WHERE id = ?', [status, parecer, id]);
  if (status !== denuncia.status) {
    const texto = `A denúncia de protocolo ${id} agora está: ${STATUS_DENUNCIA[status][1].toLowerCase()}.`;
    if (denuncia.receber_andamento && denuncia.denunciante_email) enviarEmail(denuncia.denunciante_email, 'Andamento da sua denúncia', texto);
    if (denuncia.usuario_id) notificar(denuncia.usuario_id, 'sistema', 'Andamento da denúncia', texto, null);
  }
  concluir(req, res, 'admin.html#denuncia-atualizada');
});

/* ---------- Chamados de suporte ---------- */

rotas.post('/api/admin/chamados/:id/mensagens', async (req, res) => {
  const id = idDaRota(req.params.id);
  const l = leitor(req.body);
  const texto = l.texto('texto', { obrigatorio: true, max: 2000, multilinha: true });
  const encerrar = l.marcado('resolver');
  l.validar();
  const [chamado] = await consulta('SELECT id, protocolo, usuario_id, nome, email, assunto FROM chamados_suporte WHERE id = ?', [id]);
  if (!chamado) throw new ErroHttp(404, 'Chamado não encontrado.');
  // O gatilho do banco deixa o chamado "respondido"; encerrar vem depois e vira "resolvido"
  await consulta("INSERT INTO chamado_mensagens (chamado_id, autor, admin_id, texto) VALUES (?, 'equipe', ?, ?)", [id, req.session.usuario.id, texto]);
  if (encerrar) await consulta("UPDATE chamados_suporte SET status = 'resolvido' WHERE id = ?", [id]);
  const link = `ajuda.html?chamado=${chamado.protocolo}#chamado`;
  enviarEmail(chamado.email, `Resposta do suporte (${chamado.protocolo})`,
    `Olá, ${chamado.nome}!\n\n${texto}\n\nVeja a conversa completa: ${linkAbsoluto(req, `/${link}`)}`);
  if (chamado.usuario_id) notificar(chamado.usuario_id, 'sistema', 'O suporte respondeu', chamado.assunto, link);
  concluir(req, res, 'admin.html#chamado-respondido');
});

/* ---------- Arquivos privados (documentos das ONGs e provas das denúncias) ---------- */

function enviarPrivado(res, arquivo) {
  const caminho = path.join(config.pastas.privado, path.basename(String(arquivo || '')));
  if (!arquivo || !fs.existsSync(caminho)) throw new ErroHttp(404, 'Arquivo não encontrado (os dados de exemplo não têm o arquivo de verdade).');
  res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline' });
  fs.createReadStream(caminho).pipe(res.type(path.extname(caminho)));
}

rotas.get('/api/admin/documentos/:id', async (req, res) => {
  const [doc] = await consulta('SELECT arquivo FROM ong_documentos WHERE id = ?', [idDaRota(req.params.id)]);
  enviarPrivado(res, doc && doc.arquivo);
});

rotas.get('/api/admin/midias/:id', async (req, res) => {
  const [midia] = await consulta('SELECT arquivo FROM denuncia_midias WHERE id = ?', [idDaRota(req.params.id)]);
  enviarPrivado(res, midia && midia.arquivo);
});

module.exports = rotas;
