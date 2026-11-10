// Sessões guardadas no MySQL (tabela "sessoes"): o login continua valendo depois de
// reiniciar o servidor e funciona com mais de uma cópia do servidor rodando.
// Segue a interface de "store" do express-session: get, set, destroy e touch.
const session = require('express-session');
const { consulta } = require('../banco');

const UM_DIA = 24 * 60 * 60 * 1000;
const FORA_DO_AR = new Set(['ECONNREFUSED', 'ER_BAD_DB_ERROR', 'ER_NO_SUCH_TABLE', 'ER_ACCESS_DENIED_ERROR', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT']);

const vencimento = (dados) => {
  const expira = dados && dados.cookie && dados.cookie.expires ? new Date(dados.cookie.expires) : null;
  return expira && !Number.isNaN(expira.getTime()) ? expira : new Date(Date.now() + UM_DIA);
};

class SessoesNoBanco extends session.Store {
  constructor() {
    super();
    // Limpa as sessões vencidas de hora em hora
    setInterval(() => consulta('DELETE FROM sessoes WHERE expira_em < NOW()').catch(() => {}), 60 * 60 * 1000).unref();
  }

  get(id, pronto) {
    consulta('SELECT dados FROM sessoes WHERE id = ? AND expira_em > NOW()', [id])
      .then(([linha]) => pronto(null, linha ? JSON.parse(linha.dados) : null))
      // Banco desligado: as páginas públicas continuam abrindo (como visitante)
      .catch((erro) => (FORA_DO_AR.has(erro.code) ? pronto(null, null) : pronto(erro)));
  }

  set(id, dados, pronto = () => {}) {
    const json = JSON.stringify(dados);
    const expira = vencimento(dados);
    consulta('INSERT INTO sessoes (id, dados, expira_em) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE dados = ?, expira_em = ?',
      [id, json, expira, json, expira])
      .then(() => pronto(null), pronto);
  }

  destroy(id, pronto = () => {}) {
    consulta('DELETE FROM sessoes WHERE id = ?', [id]).then(() => pronto(null), pronto);
  }

  touch(id, dados, pronto = () => {}) {
    consulta('UPDATE sessoes SET expira_em = ? WHERE id = ?', [vencimento(dados), id]).then(() => pronto(null), pronto);
  }
}

module.exports = { SessoesNoBanco };
