// Conexão com o MySQL/MariaDB (pool de conexões reaproveitadas).
const mysql = require('mysql2/promise');
const config = require('./config');

const pool = mysql.createPool({
  ...config.banco,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true, // datas chegam como texto: "2026-10-08 14:30:00"
  decimalNumbers: true, // DECIMAL chega como número (coordenadas, valores)
});

/** Executa uma consulta com parâmetros (?) e devolve as linhas ou o resultado do INSERT/UPDATE. */
async function consulta(sql, parametros = [], conexao = pool) {
  const [resultado] = await conexao.query(sql, parametros);
  return resultado;
}

/**
 * Executa várias consultas como uma coisa só: se qualquer uma falhar, nada fica gravado.
 * O trabalho recebe q(sql, parametros), igual a consulta(), mas dentro da transação.
 */
async function transacao(trabalho) {
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();
    const resultado = await trabalho((sql, parametros) => consulta(sql, parametros, conexao));
    await conexao.commit();
    return resultado;
  } catch (erro) {
    await conexao.rollback().catch(() => {});
    throw erro;
  } finally {
    conexao.release();
  }
}

module.exports = { pool, consulta, transacao };
