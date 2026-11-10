// Testes do banco embutido: o SQL escrito para MySQL precisa funcionar igual no SQLite do Node.
const { test, after } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createPool } = require('../src/banco-embutido');

const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'patinhas-teste-'));
after(() => fs.rmSync(pasta, { recursive: true, force: true }));
let n = 0;
async function bancoNovo() {
  const pool = createPool({ arquivo: path.join(pasta, `banco-${n += 1}.db`) });
  await pool.query(`
    CREATE TABLE pessoas (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      email VARCHAR(20) NOT NULL,
      tipo ENUM('adotante','ong') NOT NULL DEFAULT 'adotante',
      pontos INT NOT NULL DEFAULT 0,
      criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_pessoas_email (email),
      KEY idx_pessoas_tipo (tipo)
    ) ENGINE=InnoDB COMMENT='teste';`);
  return pool;
}
const linhas = async (pool, sql, p) => (await pool.query(sql, p))[0];

test('AUTO_INCREMENT, DEFAULT CURRENT_TIMESTAMP e insertId como no mysql2', async () => {
  const pool = await bancoNovo();
  const r = await linhas(pool, 'INSERT INTO pessoas (email) VALUES (?)', ['a@x.com']);
  assert.equal(r.insertId, 1);
  assert.equal(r.affectedRows, 1);
  const [p] = await linhas(pool, 'SELECT * FROM pessoas WHERE id = ?', [1]);
  assert.equal(p.tipo, 'adotante');
  assert.match(p.criado_em, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
});

test('texto compara sem diferenciar maiúsculas (como utf8mb4_unicode_ci)', async () => {
  const pool = await bancoNovo();
  await linhas(pool, 'INSERT INTO pessoas (email) VALUES (?)', ['Maria@X.com']);
  assert.equal((await linhas(pool, 'SELECT id FROM pessoas WHERE email = ?', ['maria@x.com'])).length, 1);
});

test('chave única repetida vira ER_DUP_ENTRY com o nome da chave', async () => {
  const pool = await bancoNovo();
  await linhas(pool, 'INSERT INTO pessoas (email) VALUES (?)', ['a@x.com']);
  await assert.rejects(linhas(pool, 'INSERT INTO pessoas (email) VALUES (?)', ['A@x.com']),
    (e) => e.code === 'ER_DUP_ENTRY' && e.errno === 1062 && e.message.includes('uq_pessoas_email'));
  const ignorado = await linhas(pool, 'INSERT IGNORE INTO pessoas (email) VALUES (?)', ['a@x.com']);
  assert.equal(ignorado.affectedRows, 0);
  assert.equal(ignorado.insertId, 0);
});

test('ENUM e VARCHAR(n) recusam valor fora da regra', async () => {
  const pool = await bancoNovo();
  await assert.rejects(linhas(pool, "INSERT INTO pessoas (email, tipo) VALUES ('b@x.com', 'gato')"), { code: 'WARN_DATA_TRUNCATED' });
  await assert.rejects(linhas(pool, 'INSERT INTO pessoas (email) VALUES (?)', ['x'.repeat(21)]), { code: 'ER_DATA_TOO_LONG' });
});

test('ON DUPLICATE KEY UPDATE, IF(), IN (?) com lista e ON UPDATE CURRENT_TIMESTAMP', async () => {
  const pool = await bancoNovo();
  await linhas(pool, 'INSERT INTO pessoas (email, pontos) VALUES (?, ?) ON DUPLICATE KEY UPDATE pontos = pontos + VALUES(pontos)', ['a@x.com', 2]);
  await linhas(pool, 'INSERT INTO pessoas (email, pontos) VALUES (?, ?) ON DUPLICATE KEY UPDATE pontos = pontos + VALUES(pontos)', ['a@x.com', 3]);
  await linhas(pool, 'INSERT INTO pessoas (email) VALUES ?', [[['b@x.com'], ['c@x.com']]]);
  const r = await linhas(pool, "SELECT email, IF(pontos > 4, 'muitos', 'poucos') AS faixa FROM pessoas WHERE email IN (?) ORDER BY id", [['a@x.com', 'c@x.com']]);
  assert.deepEqual(r.map((x) => [x.email, x.faixa]), [['a@x.com', 'muitos'], ['c@x.com', 'poucos']]);
  await linhas(pool, 'UPDATE pessoas SET pontos = 1 WHERE email = ?', ['b@x.com']);
  const [b] = await linhas(pool, 'SELECT atualizado_em FROM pessoas WHERE email = ?', ['b@x.com']);
  assert.ok(b.atualizado_em, 'preencheu a coluna ON UPDATE CURRENT_TIMESTAMP');
});

test('datas com INTERVAL, DATE_SUB e funções do MySQL', async () => {
  const pool = await bancoNovo();
  const [r] = await linhas(pool, `SELECT '2026-01-31' + INTERVAL 1 MONTH AS mes, DATE_SUB('2026-03-01 10:00:00', INTERVAL 2 HOUR) AS horas,
    TIMESTAMPDIFF(DAY, '2026-01-01', '2026-01-31') AS dias, YEAR(NOW()) >= 2026 AS ano, CHAR_LENGTH('ação') AS letras,
    GROUP_CONCAT(x ORDER BY x DESC SEPARATOR '|') AS lista FROM (SELECT 1 AS x UNION SELECT 2) t`);
  assert.equal(r.mes, '2026-02-28'); // como o MySQL: não pula para março
  assert.equal(r.horas, '2026-03-01 08:00:00');
  assert.equal(r.dias, 30);
  assert.equal(r.ano, 1);
  assert.equal(r.letras, 4);
  assert.equal(r.lista, '2|1');
});

test('distância entre dois pontos (ST_Distance_Sphere) em metros', async () => {
  const pool = await bancoNovo();
  const [r] = await linhas(pool, 'SELECT ST_Distance_Sphere(POINT(-46.6333, -23.5505), POINT(?, ?)) AS m', [-47.0626, -22.9056]);
  assert.ok(r.m > 80000 && r.m < 90000, `São Paulo a Campinas: ${r.m} m`);
});

test('transação desfaz tudo quando dá erro', async () => {
  const pool = await bancoNovo();
  const c = await pool.getConnection();
  await c.beginTransaction();
  await c.query('INSERT INTO pessoas (email) VALUES (?)', ['a@x.com']);
  await c.rollback();
  c.release();
  assert.equal((await linhas(pool, 'SELECT COUNT(*) AS n FROM pessoas'))[0].n, 0);
});

test('com uma transação aberta, os outros pedidos esperam a vez (nada entra nela por engano)', async () => {
  const pool = await bancoNovo();
  const c = await pool.getConnection();
  await c.beginTransaction();
  await c.query('INSERT INTO pessoas (email) VALUES (?)', ['dentro@x.com']);
  const fora = pool.query('INSERT INTO pessoas (email) VALUES (?)', ['fora@x.com']);
  await new Promise((ok) => setTimeout(ok, 20));
  await c.rollback(); // desfaz só o que era da transação
  c.release();
  await fora;
  assert.deepEqual((await linhas(pool, 'SELECT email FROM pessoas')).map((x) => x.email), ['fora@x.com']);
});

test('textos com aspas, interrogação e INTERVAL dentro não são traduzidos', async () => {
  const pool = await bancoNovo();
  await linhas(pool, 'INSERT INTO pessoas (email) VALUES (?)', ["o'x?@x.com"]);
  const [r] = await linhas(pool, "SELECT 'NOW() + INTERVAL 1 DAY?' AS t, email FROM pessoas WHERE email = ?", ["o'x?@x.com"]);
  assert.equal(r.t, 'NOW() + INTERVAL 1 DAY?');
  assert.equal(r.email, "o'x?@x.com");
});
