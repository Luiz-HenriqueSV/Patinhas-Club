// Contas: cadastro de adotante e de ONG, login, sessão e senha.
const express = require('express');
const config = require('../config');
const { consulta, transacao } = require('../banco');
const { leitor, ErroValidacao, ErroHttp } = require('../util/validacao');
const { gerarHashSenha, conferirSenha, gerarToken, hashToken } = require('../util/seguranca');
const { concluir, iniciarSessao, limitar } = require('../util/resposta');
const { criarEndereco, completarCoordenadas } = require('../servicos/enderecos');
const { arquivo, caminho } = require('../servicos/arquivos');
const { enviarEmail, linkAbsoluto } = require('../servicos/mensagens');
const { paginaSimples, esc, telefoneBr } = require('../util/html');

const rotas = express.Router();
const limiteLogin = limitar({ maximo: 10, janelaMs: 60 * 1000 });

async function registrarTermos(q, usuarioId, tipos, ip) {
  for (const tipo of tipos) {
    await q('INSERT INTO termos_aceite (usuario_id, tipo, versao, ip) VALUES (?, ?, ?, ?)', [usuarioId, tipo, config.versaoTermos, ip || null]);
  }
}

async function criarLinkDeSenha(q, usuarioId, horas) {
  const token = gerarToken();
  await q('INSERT INTO recuperacao_senha (usuario_id, token_hash, expira_em) VALUES (?, ?, NOW() + INTERVAL ? HOUR)', [usuarioId, hashToken(token), horas]);
  return `/redefinir-senha?token=${token}`;
}

/* ---------- Cadastro de adotante ---------- */

rotas.post('/api/adotantes', async (req, res) => {
  const l = leitor(req.body);
  const d = {
    nome: l.texto('nome', { obrigatorio: true, max: 120 }),
    nascimento: l.data('nascimento', { obrigatorio: true, futuro: false, idadeMinima: 18 }),
    cpf: l.cpf('cpf'),
    email: l.email('email', { obrigatorio: true }),
    telefone: l.telefone('telefone', { obrigatorio: true }),
    cidade: l.texto('cidade', { obrigatorio: true, max: 100 }),
    uf: l.uf('estado', { obrigatorio: true }),
    moradia: l.opcao('moradia', ['casa', 'casa-quintal', 'apartamento'], { obrigatorio: true }),
    temAnimais: l.opcoes('tem_animais', ['cao', 'gato', 'outros']),
    criancas: l.opcao('criancas', ['nao', 'sim']),
    procura: l.opcoes('procura', ['cao', 'gato', 'ainda-nao-sei']),
    alertas: l.marcado('alertas'),
    senha: l.senha('senha'),
  };
  if (!l.marcado('aceite_termos')) l.erro('aceite_termos', 'Para criar a conta, aceite os termos de uso.');
  l.validar();

  const senhaHash = await gerarHashSenha(d.senha);
  const usuario = await transacao(async (q) => {
    const u = await q('INSERT INTO usuarios (tipo, email, senha_hash) VALUES (?, ?, ?)', ['adotante', d.email, senhaHash]);
    // Do adotante guardamos só a cidade: a localização exata não é necessária para adotar.
    const endereco = await criarEndereco(q, { cidade: d.cidade, uf: d.uf });
    await q(
      `INSERT INTO adotantes (usuario_id, nome, cpf, telefone, data_nascimento, endereco_id, moradia,
                              tem_animais, tem_criancas, procura, recebe_alertas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.insertId, d.nome, d.cpf, d.telefone, d.nascimento, endereco.id, d.moradia,
        d.temAnimais.join(',') || null, d.criancas ? d.criancas === 'sim' : null, d.procura.join(',') || null, d.alertas],
    );
    await registrarTermos(q, u.insertId, ['termos_uso', 'privacidade'], req.ip);
    return { id: u.insertId, tipo: 'adotante', nome: d.nome };
  });
  await iniciarSessao(req, usuario);
  concluir(req, res, 'minha-conta.html#boas-vindas');
});

/* ---------- Cadastro de ONG / protetor / abrigo ---------- */

rotas.post('/api/ongs', async (req, res) => {
  const l = leitor(req.body);
  const tipo = l.opcao('tipo', ['ong', 'protetor', 'abrigo'], { obrigatorio: true });
  const d = {
    tipo,
    nome: l.texto('nome_organizacao', { obrigatorio: true, max: 150 }),
    documento: l.documento('documento', tipo === 'protetor' ? 'cpf' : 'cnpj'),
    ano: l.inteiro('ano_fundacao', { min: 1900, max: new Date().getFullYear() }),
    apresentacao: l.texto('apresentacao', { obrigatorio: true, max: 2000, multilinha: true }),
    responsavel: l.texto('responsavel', { obrigatorio: true, max: 120 }),
    cargo: l.texto('cargo', { max: 60 }),
    email: l.email('email', { obrigatorio: true }),
    telefone: l.telefone('telefone', { obrigatorio: true }),
    redeSocial: l.texto('rede_social', { max: 150 }),
    cep: l.cep('cep', { obrigatorio: true }),
    endereco: l.texto('endereco', { max: 150 }),
    bairro: l.texto('bairro', { obrigatorio: true, max: 80 }),
    cidade: l.texto('cidade', { obrigatorio: true, max: 100 }),
    uf: l.uf('estado', { obrigatorio: true }),
    quantidade: l.opcao('quantidade_animais', ['ate-10', '11-30', '31-100', 'mais-100']),
    ocultar: l.marcado('ocultar_endereco'),
    especies: l.opcoes('especies', ['cao', 'gato', 'outros']).map((e) => (e === 'outros' ? 'outro' : e)),
    servicos: l.opcoes('servicos', ['adocao', 'resgate', 'lar-temporario', 'castracao', 'veterinario']),
    novidades: l.marcado('novidades'),
    coordenadas: l.coordenadas(),
  };
  if (!l.marcado('aceite_termos')) l.erro('aceite_termos', 'Aceite os termos para enviar o cadastro.');
  if (!l.marcado('declaracao')) l.erro('declaracao', 'Confirme que as informações são verdadeiras.');
  l.validar();

  const logo = arquivo(req, 'logo');
  const documentos = [['identificacao', arquivo(req, 'doc_identificacao')], ['atuacao', arquivo(req, 'doc_atuacao')]].filter(([, a]) => a);

  const r = await transacao(async (q) => {
    const u = await q('INSERT INTO usuarios (tipo, email) VALUES (?, ?)', ['ong', d.email]);
    const id = u.insertId;
    const endereco = await criarEndereco(q, d);
    await q(
      `INSERT INTO ongs (usuario_id, tipo, nome, documento, ano_fundacao, apresentacao, logo_url, responsavel, cargo,
                         telefone, rede_social, endereco_id, ocultar_endereco, quantidade_animais, recebe_novidades)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, d.tipo, d.nome, d.documento, d.ano, d.apresentacao, logo ? caminho(logo) : null, d.responsavel, d.cargo,
        d.telefone, d.redeSocial, endereco.id, d.ocultar, d.quantidade, d.novidades],
    );
    if (d.especies.length) await q('INSERT INTO ong_especie (ong_id, especie_id) SELECT ?, id FROM especies WHERE codigo IN (?)', [id, d.especies]);
    if (d.servicos.length) await q('INSERT INTO ong_servico (ong_id, servico_id) SELECT ?, id FROM servicos WHERE codigo IN (?)', [id, d.servicos]);
    await q('INSERT INTO ong_areas_atendimento (ong_id, cidade_id) VALUES (?, ?)', [id, endereco.cidadeId]);
    for (const [tipoDoc, a] of documentos) {
      await q('INSERT INTO ong_documentos (ong_id, tipo, arquivo) VALUES (?, ?, ?)', [id, tipoDoc, caminho(a)]);
    }
    await registrarTermos(q, id, ['termos_uso', 'privacidade', 'declaracao_veracidade'], req.ip);
    // A senha é criada por um link que a ONG recebe quando o cadastro é aprovado.
    const link = await criarLinkDeSenha(q, id, 24 * 7);
    return { id, endereco, link };
  });
  if (r.endereco.semCoordenadas) completarCoordenadas(r.endereco.id, d);

  enviarEmail(d.email, 'Recebemos o cadastro no Patinhas Club',
    `Olá, ${d.responsavel}! Recebemos o cadastro de ${d.nome} e a equipe vai conferir os documentos em até 3 dias úteis.`);
  if (!config.producao) {
    console.info(`[cadastro de ONG] Para testar sem esperar a análise:\n  UPDATE ongs SET status_verificacao = 'verificada', verificada_em = NOW() WHERE usuario_id = ${r.id};\n  Criar senha: ${linkAbsoluto(req, r.link)}`);
  }
  concluir(req, res, 'cadastro-ong-enviado.html');
});

/* ---------- Login e sessão ---------- */

let hashFalso = null; // compara mesmo quando o e-mail não existe, para não dar pista pelo tempo de resposta

rotas.post('/api/entrar', limiteLogin, async (req, res) => {
  const l = leitor(req.body);
  const email = l.email('email', { obrigatorio: true });
  const senha = String((Array.isArray(req.body?.senha) ? req.body.senha[0] : req.body?.senha) ?? '');
  if (!senha) l.erro('senha', 'Digite a sua senha.');
  l.validar();

  const [u] = await consulta(
    `SELECT u.id, u.tipo, u.senha_hash, u.ativo, COALESCE(a.nome, o.nome) AS nome, o.status_verificacao
       FROM usuarios u
       LEFT JOIN adotantes a ON a.usuario_id = u.id
       LEFT JOIN ongs o ON o.usuario_id = u.id
      WHERE u.email = ?`,
    [email],
  );
  if (!hashFalso) hashFalso = await gerarHashSenha('senha-que-nao-existe');
  const confere = await conferirSenha(senha, (u && u.senha_hash) || hashFalso);

  if (u && u.tipo === 'ong' && (u.status_verificacao !== 'verificada' || !u.senha_hash)) {
    throw new ErroValidacao({ email: 'O cadastro da organização ainda está em análise. Quando for aprovado, você recebe por e-mail o link para criar a senha.' },
      'Cadastro em análise.');
  }
  if (!u || !u.ativo || !u.senha_hash || !confere) {
    throw new ErroValidacao({ senha: 'E-mail ou senha não conferem.' }, 'E-mail ou senha não conferem.');
  }
  await consulta('UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = ?', [u.id]);
  await iniciarSessao(req, u, l.marcado('lembrar'));
  concluir(req, res, u.tipo === 'ong' ? 'painel-ong.html' : 'minha-conta.html');
});

rotas.get('/sair', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('patinhas.sid');
    res.redirect(303, '/index.html');
  });
});

/** Quem está logado (o app.js usa para preencher nome, telefone e e-mail). */
rotas.get('/api/sessao', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const s = req.session.usuario;
  if (!s) return res.json({ usuario: null });
  const [u] = await consulta(
    `SELECT u.id, u.tipo, u.email, COALESCE(a.nome, o.responsavel) AS nome, COALESCE(a.telefone, o.telefone) AS telefone,
            c.nome AS cidade, e.sigla AS uf
       FROM usuarios u
       LEFT JOIN adotantes a ON a.usuario_id = u.id
       LEFT JOIN ongs o ON o.usuario_id = u.id
       LEFT JOIN enderecos en ON en.id = COALESCE(a.endereco_id, o.endereco_id)
       LEFT JOIN cidades c ON c.id = en.cidade_id
       LEFT JOIN estados e ON e.id = c.estado_id
      WHERE u.id = ?`,
    [s.id],
  );
  return res.json({ usuario: u ? { ...u, telefone: telefoneBr(u.telefone) } : null });
});

/* ---------- Senha: recuperar e criar ---------- */

rotas.post('/api/senha/recuperar', limiteLogin, async (req, res) => {
  const l = leitor(req.body);
  const email = l.email('email', { obrigatorio: true });
  l.validar();
  const [u] = await consulta('SELECT id FROM usuarios WHERE email = ? AND ativo = TRUE', [email]);
  if (u) {
    const link = await criarLinkDeSenha(consulta, u.id, 1);
    enviarEmail(email, 'Crie uma nova senha no Patinhas Club',
      `Para criar uma nova senha, abra o link abaixo (vale por 1 hora):\n${linkAbsoluto(req, link)}\nSe não foi você, ignore este e-mail.`);
  }
  // Mesma resposta exista ou não a conta: ninguém descobre quais e-mails estão cadastrados.
  concluir(req, res, 'entrar.html#link-enviado');
});

async function tokenValido(token) {
  if (!token) return null;
  const [linha] = await consulta(
    `SELECT r.id, r.usuario_id, u.tipo, u.email FROM recuperacao_senha r JOIN usuarios u ON u.id = r.usuario_id
      WHERE r.token_hash = ? AND r.usado_em IS NULL AND r.expira_em > NOW()`,
    [hashToken(token)],
  );
  return linha || null;
}

rotas.get('/redefinir-senha', async (req, res) => {
  const token = String(req.query.token || '');
  const pedido = await tokenValido(token);
  if (!pedido) {
    return res.status(410).type('html').send(paginaSimples({
      titulo: 'Este link não vale mais',
      mensagem: 'O link para criar a senha expirou ou já foi usado. Peça um novo na tela de entrar.',
      corpo: '<p><a class="botao primario" href="/entrar.html#recuperar">Pedir um novo link</a></p>',
    }));
  }
  return res.type('html').send(paginaSimples({
    titulo: 'Crie sua senha',
    mensagem: `Conta: ${pedido.email}`,
    corpo: `
      <form class="formulario" action="/api/senha/redefinir" method="post">
        <input type="hidden" name="token" value="${esc(token)}" />
        <div class="campos">
          <div class="campo campo-largo">
            <label for="senha">Nova senha</label>
            <input type="password" id="senha" name="senha" autocomplete="new-password" minlength="8" required />
            <small class="dica">Pelo menos 8 caracteres.</small>
          </div>
        </div>
        <div class="form-botoes"><button type="submit" class="botao primario grande">Salvar senha</button></div>
      </form>`,
  }));
});

rotas.post('/api/senha/redefinir', limiteLogin, async (req, res) => {
  const l = leitor(req.body);
  const senha = l.senha('senha');
  l.validar();
  const pedido = await tokenValido(String(req.body?.token || ''));
  if (!pedido) throw new ErroHttp(410, 'O link expirou ou já foi usado. Peça um novo na tela de entrar.');
  const senhaHash = await gerarHashSenha(senha);
  await transacao(async (q) => {
    await q('UPDATE usuarios SET senha_hash = ? WHERE id = ?', [senhaHash, pedido.usuario_id]);
    await q('UPDATE recuperacao_senha SET usado_em = NOW() WHERE id = ?', [pedido.id]);
  });
  const [u] = await consulta(
    `SELECT u.id, u.tipo, COALESCE(a.nome, o.nome) AS nome, o.status_verificacao FROM usuarios u
       LEFT JOIN adotantes a ON a.usuario_id = u.id LEFT JOIN ongs o ON o.usuario_id = u.id WHERE u.id = ?`,
    [pedido.usuario_id],
  );
  if (u.tipo === 'ong' && u.status_verificacao !== 'verificada') {
    return concluir(req, res, 'cadastro-ong-enviado.html');
  }
  await iniciarSessao(req, u);
  return concluir(req, res, u.tipo === 'ong' ? 'painel-ong.html' : 'minha-conta.html');
});

module.exports = rotas;
