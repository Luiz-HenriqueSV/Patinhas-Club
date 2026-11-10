// Conexão com o banco de dados. Por padrão é o banco embutido (SQLite do próprio Node, num
// arquivo em Servidor/dados), que não precisa instalar nada; com BANCO=mysql no .env, usa o
// MySQL/MariaDB (XAMPP). Os dois recebem o mesmo SQL e devolvem as linhas do mesmo jeito.
const { AsyncLocalStorage } = require('node:async_hooks');
const config = require('./config');

const embutido = config.banco.tipo !== 'mysql';
const pool = embutido
  ? require('./banco-embutido').createPool({ arquivo: config.banco.arquivo })
  : require('mysql2/promise').createPool({
    ...config.banco.mysql,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true, // datas chegam como texto: "2026-10-08 14:30:00"
    decimalNumbers: true, // DECIMAL chega como número (coordenadas, valores)
  });

// Dentro de transacao(), quem chamar consulta() sem passar a conexão continua na mesma transação
const transacaoAtual = new AsyncLocalStorage();

/** Executa uma consulta com parâmetros (?) e devolve as linhas ou o resultado do INSERT/UPDATE. */
async function consulta(sql, parametros = [], conexao = null) {
  const atual = transacaoAtual.getStore();
  const alvo = conexao || (atual && atual.aberta ? atual.conexao : pool);
  const [resultado] = await alvo.query(sql, parametros);
  return resultado;
}

/**
 * Executa várias consultas como uma coisa só: se qualquer uma falhar, nada fica gravado.
 * O trabalho recebe q(sql, parametros), igual a consulta(), mas dentro da transação.
 */
async function transacao(trabalho) {
  const atual = transacaoAtual.getStore();
  if (atual && atual.aberta) return trabalho((sql, parametros) => consulta(sql, parametros, atual.conexao));
  const conexao = await pool.getConnection();
  const estado = { conexao, aberta: true };
  try {
    await conexao.beginTransaction();
    const resultado = await transacaoAtual.run(estado, () => trabalho((sql, parametros) => consulta(sql, parametros, conexao)));
    await conexao.commit();
    return resultado;
  } catch (erro) {
    await conexao.rollback().catch(() => {});
    throw erro;
  } finally {
    estado.aberta = false;
    conexao.release();
  }
}

module.exports = { pool, consulta, transacao, embutido };
