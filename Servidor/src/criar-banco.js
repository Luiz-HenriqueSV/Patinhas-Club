// npm run banco (ou iniciar.bat banco) — cria o banco do zero com os arquivos da pasta
// "Banco de dados". Apaga o que existir e põe de volta os dados de demonstração.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const config = require('./config');

const SCRIPTS = ['01-esquema.sql', '02-dados-iniciais.sql'];
const embutido = config.banco.tipo !== 'mysql';

/** Caminho do arquivo do banco para mostrar no terminal: "Servidor/dados/patinhas.db". */
function caminhoLegivel(arquivo = config.banco.arquivo) {
  const relativo = path.relative(path.join(__dirname, '..', '..'), arquivo);
  return relativo.startsWith('..') ? arquivo : relativo;
}

/** Impressão digital dos scripts: muda quando alguém altera o esquema ou os dados iniciais. */
function versaoDosScripts() {
  const h = crypto.createHash('sha1');
  for (const arquivo of SCRIPTS) h.update(fs.readFileSync(path.join(config.pastas.banco, arquivo)));
  return h.digest('hex').slice(0, 12);
}

async function abrirConexao() {
  if (embutido) return require('./banco-embutido').createConnection({ arquivo: config.banco.arquivo });
  const { database, ...acesso } = config.banco.mysql;
  return require('mysql2/promise').createConnection({ ...acesso, charset: 'utf8mb4', multipleStatements: true });
}

async function criarBanco({ silencioso = false } = {}) {
  const conexao = await abrirConexao();
  try {
    for (const arquivo of SCRIPTS) {
      if (!silencioso) process.stdout.write(`Rodando ${arquivo}... `);
      await conexao.query(fs.readFileSync(path.join(config.pastas.banco, arquivo), 'utf8'));
      if (!silencioso) console.log('ok');
    }
    if (embutido) {
      await conexao.query('CREATE TABLE _versao_scripts (versao VARCHAR(20) NOT NULL)');
      await conexao.query('INSERT INTO _versao_scripts (versao) VALUES (?)', [versaoDosScripts()]);
    }
  } finally {
    await conexao.end();
  }
  if (!embutido && config.banco.mysql.database !== 'patinhas') {
    console.warn(`Aviso: os scripts criam o banco "patinhas", mas o .env usa "${config.banco.mysql.database}".`);
  }
  console.log(`${silencioso ? '' : '\n'}Banco pronto${embutido ? ` em ${caminhoLegivel()}` : ''}.`);
  console.log('Contas de teste (senha patinhas123):');
  console.log('  adotante@patinhasclub.test  |  ong@patinhasclub.test  |  admin@patinhasclub.test');
}

module.exports = { criarBanco, versaoDosScripts, caminhoLegivel };

if (require.main === module) {
  criarBanco().catch((erro) => {
    console.error(`\nNão foi possível criar o banco: ${erro.message}`);
    if (!embutido) console.error('Confira se o MySQL está ligado e os dados de acesso em Servidor/.env.');
    process.exit(1);
  });
}
