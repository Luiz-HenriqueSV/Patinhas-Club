// Avisos para as pessoas: notificação no site e e-mail.
// Sem servidor de e-mail configurado, o e-mail aparece no terminal (bom para testar).
// Para enviar de verdade, troque o corpo de enviarEmail por um serviço (ex.: nodemailer).
const { consulta } = require('../banco');
const config = require('../config');

async function enviarEmail(para, assunto, texto) {
  if (!para) return;
  console.info(`\n[e-mail] Para: ${para}\n[e-mail] Assunto: ${assunto}\n${texto.replace(/^/gm, '  ')}\n`);
}

async function notificar(usuarioId, tipo, titulo, mensagem, link = null) {
  if (!usuarioId) return;
  await consulta(
    'INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, link) VALUES (?, ?, ?, ?, ?)',
    [usuarioId, tipo, titulo.slice(0, 120), mensagem.slice(0, 255), link],
  ).catch((erro) => console.warn(`[notificação] não gravada: ${erro.message}`));
}

/** Link absoluto: usa URL_PUBLICA do .env ou o endereço que a pessoa acessou. */
const linkAbsoluto = (req, caminho) => `${config.urlPublica || `${req.protocol}://${req.get('host')}`}${caminho}`;

module.exports = { enviarEmail, notificar, linkAbsoluto };
