// npm run banco — cria o banco do zero com os arquivos da pasta "Banco de dados".
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const config = require('./config');

async function criarBanco({ silencioso = false } = {}) {
  const { database, ...acesso } = config.banco;
  const conexao = await mysql.createConnection({ ...acesso, charset: 'utf8mb4', multipleStatements: true });
  try {
    for (const arquivo of ['01-esquema.sql', '02-dados-iniciais.sql']) {
      if (!silencioso) process.stdout.write(`Rodando ${arquivo}... `);
      await conexao.query(fs.readFileSync(path.join(config.pastas.banco, arquivo), 'utf8'));
      if (!silencioso) console.log('ok');
    }
  } finally {
    await conexao.end();
  }
  if (database !== 'patinhas') console.warn(`Aviso: os scripts criam o banco "patinhas", mas o .env usa "${database}".`);
  console.log(`${silencioso ? '' : '\nBanco pronto. '}Contas de teste (senha patinhas123):`);
  console.log('  adotante@patinhasclub.test  |  ong@patinhasclub.test  |  admin@patinhasclub.test');
}

module.exports = { criarBanco };

if (require.main === module) {
  criarBanco().catch((erro) => {
    console.error(`\nNão foi possível criar o banco: ${erro.message}`);
    console.error('Confira se o MySQL está ligado e os dados de acesso em Servidor/.env.');
    process.exit(1);
  });
}
