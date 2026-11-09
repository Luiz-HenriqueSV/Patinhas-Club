// Animais perdidos (anúncio, "encontrei este animal", marcar como encontrado) e denúncias.
const express = require('express');
const { consulta, transacao } = require('../banco');
const { leitor, idDaRota, ErroHttp } = require('../util/validacao');
const { concluir } = require('../util/resposta');
const { criarEndereco, completarCoordenadas } = require('../servicos/enderecos');
const { arquivo, arquivos, caminho } = require('../servicos/arquivos');
const { enviarEmail, notificar } = require('../servicos/mensagens');
const { dataBr, horaCurta } = require('../util/html');

const rotas = express.Router();
const ESPECIES = ['cao', 'gato', 'outro'];
const PORTES = ['pequeno', 'medio', 'grande'];
const IDADES = ['filhote', 'adulto', 'idoso'];

/** Campos de endereço que se repetem nos formulários (o localizador preenche sozinho). */
function lerLocal(l, { dataCampo, horaCampo }) {
  return {
    endereco: l.texto('endereco', { obrigatorio: true, max: 150 }),
    bairro: l.texto('bairro', { obrigatorio: true, max: 80 }),
    cidade: l.texto('cidade', { obrigatorio: true, max: 100 }),
    uf: l.uf('estado', { obrigatorio: true }),
    cep: l.cep('cep'),
    data: l.data(dataCampo, { obrigatorio: true, futuro: false }),
    hora: l.hora(horaCampo),
    coordenadas: l.coordenadas(),
  };
}

/* ---------- Anúncio de animal perdido ---------- */

rotas.post('/api/anuncios', async (req, res) => {
  const l = leitor(req.body);
  const d = {
    nome: l.texto('nome_animal', { obrigatorio: true, max: 80 }),
    especie: l.opcao('especie', ESPECIES, { obrigatorio: true }),
    raca: l.texto('raca', { max: 60 }),
    porte: l.opcao('porte', PORTES, { obrigatorio: true }),
    idade: l.opcao('idade', IDADES, { obrigatorio: true }),
    sexo: l.opcao('sexo', ['desconhecido', 'macho', 'femea'], { padrao: 'desconhecido' }),
    cor: l.texto('cor', { obrigatorio: true, max: 80 }),
    caracteristicas: l.texto('caracteristicas', { max: 1000, multilinha: true }),
    identificacao: l.marcado('tem_identificacao'),
    circunstancias: l.texto('circunstancias', { max: 1000, multilinha: true }),
    contatoNome: l.texto('nome_tutor', { obrigatorio: true, max: 120 }),
    telefone: l.telefone('telefone', { obrigatorio: true }),
    email: l.email('email'),
    ...lerLocal(l, { dataCampo: 'data_desaparecimento', horaCampo: 'hora_desaparecimento' }),
  };
  if (!l.marcado('autoriza_contato')) l.erro('autoriza_contato', 'Precisamos mostrar o seu telefone para quem encontrar o animal.');
  const foto = arquivo(req, 'foto');
  if (!foto) l.erro('foto', 'Envie uma foto do animal.');
  l.validar();

  const usuarioId = req.session.usuario ? req.session.usuario.id : null;
  const r = await transacao(async (q) => {
    const endereco = await criarEndereco(q, d);
    const a = await q(
      `INSERT INTO anuncios_perdidos_achados (usuario_id, tipo, especie_id, endereco_id, nome_animal, raca, porte, faixa_etaria,
              sexo, cor, caracteristicas, tem_identificacao, data_ocorrencia, hora_ocorrencia, circunstancias,
              contato_nome, contato_telefone, contato_email)
       VALUES (?, 'perdido', (SELECT id FROM especies WHERE codigo = ?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [usuarioId, d.especie, endereco.id, d.nome, d.raca, d.porte, d.idade, d.sexo, d.cor, d.caracteristicas,
        d.identificacao, d.data, d.hora, d.circunstancias, d.contatoNome, d.telefone, d.email],
    );
    await q('INSERT INTO anuncio_fotos (anuncio_id, url) VALUES (?, ?)', [a.insertId, caminho(foto)]);
    return { id: a.insertId, endereco };
  });
  if (r.endereco.semCoordenadas) completarCoordenadas(r.endereco.id, d);
  concluir(req, res, 'animais-perdidos.html#anuncio-publicado', { id: r.id });
});

/* ---------- "Encontrei este animal" ---------- */

rotas.post('/api/anuncios/:id/avisos', async (req, res) => {
  const anuncioId = idDaRota(req.params.id);
  const l = leitor(req.body);
  const d = {
    onde: l.texto('onde', { obrigatorio: true, max: 200 }),
    quando: l.dataHora('quando', { obrigatorio: true, futuro: false }),
    estado: l.opcao('estado', ['bem', 'assustado', 'ferido', 'desnutrido'], { obrigatorio: true }),
    observacoes: l.texto('observacoes', { max: 1000, multilinha: true }),
    contato: l.texto('contato', { obrigatorio: true, max: 150 }),
    coordenadas: l.coordenadas(),
  };
  l.validar();

  const [anuncio] = await consulta(
    "SELECT id, usuario_id, nome_animal, contato_email FROM anuncios_perdidos_achados WHERE id = ? AND status = 'aberto'",
    [anuncioId],
  );
  if (!anuncio) throw new ErroHttp(404, 'Este anúncio não está mais aberto. Que bom: talvez o animal já tenha voltado para casa!');
  const foto = arquivo(req, 'foto');
  const c = d.coordenadas;
  await consulta(
    `INSERT INTO avisos_encontrei (anuncio_id, usuario_id, local_descricao, latitude, longitude, precisao_m, visto_em,
                                   estado_animal, observacoes, foto_url, contato)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [anuncioId, req.session.usuario ? req.session.usuario.id : null, d.onde, c ? c.latitude : null, c ? c.longitude : null,
      c ? c.precisao_m : null, d.quando, d.estado, d.observacoes, foto ? caminho(foto) : null, d.contato],
  );

  const nome = anuncio.nome_animal || 'o seu animal';
  const mapa = c ? `\nNo mapa: https://www.openstreetmap.org/?mlat=${c.latitude}&mlon=${c.longitude}#map=19/${c.latitude}/${c.longitude}` : '';
  const texto = `Alguém viu ${nome} em ${d.onde}, em ${dataBr(d.quando)} às ${horaCurta(d.quando.slice(11))}.${mapa}\nContato de quem viu: ${d.contato}${d.observacoes ? `\nDetalhes: ${d.observacoes}` : ''}`;
  enviarEmail(anuncio.contato_email, `Alguém viu ${nome}!`, texto);
  notificar(anuncio.usuario_id, 'anuncio', `Alguém viu ${nome}`, texto, 'minha-conta.html#anuncios');
  concluir(req, res, 'animais-perdidos.html#aviso-enviado');
});

/* ---------- O tutor marca que o animal voltou ---------- */

rotas.post('/api/anuncios/:id/resolver', async (req, res) => {
  const anuncioId = idDaRota(req.params.id);
  const u = req.session.usuario;
  if (!u) throw new ErroHttp(401, 'Entre na sua conta para atualizar o anúncio.');
  const l = leitor(req.body);
  const desfecho = l.texto('desfecho', { max: 255 });
  l.validar();
  const r = await consulta(
    "UPDATE anuncios_perdidos_achados SET status = 'resolvido', resolvido_em = NOW(), desfecho = COALESCE(?, desfecho) WHERE id = ? AND usuario_id = ? AND status = 'aberto'",
    [desfecho, anuncioId, u.id],
  );
  if (!r.affectedRows) throw new ErroHttp(404, 'Anúncio não encontrado.');
  concluir(req, res, 'minha-conta.html#anuncios');
});

/* ---------- Denúncia (pode ser anônima; fotos e vídeos vão para a pasta privada) ---------- */

rotas.post('/api/denuncias', async (req, res) => {
  const l = leitor(req.body);
  const d = {
    tipo: l.opcao('tipo_ocorrencia', ['abandono', 'maus-tratos', 'risco', 'adocao-irregular', 'outro'], { obrigatorio: true }),
    quantidade: l.inteiro('quantidade_animais', { obrigatorio: true, min: 1, max: 500 }),
    aindaNoLocal: l.opcao('ainda_no_local', ['sim', 'nao', 'nao-sei']),
    situacao: l.texto('situacao_animal', { obrigatorio: true, max: 3000, multilinha: true }),
    especie: l.opcao('especie', ESPECIES),
    porte: l.opcao('porte', PORTES),
    caracteristicas: l.texto('caracteristicas', { max: 255 }),
    identificacao: l.marcado('tem_identificacao'),
    nome: l.texto('nome', { max: 120 }),
    telefone: l.telefone('telefone'),
    email: l.email('email'),
    receber: l.marcado('receber_andamento'),
    ...lerLocal(l, { dataCampo: 'data_denuncia', horaCampo: 'hora_denuncia' }),
  };
  if (d.receber && !d.telefone && !d.email) l.erro('email', 'Para receber o andamento, deixe um telefone ou e-mail.');
  l.validar();

  const midias = arquivos(req, 'fotos');
  const r = await transacao(async (q) => {
    const endereco = await criarEndereco(q, d);
    const den = await q(
      `INSERT INTO denuncias (usuario_id, endereco_id, tipo_ocorrencia, quantidade_animais, ainda_no_local, situacao_animal,
              especie_id, porte, caracteristicas, tem_identificacao, data_ocorrencia, hora_ocorrencia,
              denunciante_nome, denunciante_telefone, denunciante_email, receber_andamento)
       VALUES (?, ?, ?, ?, ?, ?, (SELECT id FROM especies WHERE codigo = ?), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.session.usuario ? req.session.usuario.id : null, endereco.id, d.tipo, d.quantidade, d.aindaNoLocal, d.situacao,
        d.especie, d.porte, d.caracteristicas, d.identificacao, d.data, d.hora, d.nome, d.telefone, d.email, d.receber],
    );
    for (const m of midias) {
      await q('INSERT INTO denuncia_midias (denuncia_id, arquivo, tipo) VALUES (?, ?, ?)',
        [den.insertId, caminho(m), m.mimetype.startsWith('video/') ? 'video' : 'foto']);
    }
    return { id: den.insertId, endereco };
  });
  if (r.endereco.semCoordenadas) completarCoordenadas(r.endereco.id, d);
  concluir(req, res, 'denuncia.html#denuncia-enviada', { protocolo: r.id });
});

module.exports = rotas;
