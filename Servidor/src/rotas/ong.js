// Área da ONG (exige login de ONG): animais, campanhas e resposta aos pedidos.
const express = require('express');
const Geo = require('../../../Web/scripts/geo-nucleo.js');
const { consulta, transacao } = require('../banco');
const { leitor, idDaRota, hoje, interpretarMeta, ErroHttp, ErroValidacao } = require('../util/validacao');
const { concluir, exigir } = require('../util/resposta');
const { criarEndereco, completarCoordenadas } = require('../servicos/enderecos');
const { arquivo, arquivos, caminho } = require('../servicos/arquivos');
const { notificar, enviarEmail } = require('../servicos/mensagens');

const rotas = express.Router();
rotas.use('/api/ong', exigir('ong'));

const lista = (valores) => valores.join(',') || null;

/* ---------- Cadastrar animal (publicar ou salvar rascunho) ---------- */

rotas.post('/api/ong/animais', async (req, res) => {
  const rascunho = req.query.rascunho === '1';
  const publicar = !rascunho;
  const l = leitor(req.body);
  const d = {
    nome: l.texto('nome', { obrigatorio: true, max: 80 }),
    raca: l.texto('raca', { max: 60 }),
    cor: l.texto('cor', { max: 80 }),
    especie: l.opcao('especie', ['cao', 'gato', 'outro'], { obrigatorio: true }),
    sexo: l.opcao('sexo', ['macho', 'femea'], { obrigatorio: publicar }),
    idade: l.opcao('idade', ['filhote', 'adulto', 'idoso'], { obrigatorio: publicar }),
    porte: l.opcao('porte', ['pequeno', 'medio', 'grande'], { obrigatorio: publicar }),
    saude: l.opcoes('saude', ['vacinado', 'vermifugado', 'castrado', 'microchip', 'fiv-felv']),
    especiais: l.marcado('necessidades_especiais'),
    cuidados: l.texto('cuidados', { max: 2000, multilinha: true }),
    jeito: l.opcoes('jeito', ['brincalhao', 'calmo', 'carinhoso', 'timido', 'independente', 'agitado']),
    convive: l.opcoes('convive', ['criancas', 'caes', 'gatos']),
    historia: l.texto('historia', { obrigatorio: publicar, max: 3000, multilinha: true }),
    cidade: l.texto('cidade', { obrigatorio: publicar, max: 100 }),
    taxa: l.opcao('taxa', ['gratuita', 'voluntaria'], { padrao: 'gratuita' }),
    requisitos: l.opcoes('requisitos', ['telas', 'quintal', 'visita', 'termo']),
    observacoes: l.texto('observacoes', { max: 2000, multilinha: true }),
  };
  l.validar();

  const ongId = req.session.usuario.id;
  const [base] = await consulta(
    `SELECT c.nome AS cidade, e.sigla AS uf FROM ongs o JOIN enderecos en ON en.id = o.endereco_id
       JOIN cidades c ON c.id = en.cidade_id JOIN estados e ON e.id = c.estado_id WHERE o.usuario_id = ?`,
    [ongId],
  );
  const fotos = arquivos(req, 'fotos');

  const r = await transacao(async (q) => {
    // Animal em outra cidade (lar temporário, por exemplo) ganha endereço próprio
    const outraCidade = d.cidade && Geo.comparavel(d.cidade) !== Geo.comparavel(base.cidade);
    const endereco = outraCidade ? await criarEndereco(q, { cidade: d.cidade, uf: base.uf }) : null;
    let racaId = null;
    if (d.raca) {
      await q('INSERT IGNORE INTO racas (especie_id, nome) VALUES ((SELECT id FROM especies WHERE codigo = ?), ?)', [d.especie, d.raca]);
      const [raca] = await q('SELECT r.id FROM racas r JOIN especies e ON e.id = r.especie_id WHERE e.codigo = ? AND r.nome = ?', [d.especie, d.raca]);
      racaId = raca ? raca.id : null;
    }
    const a = await q(
      `INSERT INTO animais (ong_id, especie_id, raca_id, endereco_id, nome, sexo, porte, faixa_etaria, cor, historia, saude,
                            jeito, convive, necessidades_especiais, cuidados, taxa, requisitos, observacoes, status)
       VALUES (?, (SELECT id FROM especies WHERE codigo = ?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ongId, d.especie, racaId, endereco ? endereco.id : null, d.nome, d.sexo, d.porte, d.idade, d.cor, d.historia,
        lista(d.saude), lista(d.jeito), lista(d.convive), d.especiais, d.cuidados, d.taxa, lista(d.requisitos),
        d.observacoes, rascunho ? 'rascunho' : 'disponivel'],
    );
    for (const [i, f] of fotos.entries()) {
      await q('INSERT INTO animal_fotos (animal_id, url, principal, ordem) VALUES (?, ?, ?, ?)', [a.insertId, caminho(f), i === 0, i]);
    }
    return { id: a.insertId, endereco };
  });
  if (r.endereco) completarCoordenadas(r.endereco.id, { cidade: d.cidade, uf: base.uf });
  concluir(req, res, rascunho ? 'painel-ong.html#rascunho-salvo' : 'painel-ong.html#animal-publicado', { id: r.id });
});

/* ---------- Publicar um rascunho ---------- */

rotas.post('/api/ong/animais/:id/publicar', async (req, res) => {
  const id = idDaRota(req.params.id);
  try {
    const r = await consulta(
      "UPDATE animais SET status = 'disponivel' WHERE id = ? AND ong_id = ? AND status = 'rascunho'",
      [id, req.session.usuario.id],
    );
    if (!r.affectedRows) throw new ErroHttp(404, 'Rascunho não encontrado.');
  } catch (erro) {
    // A regra ck_animais_publicavel do banco barra a publicação sem os dados do cartão
    if (erro.errno === 3819 || erro.errno === 4025) {
      throw new ErroValidacao({}, 'Complete sexo, porte, idade e a história antes de publicar.');
    }
    throw erro;
  }
  concluir(req, res, 'painel-ong.html#animal-publicado');
});

/* ---------- Nova campanha ---------- */

rotas.post('/api/ong/campanhas', async (req, res) => {
  const l = leitor(req.body);
  const d = {
    tipo: l.opcao('tipo', ['arrecadacao', 'vaquinha', 'evento', 'voluntariado', 'saude'], { obrigatorio: true }),
    titulo: l.texto('titulo', { obrigatorio: true, max: 150 }),
    descricao: l.texto('descricao', { obrigatorio: true, max: 2000, multilinha: true }),
    meta: l.texto('meta', { max: 100 }),
    inicio: l.data('inicio') || hoje(),
    fim: l.data('fim', { obrigatorio: true }),
    local: l.texto('local', { max: 150 }),
    comoAjudar: l.texto('como_ajudar', { obrigatorio: true, max: 2000, multilinha: true }),
    contato: l.texto('contato', { max: 150 }),
  };
  if (d.fim && d.fim < d.inicio) l.erro('fim', 'A data final precisa ser igual ou depois do início.');
  if (d.fim && d.fim < hoje()) l.erro('fim', 'A data final já passou.');
  l.validar();

  const meta = interpretarMeta(d.meta);
  const capa = arquivo(req, 'capa');
  await consulta(
    `INSERT INTO campanhas (ong_id, tipo, titulo, descricao, capa_url, meta_texto, meta_valor, meta_unidade,
                            data_inicio, data_fim, local_texto, como_ajudar, contato)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.session.usuario.id, d.tipo, d.titulo, d.descricao, capa ? caminho(capa) : null, d.meta, meta.valor, meta.unidade,
      d.inicio, d.fim, d.local, d.comoAjudar, d.contato],
  );
  concluir(req, res, 'painel-ong.html#campanha-criada');
});

/* ---------- Responder a um pedido de adoção ---------- */

const MENSAGEM_STATUS = {
  em_analise: 'A ONG está analisando o seu pedido.',
  visita_agendada: 'A ONG quer conhecer você! Combine a visita pelo WhatsApp.',
  aprovado: 'Adoção aprovada! Combine com a ONG o dia de buscar o seu novo amigo.',
  recusado: 'A ONG não pôde seguir com o seu pedido desta vez.',
};

rotas.post('/api/ong/pedidos/:id/status', async (req, res) => {
  const id = idDaRota(req.params.id);
  const l = leitor(req.body);
  const status = l.opcao('status', Object.keys(MENSAGEM_STATUS), { obrigatorio: true });
  l.validar();

  // Confere o dono antes: o UPDATE não pode citar "animais" porque o gatilho do banco
  // atualiza essa tabela (o MySQL não deixa a mesma instrução fazer as duas coisas).
  const [pedido] = await consulta(
    `SELECT p.id, p.adotante_id, p.email, a.nome AS animal FROM pedidos_adocao p JOIN animais a ON a.id = p.animal_id
      WHERE p.id = ? AND a.ong_id = ?`,
    [id, req.session.usuario.id],
  );
  if (!pedido) throw new ErroHttp(404, 'Pedido não encontrado.');
  await consulta('UPDATE pedidos_adocao SET status_atual = ? WHERE id = ?', [status, id]);

  const titulo = `Pedido para ${pedido.animal}: novidade`;
  notificar(pedido.adotante_id, 'pedido_adocao', titulo, MENSAGEM_STATUS[status], 'minha-conta.html#pedidos');
  enviarEmail(pedido.email, titulo, MENSAGEM_STATUS[status]);
  const destino = { visita_agendada: '#visita-agendada', recusado: '#pedido-recusado' }[status] || '#pedidos';
  concluir(req, res, `painel-ong.html${destino}`);
});

module.exports = { rotas };
