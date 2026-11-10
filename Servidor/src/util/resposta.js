// Respostas comuns às rotas: sucesso, login obrigatório e sessão.

/** O app.js pede JSON; o formulário sem JavaScript pede HTML. */
const querJson = (req) => req.accepts(['html', 'json']) === 'json';

/** Sucesso: JSON para o app.js ou redirecionamento 303 (Post/Redirect/Get) para a página de aviso. */
function concluir(req, res, destino, extras = {}) {
  const url = destino.startsWith('/') ? destino : `/${destino}`;
  if (querJson(req)) return res.status(200).json({ ok: true, redirecionar: url, ...extras });
  return res.redirect(303, url);
}

/** Página inicial de cada tipo de conta. */
const INICIO = { adotante: 'minha-conta.html', ong: 'painel-ong.html', admin: 'admin.html' };
const inicioDe = (usuario) => INICIO[usuario && usuario.tipo] || 'entrar.html';

/** Bloqueia a rota para quem não entrou com um dos tipos de conta aceitos. */
function exigir(...tipos) {
  return (req, res, next) => {
    const u = req.session.usuario;
    if (u && tipos.includes(u.tipo)) return next();
    // Já entrou, mas com outro tipo de conta: não é falta de login, é falta de permissão
    if (u) {
      const casa = `/${inicioDe(u)}`;
      if (querJson(req)) return res.status(403).json({ ok: false, mensagem: 'Esta ação não está disponível para o seu tipo de conta.', redirecionar: casa });
      return res.redirect(303, casa);
    }
    const entrar = tipos[0] === 'ong' ? '/entrar.html#ong' : '/entrar.html';
    if (querJson(req)) return res.status(401).json({ ok: false, mensagem: 'Entre na sua conta para continuar.', redirecionar: entrar });
    return res.redirect(303, entrar);
  };
}

/** Nova sessão a cada login (evita fixação de sessão). "lembrar" mantém por 30 dias. */
function iniciarSessao(req, usuario, lembrar = false) {
  return new Promise((ok, falha) => {
    req.session.regenerate((erro) => {
      if (erro) return falha(erro);
      req.session.usuario = { id: usuario.id, tipo: usuario.tipo, nome: usuario.nome };
      if (lembrar) req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
      return req.session.save((e) => (e ? falha(e) : ok()));
    });
  });
}

/** Limite simples de pedidos por IP (protege login e a API de localização de abuso). */
function limitar({ maximo, janelaMs }) {
  const contagem = new Map();
  setInterval(() => contagem.clear(), janelaMs).unref();
  return (req, res, next) => {
    const chave = req.ip;
    const n = (contagem.get(chave) || 0) + 1;
    contagem.set(chave, n);
    if (n <= maximo) return next();
    res.set('Retry-After', String(Math.ceil(janelaMs / 1000)));
    return res.status(429).json({ ok: false, mensagem: 'Muitas tentativas seguidas. Espere um pouco e tente de novo.' });
  };
}

module.exports = { querJson, concluir, exigir, inicioDe, iniciarSessao, limitar };
