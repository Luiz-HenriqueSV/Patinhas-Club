// Patinhas Club — servidor (Node.js + Express + MySQL)
//   npm install       instala as dependências
//   npm run banco     cria o banco com os dados de demonstração
//   npm start         http://localhost:3000
const express = require('express');
const session = require('express-session');
const config = require('./config');
const { pool } = require('./banco');
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

app.use('/api/localizacao', limitar({ maximo: 120, janelaMs: 60 * 1000 }), require('./rotas/localizacao'));
app.use(require('./rotas/contas'));
app.use(require('./rotas/ocorrencias'));
app.use(require('./rotas/adocao'));
app.use(require('./rotas/ong').rotas);
app.use(require('./rotas/paginas'));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ ok: false, mensagem: 'Endereço da API não encontrado.' });
  return res.status(404).type('html').send(paginaSimples({
    titulo: 'Página não encontrada',
    mensagem: 'O endereço que você abriu não existe ou mudou de lugar.',
    corpo: '<p><a class="botao primario" href="/index.html">Ir ao início</a></p>',
  }));
});

const ERROS_DE_BANCO = new Set(['ECONNREFUSED', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ER_NO_SUCH_TABLE', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT', 'ENOTFOUND']);
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
    console.error(`[banco] ${e.code}: ${e.message}\n  Confira se o MySQL está ligado, os dados do .env e se você rodou "npm run banco".`);
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

if (require.main === module) {
  app.listen(config.porta, () => {
    console.log(`Patinhas Club rodando em http://localhost:${config.porta}`);
    pool.query('SELECT 1')
      .then(() => console.log('Banco de dados conectado.'))
      .catch((e) => console.warn(`Atenção: sem conexão com o banco (${e.code || e.message}). Ligue o MySQL e rode "npm run banco".`));
  });
}

module.exports = app;
