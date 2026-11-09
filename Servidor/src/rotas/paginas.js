// Entrega as páginas da pasta Web trocando os exemplos do protótipo pelos dados do banco.
// As páginas marcam os trechos com <!-- dados:nome --> ... <!-- /dados:nome -->.
const fs = require('node:fs/promises');
const path = require('node:path');
const express = require('express');
const config = require('../config');
const { consulta } = require('../banco');
const m = require('../modelos');
const { trocarBloco, esc, iniciais, diaDaSemana, diaMes, horaCurta } = require('../util/html');

const rotas = express.Router();
const cache = new Map();

async function lerPagina(nome) {
  if (config.producao && cache.has(nome)) return cache.get(nome);
  const html = await fs.readFile(path.join(config.pastas.web, nome), 'utf8');
  cache.set(nome, html);
  return html;
}

/** ?lat=-23.68&lon=-46.62 vem do botão "Perto de mim". */
function posicao(query) {
  const lat = Number(query.lat);
  const lon = Number(query.lon);
  if (!query.lat || !query.lon || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

/** Distância em metros calculada pelo próprio banco (ST_Distance_Sphere usa longitude, latitude). */
const distancia = (p, tabela) => (p
  ? { sql: `ST_Distance_Sphere(POINT(${tabela}.longitude, ${tabela}.latitude), POINT(?, ?))`, params: [p.lon, p.lat] }
  : { sql: 'NULL', params: [] });

const ou = (itens, modelo, vazio) => (itens.length ? itens.map(modelo).join('\n') : vazio);

const PAGINAS = {
  async 'adocao.html'(html, req) {
    const p = posicao(req.query);
    const d = distancia(p, 'v');
    const ongId = Number(req.query.ong) || null;
    const animais = await consulta(
      `SELECT v.*, ${d.sql} AS distancia_m
         FROM vw_animais_vitrine v
        WHERE v.status IN ('disponivel','em_processo') AND v.ong_status = 'verificada' ${ongId ? 'AND v.ong_id = ?' : ''}
        ORDER BY ${p ? 'distancia_m IS NULL, distancia_m,' : ''} v.status = 'em_processo', v.criado_em DESC
        LIMIT 60`,
      [...d.params, ...(ongId ? [ongId] : [])],
    );
    let saida = trocarBloco(html, 'animais', ou(animais, (a, i) => m.cartaoAnimal(a, i + 1), m.vazio(
      'Nenhum animal disponível por aqui agora. Entre na lista de espera e avisamos quando chegar um com o seu perfil.',
      '<a class="botao secundario pequeno" href="lista_de_espera.html">Entrar na lista</a>',
    )));
    if (p && ['1', '3'].includes(req.query.distancia)) {
      saida = saida.replace(/(id="f-distancia-todas")\s+checked/, '$1').replace(`id="f-distancia-${req.query.distancia}"`, `id="f-distancia-${req.query.distancia}" checked`);
    }
    return saida;
  },

  async 'animais-perdidos.html'(html, req) {
    const p = posicao(req.query);
    const d = distancia(p, 'v');
    const anuncios = await consulta(
      `SELECT v.*, ${d.sql} AS distancia_m
         FROM vw_anuncios_mural v
        WHERE v.status = 'aberto' OR v.resolvido_em >= NOW() - INTERVAL 30 DAY
        ORDER BY v.status = 'resolvido', ${p ? 'distancia_m IS NULL, distancia_m,' : ''} v.criado_em DESC
        LIMIT 60`,
      d.params,
    );
    return trocarBloco(html, 'anuncios', ou(anuncios, (a, i) => m.cartaoPerdido(a, i + 1),
      m.vazio('Nenhum animal perdido no mural agora. Que continue assim!', '', 'pin')));
  },

  async 'ongs.html'(html) {
    const ongs = await consulta(
      `SELECT o.usuario_id AS id, o.tipo, o.nome, o.apresentacao, o.ano_fundacao, o.ocultar_endereco,
              c.nome AS cidade, e.sigla AS uf,
              (SELECT COUNT(*) FROM animais a WHERE a.ong_id = o.usuario_id AND a.status = 'disponivel') AS para_adocao,
              (SELECT COUNT(*) FROM campanhas ca WHERE ca.ong_id = o.usuario_id AND ca.status = 'aberta' AND ca.data_fim >= CURDATE()) AS campanhas_ativas,
              (SELECT ca.id FROM campanhas ca WHERE ca.ong_id = o.usuario_id AND ca.status = 'aberta' AND ca.data_fim >= CURDATE()
                ORDER BY ca.data_fim LIMIT 1) AS campanha_id,
              (SELECT GROUP_CONCAT(es.codigo ORDER BY es.id) FROM ong_especie oe JOIN especies es ON es.id = oe.especie_id
                WHERE oe.ong_id = o.usuario_id) AS especies,
              (SELECT GROUP_CONCAT(s.codigo ORDER BY s.id) FROM ong_servico os JOIN servicos s ON s.id = os.servico_id
                WHERE os.ong_id = o.usuario_id) AS servicos
         FROM ongs o
         JOIN enderecos en ON en.id = o.endereco_id
         JOIN cidades c ON c.id = en.cidade_id
         JOIN estados e ON e.id = c.estado_id
        WHERE o.status_verificacao = 'verificada'
        ORDER BY o.nome`,
    );
    return trocarBloco(html, 'ongs', ou(ongs, m.cartaoOng, '<li>Nenhuma organização verificada ainda.</li>'));
  },

  async 'campanhas.html'(html) {
    const campanhas = await consulta(
      `SELECT ca.*, o.nome AS ong_nome
         FROM campanhas ca JOIN ongs o ON o.usuario_id = ca.ong_id
        WHERE ca.status = 'aberta' AND ca.data_fim >= CURDATE() AND o.status_verificacao = 'verificada'
        ORDER BY ca.data_fim
        LIMIT 60`,
    );
    return trocarBloco(html, 'campanhas', ou(campanhas, m.cartaoCampanha, '<li>Nenhuma campanha aberta agora.</li>'));
  },

  async 'minha-conta.html'(html, req, res) {
    const u = req.session.usuario;
    const [perfil] = await consulta(
      `SELECT a.nome, c.nome AS cidade, e.sigla AS uf FROM adotantes a
         LEFT JOIN enderecos en ON en.id = a.endereco_id
         LEFT JOIN cidades c ON c.id = en.cidade_id
         LEFT JOIN estados e ON e.id = c.estado_id
        WHERE a.usuario_id = ?`,
      [u.id],
    );
    if (!perfil) {
      req.session.destroy(() => {});
      res.redirect(303, '/entrar.html');
      return null;
    }
    const [pedidos, favoritos, alertas, anuncios] = await Promise.all([
      consulta(
        `SELECT p.id, p.status_atual, p.criado_em, v.nome AS animal, v.sexo, v.especie, v.foto_url, v.foto_enquadramento, v.ong_nome,
                (SELECT vi.data_hora FROM visitas vi WHERE vi.pedido_id = p.id AND vi.status = 'agendada'
                  ORDER BY vi.data_hora LIMIT 1) AS visita
           FROM pedidos_adocao p JOIN vw_animais_vitrine v ON v.id = p.animal_id
          WHERE p.adotante_id = ?
          ORDER BY p.status_atual IN ('recusado','cancelado'), p.criado_em DESC`,
        [u.id],
      ),
      consulta(
        `SELECT v.* FROM favoritos f JOIN vw_animais_vitrine v ON v.id = f.animal_id
          WHERE f.adotante_id = ? AND v.status <> 'rascunho' ORDER BY f.criado_em DESC`,
        [u.id],
      ),
      consulta(
        `SELECT al.id, al.portes, al.idades, al.ativo, al.criado_em, es.codigo AS especie, c.nome AS cidade
           FROM alertas_lista_espera al JOIN especies es ON es.id = al.especie_id LEFT JOIN cidades c ON c.id = al.cidade_id
          WHERE al.adotante_id = ? ORDER BY al.criado_em DESC`,
        [u.id],
      ),
      consulta(
        `SELECT an.id, an.nome_animal, an.status, an.criado_em,
                (SELECT COUNT(*) FROM avisos_encontrei av WHERE av.anuncio_id = an.id) AS avisos
           FROM anuncios_perdidos_achados an WHERE an.usuario_id = ? ORDER BY an.criado_em DESC`,
        [u.id],
      ),
    ]);

    const abertos = pedidos.filter((p) => ['enviado', 'em_analise', 'visita_agendada'].includes(p.status_atual)).length;
    const visita = pedidos.find((p) => p.status_atual === 'visita_agendada' && p.visita);
    const frase = visita
      ? `A visita para conhecer ${m.genero(visita.sexo, 'o', 'a')} ${visita.animal} está marcada para ${diaDaSemana(visita.visita).toLowerCase()}, ${diaMes(visita.visita)}, às ${horaCurta(visita.visita.slice(11))}.`
      : abertos ? `Você tem ${abertos} ${abertos === 1 ? 'pedido' : 'pedidos'} de adoção em andamento.` : 'Que tal conhecer quem está esperando por um lar?';

    let s = trocarBloco(html, 'perfil', m.perfilAdotante(perfil));
    s = trocarBloco(s, 'saudacao', `\n              <h1 id="titulo-pagina">Olá, ${esc(perfil.nome.split(' ')[0])}!</h1>\n              <p>${esc(frase)}</p>\n            `);
    s = trocarBloco(s, 'contador-pedidos', String(abertos));
    s = trocarBloco(s, 'pedidos', ou(pedidos, m.pedidoAdotante, m.vazio('Você ainda não pediu para adotar ninguém.',
      '<a class="botao secundario pequeno" href="adocao.html">Ver animais</a>')));
    s = trocarBloco(s, 'favoritos', favoritos.length
      ? `<ul class="favoritos">${favoritos.map(m.favorito).join('')}</ul>`
      : m.vazio('Os animais que você favoritar aparecem aqui.', '', 'coracao'));
    s = trocarBloco(s, 'alertas', ou(alertas, m.alertaLinha, m.vazio('Você ainda não tem alertas da lista de espera.', '', 'sino')));
    if (anuncios.length) s = trocarBloco(s, 'anuncios', anuncios.map(m.anuncioLinha).join(''));
    return s;
  },

  async 'painel-ong.html'(html, req, res) {
    const u = req.session.usuario;
    const [ong] = await consulta(
      `SELECT o.usuario_id AS id, o.nome, o.tipo, o.logo_url, o.apresentacao, en.logradouro, en.latitude,
              (SELECT COUNT(*) FROM ong_documentos d WHERE d.ong_id = o.usuario_id) AS documentos
         FROM ongs o JOIN enderecos en ON en.id = o.endereco_id WHERE o.usuario_id = ?`,
      [u.id],
    );
    if (!ong) {
      req.session.destroy(() => {});
      res.redirect(303, '/entrar.html#ong');
      return null;
    }
    const [pedidos, animais, campanhas, [numeros]] = await Promise.all([
      consulta(
        `SELECT p.id, p.nome, p.telefone, p.email, p.moradia, p.outros_animais, p.mensagem, p.status_atual, p.criado_em,
                a.nome AS animal, c.nome AS cidade, e.sigla AS uf
           FROM pedidos_adocao p
           JOIN animais a ON a.id = p.animal_id
           LEFT JOIN adotantes ad ON ad.usuario_id = p.adotante_id
           LEFT JOIN enderecos en ON en.id = ad.endereco_id
           LEFT JOIN cidades c ON c.id = en.cidade_id
           LEFT JOIN estados e ON e.id = c.estado_id
          WHERE a.ong_id = ?
          ORDER BY p.status_atual IN ('aprovado','recusado','cancelado'), p.criado_em DESC
          LIMIT 50`,
        [u.id],
      ),
      consulta(
        `SELECT v.id, v.nome, v.status, v.especie, v.foto_url, v.foto_enquadramento,
                (SELECT COUNT(*) FROM pedidos_adocao p WHERE p.animal_id = v.id) AS pedidos,
                (SELECT COUNT(*) FROM pedidos_adocao p WHERE p.animal_id = v.id AND p.status_atual = 'enviado') AS pedidos_novos
           FROM vw_animais_vitrine v WHERE v.ong_id = ?
          ORDER BY FIELD(v.status, 'rascunho', 'disponivel', 'em_processo', 'adotado'), v.criado_em DESC`,
        [u.id],
      ),
      consulta(
        `SELECT ca.*, o.nome AS ong_nome, CURDATE() AS hoje FROM campanhas ca JOIN ongs o ON o.usuario_id = ca.ong_id
          WHERE ca.ong_id = ? ORDER BY (ca.status = 'aberta' AND ca.data_fim >= CURDATE()) DESC, ca.data_fim DESC LIMIT 10`,
        [u.id],
      ),
      consulta(
        `SELECT (SELECT COUNT(*) FROM animais WHERE ong_id = ? AND status = 'disponivel') AS disponiveis,
                (SELECT COUNT(*) FROM pedidos_adocao p JOIN animais a ON a.id = p.animal_id
                  WHERE a.ong_id = ? AND p.status_atual = 'enviado') AS novos,
                (SELECT COUNT(*) FROM pedidos_adocao p JOIN animais a ON a.id = p.animal_id
                  WHERE a.ong_id = ? AND p.status_atual = 'aprovado' AND YEAR(p.atualizado_em) = YEAR(CURDATE())) AS adocoes,
                (SELECT COUNT(*) FROM campanhas WHERE ong_id = ? AND status = 'aberta' AND data_fim >= CURDATE()) AS campanhas`,
        [u.id, u.id, u.id, u.id],
      ),
    ]);

    const novos = numeros.novos;
    const nomeCurto = ong.nome.replace(/^(ONG|Projeto|Instituto|Grupo)\s+/i, '');
    const frase = novos ? `${novos === 1 ? 'Chegou 1 pedido novo' : `Chegaram ${novos} pedidos novos`} de adoção.` : 'Nenhum pedido novo por enquanto.';
    let s = trocarBloco(html, 'perfil', m.perfilOng(ong));
    s = trocarBloco(s, 'saudacao', `\n              <h1 id="titulo-pagina">Olá, ${esc(nomeCurto)}!</h1>\n              <p>${esc(frase)}</p>\n            `);
    s = trocarBloco(s, 'estatisticas', [
      m.estatistica('animais para adoção', numeros.disponiveis, 'pata'),
      m.estatistica('pedidos novos', novos, 'caixa-entrada'),
      m.estatistica(`adoções em ${new Date().getFullYear()}`, numeros.adocoes, 'coracao'),
      m.estatistica('campanhas ativas', numeros.campanhas, 'megafone'),
    ].join(''));
    s = trocarBloco(s, 'contador-pedidos', String(novos));
    s = trocarBloco(s, 'novos', novos ? `<span class="etiqueta novo">${novos} ${novos === 1 ? 'novo' : 'novos'}</span>` : '');
    s = trocarBloco(s, 'pedidos', ou(pedidos, (p, i) => m.linhaPedidoOng(p, i), '<tr><td colspan="5">Nenhum pedido de adoção ainda.</td></tr>'));
    s = trocarBloco(s, 'animais', ou(animais, m.animalOng, `<li>${m.vazio('Cadastre o primeiro animal para ele aparecer na vitrine.',
      '<a class="botao primario pequeno" href="cadastrar-animal.html">Cadastrar animal</a>')}</li>`));
    s = trocarBloco(s, 'campanhas', ou(campanhas, m.campanhaOng, m.vazio('Nenhuma campanha ainda.',
      '<a class="botao secundario pequeno" href="nova-campanha.html">Criar campanha</a>', 'megafone')));
    s = trocarBloco(s, 'perfil-progresso', m.progressoPerfil(ong));
    return s;
  },
};

const ERROS_DE_CONEXAO = new Set(['ECONNREFUSED', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ER_NO_SUCH_TABLE', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT', 'ENOTFOUND']);
// Páginas que exigem login e de que tipo
const EXIGE = { 'minha-conta.html': 'adotante', 'painel-ong.html': 'ong', 'cadastrar-animal.html': 'ong', 'nova-campanha.html': 'ong' };
const PRIVADAS = new Set(Object.keys(EXIGE));

/** Ajustes de todas as páginas: avisa o JavaScript que o servidor está ligado e troca "Entrar" pela conta. */
function ajustesGerais(html, req) {
  let saida = html.replace('<body', '<body data-servidor').replace(/class="painel-sair" href="index\.html"/g, 'class="painel-sair" href="/sair"');
  const u = req.session.usuario;
  if (u) {
    const [destino, rotulo] = u.tipo === 'ong' ? ['painel-ong.html', 'Meu painel'] : ['minha-conta.html', 'Minha conta'];
    saida = saida.replace('<a class="botao fantasma pequeno" href="entrar.html">Entrar</a>', `<a class="botao fantasma pequeno" href="${destino}">${rotulo}</a>`);
    const nome = u.tipo === 'ong' ? u.nome.replace(/^(ONG|Projeto|Instituto|Grupo)\s+/i, '') : u.nome;
    saida = trocarBloco(saida, 'conta', `<a class="conta-chip" href="${destino}">
            <span class="avatar${u.tipo === 'ong' ? '' : ' bege'}" aria-hidden="true">${esc(iniciais(u.nome))}</span>
            <span>${esc(nome)}<small>${u.tipo === 'ong' ? 'Painel da ONG' : 'Minha conta'}</small></span>
          </a>`);
  }
  return saida;
}

rotas.get(/^\/(?:([\w-]+\.html))?$/, async (req, res, next) => {
  const nome = req.params[0] || 'index.html';
  let html;
  try {
    html = await lerPagina(nome);
  } catch (erro) {
    if (erro.code === 'ENOENT') return next();
    throw erro;
  }
  const exige = EXIGE[nome];
  const u = req.session.usuario;
  if (exige && (!u || u.tipo !== exige)) {
    const certo = u ? (u.tipo === 'ong' ? '/painel-ong.html' : '/minha-conta.html') : (exige === 'ong' ? '/entrar.html#ong' : '/entrar.html');
    return res.redirect(303, certo);
  }
  const montar = PAGINAS[nome];
  if (montar) {
    try {
      html = await montar(html, req, res);
      if (html === null) return undefined; // a página redirecionou (ex.: login)
    } catch (erro) {
      // Sem banco em desenvolvimento, as páginas públicas mostram os exemplos do protótipo
      if (config.producao || PRIVADAS.has(nome) || !ERROS_DE_CONEXAO.has(erro.code)) throw erro;
      console.warn(`[páginas] ${nome} sem dados do banco (${erro.code}). Mostrando os exemplos do protótipo.`);
      html = html.replace(/(<main[^>]*>)/, '$1\n<p class="aviso-sem-banco" role="status">Sem conexão com o banco de dados: mostrando os exemplos do protótipo.</p>');
    }
  }
  return res.type('html').set('Cache-Control', PRIVADAS.has(nome) ? 'no-store' : 'no-cache').send(ajustesGerais(html, req));
});

module.exports = rotas;
