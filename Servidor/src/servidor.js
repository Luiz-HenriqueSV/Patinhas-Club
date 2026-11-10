// Patinhas Club — servidor (Node.js + Express + banco SQL)
// O jeito fácil é o iniciar.bat (ou a tarefa "Iniciar Patinhas Club" do VS Code), que faz tudo.
// À mão:
//   npm install       instala as dependências
//   npm start         http://localhost:3000 (cria o banco sozinho na primeira vez)
//   npm run banco     recria o banco com os dados de demonstração
const path = require('node:path');
const express = require('express');
const session = require('express-session');
const { SessoesNoBanco } = require('./servicos/sessoes');
const config = require('./config');
const { pool, embutido } = require('./banco');
const { receber, descartar } = require('./servicos/arquivos');
const { ErroValidacao } = require('./util/validacao');
const { querJson, limitar } = require('./util/resposta');
const { paginaSimples } = require('./util/html');

const app = express();
app.disable('x-powered-by');
if (config.producao) app.set('trust proxy', 1); // atrás de HTTPS (Render, Railway...)

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(self), camera=(), microphone=()',
  });
  next();
});

// Arquivos do site (CSS, imagens, scripts). As páginas .html passam pela rota de páginas.
const estatico = express.static(config.pastas.web, { index: false, maxAge: config.producao ? '7d' : 0 });
app.use((req, res, next) => (req.path === '/' || req.path.endsWith('.html') ? next() : estatico(req, res, next)));
app.use('/uploads', express.static(config.pastas.uploads, { index: false, maxAge: '30d' }));

app.use(session({
  name: 'patinhas.sid',
  store: new SessoesNoBanco(),
  secret: config.segredoSessao,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: config.producao },
}));

app.use(express.urlencoded({ extended: false, limit: '200kb' }));
app.use(express.json({ limit: '200kb' }));
app.use('/api/denuncias', (req, res, next) => {
  req.uploadPrivado = true; // provas de denúncia não ficam públicas
  next();
});
app.use('/api', receber);

// Diagnóstico rápido: http://localhost:3000/api/saude mostra se o banco está respondendo
app.get('/api/saude', async (req, res) => {
  const banco = await pool.query('SELECT COUNT(*) AS n FROM usuarios').then(() => 'conectado', (e) => e.code || 'desligado');
  res.set('Cache-Control', 'no-store').status(banco === 'conectado' ? 200 : 503).json({ ok: banco === 'conectado', banco });
});

app.use('/api/localizacao', limitar({ maximo: 120, janelaMs: 60 * 1000 }), require('./rotas/localizacao'));
app.use(require('./rotas/contas'));
app.use(require('./rotas/ocorrencias'));
app.use(require('./rotas/adocao'));
app.use(require('./rotas/ong').rotas);
app.use(require('./rotas/conversas'));
app.use(require('./rotas/suporte').rotas);
app.use(require('./rotas/admin'));
app.use(require('./rotas/paginas'));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ ok: false, mensagem: 'Endereço da API não encontrado.' });
  return res.status(404).type('html').send(paginaSimples({
    titulo: 'Página não encontrada',
    mensagem: 'O endereço que você abriu não existe ou mudou de lugar.',
    corpo: '<p><a class="botao primario" href="/index.html">Ir ao início</a></p>',
  }));
});

const ERROS_DE_BANCO = new Set(['ER_NODE_ANTIGO', 'ER_BANCO_EMBUTIDO', 'ER_LOCK_WAIT_TIMEOUT', 'ECONNREFUSED', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ER_NO_SUCH_TABLE', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT', 'ENOTFOUND']);
const DUPLICADOS = {
  uq_usuarios_email: ['email', 'Já existe uma conta com este e-mail. Entre ou recupere a senha.'],
  uq_adotantes_cpf: ['cpf', 'Este CPF já tem uma conta.'],
  uq_ongs_documento: ['documento', 'Este documento já está cadastrado.'],
};

// eslint-disable-next-line no-unused-vars
app.use((erro, req, res, next) => {
  descartar(req);
  let e = erro;
  if (e.code === 'ER_DUP_ENTRY') {
    const chave = Object.keys(DUPLICADOS).find((k) => e.message.includes(k));
    if (chave) e = new ErroValidacao({ [DUPLICADOS[chave][0]]: DUPLICADOS[chave][1] }, DUPLICADOS[chave][1]);
  } else if (e.name === 'MulterError') {
    e = new ErroValidacao({ [e.field || 'foto']: e.code === 'LIMIT_FILE_SIZE' ? 'Arquivo grande demais (máximo de 20 MB).' : 'Não foi possível receber o arquivo.' });
  } else if (e.type === 'entity.too.large') {
    e = Object.assign(new Error('O formulário ficou grande demais.'), { status: 413 });
  } else if (ERROS_DE_BANCO.has(e.code)) {
    console.error(`[banco] ${e.code}: ${e.message}\n  ${embutido ? 'Feche o servidor e rode "iniciar.bat banco" para recriar o banco.' : 'Confira se o MySQL está ligado, os dados do .env e se você rodou "npm run banco".'}`);
    e = Object.assign(new Error('O banco de dados não está respondendo agora. Tente de novo em instantes.'), { status: 503 });
  }
  const status = e.status || 500;
  const interno = status >= 500 && status !== 502 && status !== 503;
  if (interno) console.error(erro);
  const mensagem = interno ? 'Algo deu errado do nosso lado. Tente de novo em instantes.' : e.message;
  if (querJson(req) || req.path.startsWith('/api/localizacao')) {
    return res.status(status).json({ ok: false, mensagem, erros: e.erros || {} });
  }
  return res.status(status).type('html').send(paginaSimples({
    titulo: status === 422 ? 'Faltou alguma coisa' : 'Não deu certo',
    mensagem,
    erros: e.erros,
    voltar: req.get('Referer') || '/index.html',
  }));
});

/** Na primeira vez que o servidor sobe, o banco ainda não existe: ele é criado sozinho. */
async function prepararBanco() {
  const { criarBanco, versaoDosScripts, caminhoLegivel } = require('./criar-banco');
  try {
    await pool.query('SELECT 1 FROM usuarios LIMIT 1');
  } catch (e) {
    if (e.code === 'ER_BAD_DB_ERROR' || e.code === 'ER_NO_SUCH_TABLE') {
      console.log('Criando o banco de dados com os dados de exemplo (só na primeira vez)...');
      await criarBanco({ silencioso: true });
      return;
    }
    if (embutido) {
      console.warn(`Atenção: o banco embutido não abriu.\n  ${e.message.split('\n')[0]}`);
    } else {
      console.warn(`Atenção: sem conexão com o MySQL (${e.code || e.message}).`);
      console.warn('  Ligue o MySQL (no XAMPP, botão Start do MySQL) e confira o arquivo Servidor/.env,');
      console.warn('  ou apague a linha BANCO=mysql do .env para usar o banco embutido, que não precisa instalar nada.');
    }
    return;
  }
  if (!embutido) { console.log('Banco de dados MySQL conectado.'); return; }
  const [versao] = await pool.query('SELECT versao FROM _versao_scripts').then(([l]) => l, () => []);
  console.log(`Banco de dados pronto (${caminhoLegivel()}).`);
  if (!versao || versao.versao !== versaoDosScripts()) {
    console.warn('Aviso: os arquivos da pasta "Banco de dados" mudaram depois que este banco foi criado.');
    console.warn('  Para atualizar, feche o servidor e rode "iniciar.bat banco" (volta aos dados de exemplo).');
  }
}

/** Abre o site no navegador padrão (iniciar.bat passa --abrir). */
function abrirNavegador(url) {
  const comando = { win32: `start "" "${url}"`, darwin: `open "${url}"` }[process.platform] || `xdg-open "${url}"`;
  require('node:child_process').exec(comando, () => {}); // se não abrir, o endereço já está no terminal
}

if (require.main === module) {
  const url = `http://localhost:${config.porta}`;
  const abrir = process.argv.includes('--abrir');
  prepararBanco()
    .catch((e) => console.error(`Não foi possível criar o banco: ${e.message}`))
    .finally(() => {
      const servidor = app.listen(config.porta);
      servidor.on('listening', () => {
        console.log(`\nPatinhas Club rodando em ${url}   (para parar: Ctrl+C)\n`);
        if (abrir) abrirNavegador(url);
      });
      servidor.on('error', (e) => {
        if (e.code !== 'EADDRINUSE') throw e;
        console.error(`\nA porta ${config.porta} já está em uso: o Patinhas Club já está aberto em outra janela?`);
        console.error('  Feche a outra janela ou troque PORTA no arquivo Servidor/.env.');
        if (abrir) abrirNavegador(url);
        process.exitCode = 1;
      });
    });
}

module.exports = app;
