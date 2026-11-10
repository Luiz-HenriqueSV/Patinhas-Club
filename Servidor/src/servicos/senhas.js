// Link de uso único para criar ou trocar a senha (vai por e-mail).
// No banco fica só o hash do token: quem ler a tabela não consegue usar o link.
const { gerarToken, hashToken } = require('../util/seguranca');

async function criarLinkDeSenha(q, usuarioId, horas) {
  const token = gerarToken();
  await q('INSERT INTO recuperacao_senha (usuario_id, token_hash, expira_em) VALUES (?, ?, NOW() + INTERVAL ? HOUR)',
    [usuarioId, hashToken(token), horas]);
  return `/redefinir-senha?token=${token}`;
}

module.exports = { criarLinkDeSenha };
