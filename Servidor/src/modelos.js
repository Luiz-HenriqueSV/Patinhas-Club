// Modelos de HTML das listas que vêm do banco. Seguem a mesma marcação dos
// cartões de exemplo das páginas, então o CSS (inclusive os filtros) continua valendo.
const Geo = require('../../Web/scripts/geo-nucleo.js');
const {
  esc, dataBr, diaMes, diaDaSemana, horaCurta, telefoneBr, telLink, numeroBr, iniciais, resumo,
} = require('./util/html');

const lista = (v) => (v ? String(v).split(',').filter(Boolean) : []);
const ehFemea = (sexo) => sexo === 'femea';
const genero = (sexo, masculino, feminino) => (ehFemea(sexo) ? feminino : masculino);

const PORTE = { pequeno: ['Pequeno', 'pequena'], medio: ['Médio', 'média'], grande: ['Grande', 'grande'] };
const ESPECIE = { cao: ['Cão', 'cadela', 'Cães'], gato: ['Gato', 'gata', 'Gatos'], outro: ['Outro', 'outra', 'Outros'] };
const SERVICOS = { adocao: 'Adoção', resgate: 'Resgate', 'lar-temporario': 'Lar temporário', castracao: 'Castração', veterinario: 'Veterinário' };
const CORES_AVATAR = ['', 'laranja', 'amarelo', 'bege', 'marrom'];

const rotuloPorte = (porte) => (PORTE[porte] || [''])[0];
const rotuloIdade = (faixa, sexo) => ({ filhote: 'Filhote', adulto: genero(sexo, 'Adulto', 'Adulta'), idoso: genero(sexo, 'Idoso', 'Idosa') }[faixa] || '');
const rotuloSexo = (sexo) => ({ macho: 'Macho', femea: 'Fêmea' }[sexo] || 'Não informado');
const nomeEspecie = (especie, sexo) => {
  const e = ESPECIE[especie] || ESPECIE.outro;
  return ehFemea(sexo) ? e[1] : e[0].toLowerCase();
};
const portePorExtenso = (porte, sexo) => {
  const p = PORTE[porte];
  if (!p) return '';
  return ehFemea(sexo) ? p[1] : p[0].toLowerCase();
};

/** Fotos do Unsplash aceitam o tamanho na URL; arquivos enviados ficam como estão. */
function foto(url, especie, largura) {
  if (!url) return `img/sem-foto-${especie === 'gato' ? 'gato' : 'cao'}.svg`;
  return /images\.unsplash\.com/.test(url) ? url.replace(/([?&])w=\d+/, `$1w=${largura}`) : url;
}

const distanciaFaixa = (m) => (m <= 1000 ? 1 : m <= 3000 ? 3 : 5);
const temDistancia = (m) => typeof m === 'number' && Number.isFinite(m);

/** "Com a ONG Amigos de Patas", "Com o Lar Patinhas Felizes" */
function comArtigo(nome) {
  const primeira = String(nome || '').split(' ')[0].toLowerCase();
  if (['ong', 'protetora', 'associação', 'associacao', 'casa', 'instituição'].includes(primeira)) return `a ${nome}`;
  if (['lar', 'projeto', 'instituto', 'grupo', 'abrigo', 'protetor', 'coletivo', 'centro'].includes(primeira)) return `o ${nome}`;
  return nome;
}

const vazio = (texto, link = '', icone = 'pata') => `
            <div class="vazio">
              <img src="img/icones/${icone}.svg" alt="" width="44" height="44" />
              <p>${esc(texto)}</p>
              ${link}
            </div>`;

/* ---------- Adoção ---------- */

/** Coração no canto da foto: só o adotante favorita; quem não entrou vai para o login. */
function botaoFavorito(a, conta, marcado) {
  if (conta && conta !== 'adotante') return '';
  const nome = esc(a.nome);
  if (!conta) {
    return `<a class="card-favorito" href="entrar.html" aria-label="Entre na sua conta para favoritar ${genero(a.sexo, 'o', 'a')} ${nome}"></a>`;
  }
  return `<form class="card-favorito" action="/api/favoritos/${a.id}" method="post" data-favorito>
                  <button type="submit" aria-pressed="${marcado}" aria-label="${marcado ? `Tirar ${nome} dos favoritos` : `Favoritar ${nome}`}"></button>
                </form>`;
}

/** Conversa com a ONG direto do anúncio (o histórico fica em Mensagens). */
function botaoConversar(a, conta) {
  if (conta === 'adotante') {
    return `<form class="card-conversar" action="/api/conversas" method="post">
                  <input type="hidden" name="ong_id" value="${a.ong_id}" />
                  <input type="hidden" name="animal_id" value="${a.id}" />
                  <button type="submit">Conversar com a ONG</button>
                </form>`;
  }
  if (!conta) return '<p class="card-conversar"><a class="link-conversar" href="entrar.html">Entre para conversar com a ONG</a></p>';
  return '';
}

function cartaoAnimal(a, n, { conta = null, favoritos = new Set() } = {}) {
  const id = `pet-${a.id}`;
  const status = { em_processo: ['processo', 'Em processo'], adotado: ['adotado', 'Adotado'] }[a.status] || ['disponivel', 'Disponível'];
  const saude = lista(a.saude);
  const convive = lista(a.convive);
  const tags = [
    saude.includes('vacinado') && genero(a.sexo, 'Vacinado', 'Vacinada'),
    saude.includes('vermifugado') && genero(a.sexo, 'Vermifugado', 'Vermifugada'),
    saude.includes('castrado') && genero(a.sexo, 'Castrado', 'Castrada'),
    saude.includes('microchip') && 'Microchip',
    convive.includes('criancas') && 'Convive com crianças',
    convive.includes('caes') && 'Convive com cães',
    convive.includes('gatos') && 'Convive com gatos',
    a.necessidades_especiais && 'Necessidades especiais',
  ].filter(Boolean);
  const dados = [`data-especie="${esc(a.especie)}"`, `data-porte="${esc(a.porte)}"`, `data-idade="${esc(a.faixa_etaria)}"`, `data-sexo="${esc(a.sexo)}"`];
  if (temDistancia(a.distancia_m)) dados.push(`data-distancia="${distanciaFaixa(a.distancia_m)}"`);
  if (convive.includes('criancas')) dados.push('data-criancas');
  if (a.necessidades_especiais) dados.push('data-especiais');
  const idade = [rotuloIdade(a.faixa_etaria, a.sexo), a.idade_aproximada].filter(Boolean).join(', ');
  const local = temDistancia(a.distancia_m) ? `A ${Geo.formatarDistancia(a.distancia_m)} de você` : `Em ${a.cidade}, ${a.uf}`;
  const artigo = genero(a.sexo, 'o', 'a');
  const nome = esc(a.nome);
  return `
            <article class="card-animal" id="${id}" aria-labelledby="nome-${id}"
              ${dados.join(' ')}>
              <div class="card-foto">
                <img${a.foto_enquadramento === 'topo' ? ' class="foco-topo"' : ''} src="${esc(foto(a.foto_url, a.especie, 800))}" alt="${nome}, ${esc(nomeEspecie(a.especie, a.sexo))} de porte ${esc(portePorExtenso(a.porte, 'macho'))}" width="400" height="300" loading="lazy" />
                <span class="etiqueta ${status[0]}">${status[1]}</span>
                ${botaoFavorito(a, conta, favoritos.has(a.id))}
              </div>

              <div class="card-info">
                <h3 class="card-nome" id="nome-${id}">${nome}</h3>
                <dl class="atributos">
                  <div><dt>Espécie</dt><dd>${esc(a.especie_nome)}</dd></div>
                  <div><dt>Porte</dt><dd>${rotuloPorte(a.porte)}</dd></div>
                  <div><dt>Idade</dt><dd>${esc(idade)}</dd></div>
                  <div><dt>Sexo</dt><dd>${rotuloSexo(a.sexo)}</dd></div>
                </dl>
                <div class="card-local">
                  <img src="img/icones/pin.svg" alt="" width="20" height="20" />
                  <p>${esc(local)}</p>
                </div>
                <p class="card-descricao">${esc(resumo(a.historia))}</p>
                ${tags.length ? `<ul class="card-tags" aria-label="Saúde e convivência de ${nome}">${tags.map((t) => `<li>${t}</li>`).join('')}</ul>` : ''}
                <p class="card-contato">Cuidado por <a href="ongs.html#ong-${a.ong_id}">${esc(a.ong_nome)}</a></p>
                ${botaoConversar(a, conta)}
              </div>

              <details class="card-acao">
                <summary class="botao primario largo">
                  <span class="quando-fechado">Quero adotar<span class="visualmente-oculto"> ${artigo} ${nome}</span></span>
                  <span class="quando-aberto">Fechar<span class="visualmente-oculto"> formulário</span></span>
                </summary>

                <form class="form-cartao" action="/api/animais/${a.id}/pedidos" method="post">
                  <fieldset class="grupo">
                    <legend>Conte um pouco sobre você</legend>
                    <p class="dica">${esc(a.ong_nome)} recebe estas respostas e entra em contato com você.</p>

                    <div class="campos">
                      <div class="campo">
                        <label for="adotar-nome-${n}">Seu nome <span class="obrigatorio" aria-hidden="true">*</span></label>
                        <input type="text" id="adotar-nome-${n}" name="nome" autocomplete="name" required />
                      </div>

                      <div class="campo">
                        <label for="adotar-tel-${n}">Telefone ou WhatsApp <span class="obrigatorio" aria-hidden="true">*</span></label>
                        <input type="tel" id="adotar-tel-${n}" name="telefone" placeholder="(11) 90000-0000" autocomplete="tel" required
                          pattern="\\(?\\d{2}\\)?\\s?\\d{4,5}-?\\d{4}" title="DDD e número, como (11) 90000-0000" />
                        <small class="msg-erro">Coloque o DDD e o número.</small>
                      </div>

                      <div class="campo">
                        <label for="adotar-email-${n}">E-mail</label>
                        <input type="email" id="adotar-email-${n}" name="email" placeholder="voce@email.com" autocomplete="email" />
                      </div>

                      <div class="campo">
                        <label for="adotar-moradia-${n}">Onde você mora? <span class="obrigatorio" aria-hidden="true">*</span></label>
                        <select id="adotar-moradia-${n}" name="moradia" required>
                          <option value="">Selecione</option>
                          <option value="casa">Casa</option>
                          <option value="casa-quintal">Casa com quintal</option>
                          <option value="apartamento">Apartamento</option>
                        </select>
                      </div>

                      <div class="campo campo-largo campo-checkbox">
                        <input type="checkbox" id="adotar-outros-${n}" name="outros_animais" value="sim" />
                        <label for="adotar-outros-${n}">Já tenho outros animais</label>
                      </div>

                      <div class="campo campo-largo">
                        <label for="adotar-msg-${n}">Por que quer adotar ${artigo} ${nome}?</label>
                        <textarea id="adotar-msg-${n}" name="mensagem" rows="3" maxlength="500" placeholder="Ex.: tenho tempo em casa, sempre tive pets..."></textarea>
                      </div>

                      <div class="campo campo-largo campo-checkbox">
                        <input type="checkbox" id="adotar-termo-${n}" name="termo" value="sim" required />
                        <label for="adotar-termo-${n}">Li e concordo com o <a href="termos.html#adocao-responsavel" target="_blank">compromisso de adoção responsável</a> <span class="obrigatorio" aria-hidden="true">*</span></label>
                      </div>
                    </div>
                  </fieldset>

                  <div class="form-botoes">
                    <button type="submit" class="botao escuro">Enviar pedido</button>
                  </div>
                </form>
              </details>
            </article>`;
}

/* ---------- Mural de perdidos ---------- */

function lugarDoAnuncio(a) {
  const rua = a.logradouro ? [a.logradouro, a.numero].filter(Boolean).join(', ') : a.referencia;
  return [rua, a.bairro, a.cidade].filter(Boolean).join(', ');
}

function formEncontrei(a, n, nome) {
  const artigo = a.nome_animal ? `${genero(a.sexo, 'o', 'a')} ${nome}` : 'este animal';
  return `
              <details class="card-acao">
                <summary class="botao secundario largo">
                  <span class="quando-fechado">Encontrei<span class="visualmente-oculto"> este animal</span></span>
                  <span class="quando-aberto">Fechar<span class="visualmente-oculto"> formulário</span></span>
                </summary>

                <form class="form-cartao" action="/api/anuncios/${a.id}/avisos" method="post" enctype="multipart/form-data">
                  <fieldset class="grupo">
                    <legend>Encontrou ${artigo}?</legend>
                    <p class="dica">O tutor recebe o seu aviso com o ponto no mapa e o contato que você deixar.</p>
                    <div class="localizador" data-localizador="compacto" data-campos="onde" data-agora="quando"
                      data-texto="Está vendo o animal agora? Use sua localização e o tutor recebe o ponto exato." hidden></div>

                    <div class="campos">
                      <div class="campo campo-largo">
                        <label for="enc-onde-${n}">Onde você viu? <span class="obrigatorio" aria-hidden="true">*</span></label>
                        <input type="text" id="enc-onde-${n}" name="onde" placeholder="Endereço ou ponto de referência" required />
                      </div>

                      <div class="campo">
                        <label for="enc-quando-${n}">Quando? <span class="obrigatorio" aria-hidden="true">*</span></label>
                        <input type="datetime-local" id="enc-quando-${n}" name="quando" required />
                      </div>

                      <div class="campo">
                        <label for="enc-estado-${n}">Como estava? <span class="obrigatorio" aria-hidden="true">*</span></label>
                        <select id="enc-estado-${n}" name="estado" required>
                          <option value="">Selecione</option>
                          <option value="bem">Bem, sem ferimentos</option>
                          <option value="assustado">Assustado</option>
                          <option value="ferido">Ferido</option>
                          <option value="desnutrido">Magro ou desidratado</option>
                        </select>
                      </div>

                      <div class="campo campo-largo">
                        <label for="enc-obs-${n}">Mais detalhes</label>
                        <textarea id="enc-obs-${n}" name="observacoes" rows="3" placeholder="Ex.: estava com a coleira, está comigo agora, já levei ao veterinário..."></textarea>
                      </div>

                      <div class="campo">
                        <label for="enc-foto-${n}">Foto (opcional)</label>
                        <input type="file" id="enc-foto-${n}" name="foto" accept="image/*" />
                      </div>

                      <div class="campo">
                        <label for="enc-contato-${n}">Seu contato <span class="obrigatorio" aria-hidden="true">*</span></label>
                        <input type="text" id="enc-contato-${n}" name="contato" placeholder="Telefone ou e-mail" required />
                      </div>
                    </div>
                  </fieldset>

                  <div class="form-botoes">
                    <button type="submit" class="botao escuro">Avisar o tutor</button>
                  </div>
                </form>
              </details>`;
}

function cartaoPerdido(a, n) {
  const id = `perdido-${a.id}`;
  const resolvido = a.status === 'resolvido';
  const situacao = resolvido ? 'encontrado' : 'perdido';
  const nome = esc(a.nome_animal || 'Sem nome');
  const etiqueta = resolvido ? genero(a.sexo, 'Encontrado', 'Encontrada') : genero(a.sexo, 'Perdido', 'Perdida');
  const quando = `${dataBr(a.data_ocorrencia)}${a.hora_ocorrencia ? `, por volta das ${horaCurta(a.hora_ocorrencia)}` : ''}`;
  const distancia = temDistancia(a.distancia_m) && !resolvido
    ? `<br /><span class="card-distancia">A ${Geo.formatarDistancia(a.distancia_m)} de você</span>` : '';
  const local = resolvido
    ? `Voltou para casa em ${dataBr(a.resolvido_em)}`
    : `<strong>Visto pela última vez em</strong> ${esc(lugarDoAnuncio(a))}<br />${quando}${distancia}`;
  const descricao = resolvido ? (a.desfecho || a.caracteristicas) : (a.caracteristicas || `Pelagem ${a.cor}.`);
  return `
            <article class="card-animal card-perdido" id="${id}" aria-labelledby="nome-${id}" data-especie="${esc(a.especie)}" data-situacao="${situacao}">
              <div class="card-foto">
                <img src="${esc(foto(a.foto_url, a.especie, 800))}" alt="${nome}, ${esc(nomeEspecie(a.especie, a.sexo))} ${esc(a.cor)}" width="400" height="300" loading="lazy" />
                <span class="etiqueta ${situacao}">${etiqueta}</span>
              </div>

              <div class="card-info">
                <h3 class="card-nome" id="nome-${id}">${nome}</h3>
                <dl class="atributos">
                  <div><dt>Espécie</dt><dd>${esc(a.especie_nome)}</dd></div>
                  <div><dt>Porte</dt><dd>${rotuloPorte(a.porte)}</dd></div>
                  <div><dt>Idade</dt><dd>${rotuloIdade(a.faixa_etaria, a.sexo)}</dd></div>
                  <div><dt>Situação</dt><dd>${resolvido ? 'Em casa' : etiqueta}</dd></div>
                </dl>
                <div class="card-local">
                  <img src="img/icones/pin.svg" alt="" width="20" height="20" />
                  <p>${local}</p>
                </div>
                <p class="card-descricao">${esc(descricao)}</p>
                ${resolvido ? '' : `<p class="card-contato">Contato do tutor: <a href="${telLink(a.contato_telefone)}">${telefoneBr(a.contato_telefone)}</a></p>`}
              </div>
              ${resolvido ? '' : formEncontrei(a, n, nome)}
            </article>`;
}

/* ---------- Diretório de ONGs ---------- */

function tipoDaOng(o) {
  if (o.tipo === 'abrigo') return 'Abrigo';
  if (o.tipo === 'protetor') return /^protetora\b/i.test(o.nome) ? 'Protetora independente' : 'Protetor independente';
  return 'ONG';
}

const seloVerificado = (o) => `<span class="selo-verificado"><img src="img/icones/escudo-check.svg" alt="" width="20" height="20" /> ${o.tipo === 'abrigo' || (o.tipo === 'protetor' && !/^protetora\b/i.test(o.nome)) ? 'Verificado' : 'Verificada'}</span>`;

function cartaoOng(o) {
  const especies = lista(o.especies);
  const servicos = lista(o.servicos);
  const tags = [...especies.map((e) => (ESPECIE[e] || ESPECIE.outro)[2]), ...servicos.map((s) => SERVICOS[s]).filter(Boolean)];
  const local = `${o.cidade}, ${o.uf}`; // o diretório mostra só a cidade, nunca a rua
  return `
            <li>
              <article class="ong-cartao" id="ong-${o.id}" data-especies="${esc(especies.join(' '))}" data-servicos="${esc(servicos.join(' '))}">
                <div class="ong-topo">
                  <span class="avatar grande ${CORES_AVATAR[o.id % CORES_AVATAR.length]}" aria-hidden="true">${esc(iniciais(o.nome))}</span>
                  <div>
                    <h3>${esc(o.nome)}</h3>
                    <p>${tipoDaOng(o)} em ${esc(local)}</p>
                    ${seloVerificado(o)}
                  </div>
                </div>
                <p>${esc(resumo(o.apresentacao, 220))}</p>
                <dl class="ong-numeros">
                  <div><dt>para adoção</dt><dd>${o.para_adocao}</dd></div>
                  <div><dt>${o.campanhas_ativas === 1 ? 'campanha ativa' : 'campanhas ativas'}</dt><dd>${o.campanhas_ativas}</dd></div>
                  ${o.ano_fundacao ? `<div><dt>atuando desde</dt><dd>${o.ano_fundacao}</dd></div>` : ''}
                </dl>
                ${tags.length ? `<ul class="card-tags" aria-label="Atuação">${tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
                <div class="grupo-botoes">
                  ${o.para_adocao ? `<a class="botao escuro pequeno" href="adocao.html?ong=${o.id}#mural">Ver animais</a>` : ''}
                  ${o.campanha_id ? `<a class="botao secundario pequeno" href="campanhas.html#campanha-${o.campanha_id}">Apoiar</a>` : ''}
                </div>
              </article>
            </li>`;
}

/* ---------- Campanhas ---------- */

const TIPOS_CAMPANHA = {
  arrecadacao: ['Arrecadação', 'racao'], vaquinha: ['Vaquinha', 'moedas'], evento: ['Evento', 'calendario'],
  voluntariado: ['Voluntariado', 'pessoas'], saude: ['Saúde', 'saude'],
};

function quantia(valor, unidade) {
  if (unidade === 'R$') return `R$ ${numeroBr(valor)}`;
  return unidade && unidade.length <= 3 ? `${numeroBr(valor)} ${unidade}` : numeroBr(valor);
}

function metaDaCampanha(c) {
  if (c.meta_valor) {
    const pct = Math.min(100, Math.round((c.arrecadado / c.meta_valor) * 100));
    const longa = c.meta_unidade && c.meta_unidade !== 'R$' && c.meta_unidade.length > 3 ? ` ${esc(c.meta_unidade)}` : '';
    return { pct, html: `<span><strong>${esc(quantia(c.arrecadado, c.meta_unidade))}</strong> de ${esc(quantia(c.meta_valor, c.meta_unidade))}${longa}</span>` };
  }
  if (c.arrecadado > 0) return { pct: 100, html: `<span><strong>${esc(quantia(c.arrecadado, c.meta_unidade))}</strong> arrecadados</span>` };
  return null;
}

function quandoDaCampanha(c) {
  if (c.tipo === 'evento') {
    return c.data_inicio === c.data_fim
      ? `${diaDaSemana(c.data_inicio)}, ${dataBr(c.data_inicio)}`
      : `De ${diaMes(c.data_inicio)} a ${dataBr(c.data_fim)}`;
  }
  return `Até ${dataBr(c.data_fim)}`;
}

function cartaoCampanha(c) {
  const [rotulo, icone] = TIPOS_CAMPANHA[c.tipo] || TIPOS_CAMPANHA.arrecadacao;
  const meta = metaDaCampanha(c);
  const passos = String(c.como_ajudar || '').split('\n').map((s) => s.trim()).filter(Boolean);
  return `
            <li class="campanha" id="campanha-${c.id}" data-tipo="${esc(c.tipo)}">
              <div class="campanha-faixa">
                <img src="img/icones/${icone}.svg" alt="" width="44" height="44" />
                <span class="etiqueta sem-ponto">${rotulo}</span>
              </div>
              <div class="campanha-corpo">
                <h3>${esc(c.titulo)}</h3>
                <p class="campanha-ong">Por <a href="ongs.html#ong-${c.ong_id}">${esc(c.ong_nome)}</a></p>
                <p>${esc(c.descricao)}</p>
                ${meta && c.meta_valor ? `<div class="campanha-meta">
                  <progress value="${meta.pct}" max="100" aria-label="${esc(c.titulo)}: ${meta.pct}% da meta">${meta.pct}%</progress>
                  <p>${meta.html}<span>${meta.pct}%</span></p>
                </div>` : (c.meta_texto ? `<p class="campanha-meta-texto"><strong>Meta:</strong> ${esc(c.meta_texto)}</p>` : '')}
                <ul class="campanha-info">
                  <li><img src="img/icones/calendario.svg" alt="" width="20" height="20" /> ${quandoDaCampanha(c)}</li>
                  ${c.local_texto ? `<li><img src="img/icones/pin.svg" alt="" width="20" height="20" /> ${esc(c.local_texto)}</li>` : ''}
                </ul>
                <details class="card-acao">
                  <summary class="botao secundario largo"><span class="quando-fechado">Quero ajudar</span><span class="quando-aberto">Fechar</span></summary>
                  <ol class="ajuda-lista">
                    ${passos.map((p) => `<li>${esc(p)}</li>`).join('\n                    ')}
                  </ol>
                  ${c.contato ? `<p class="dica">Contato: ${esc(c.contato)}</p>` : ''}
                </details>
              </div>
            </li>`;
}

/* ---------- Minha conta (adotante) ---------- */

const perfilAdotante = (p) => `
            <div class="painel-perfil">
              <span class="avatar bege" aria-hidden="true">${esc(iniciais(p.nome))}</span>
              <div>
                <strong>${esc(p.nome)}</strong>
                <small>${esc([p.cidade, p.uf].filter(Boolean).join(', '))}</small>
              </div>
            </div>`;

const SITUACAO_PEDIDO = {
  enviado: ['novo', 'Aguardando a ONG'], em_analise: ['analise', 'Em análise'], visita_agendada: ['visita', 'Visita marcada'],
  aprovado: ['aprovado', 'Adoção aprovada'], recusado: ['recusado', 'Não aprovado'], cancelado: ['recusado', 'Cancelado'],
};

function etapasDoPedido(p) {
  const visita = p.visita ? `Visita em ${diaMes(p.visita)}, às ${horaCurta(p.visita.slice(11))}` : 'Visita';
  const atual = ['enviado', 'em_analise', 'visita_agendada', 'aprovado'].indexOf(p.status_atual);
  const nomes = ['Pedido enviado', atual === 1 ? 'Conversa com a ONG' : atual > 1 ? 'Conversa' : 'ONG analisando', visita, 'Adoção'];
  const etapaAtual = Math.max(1, atual); // logo depois de enviar, a vez é da ONG
  return nomes.map((nome, i) => {
    let classe = '';
    if (atual === -1) classe = i === 0 ? 'feito' : ''; // recusado ou cancelado
    else if (atual === 3 || i < etapaAtual) classe = 'feito';
    else if (i === etapaAtual) classe = 'agora';
    return `<li${classe ? ` class="${classe}"` : ''}>${esc(nome)}</li>`;
  }).join('\n                  ');
}

function proximoPasso(p) {
  const animal = `${genero(p.sexo, 'o', 'a')} ${p.animal}`;
  return {
    enviado: 'a ONG responde em até 3 dias úteis, pelo chat em Mensagens ou pelo telefone que você informou.',
    em_analise: 'responda a ONG pelo chat, em Mensagens, para combinar a visita.',
    visita_agendada: 'leve um documento com foto e um comprovante de residência na visita.',
    aprovado: `combine com a ONG o dia de buscar ${animal}. Boas-vindas à família!`,
  }[p.status_atual] || 'este pedido foi encerrado. Que tal conhecer outros animais esperando por um lar?';
}

function pedidoAdotante(p) {
  const [classe, rotulo] = SITUACAO_PEDIDO[p.status_atual] || SITUACAO_PEDIDO.enviado;
  return `
            <article class="pedido-adotante">
              <img${p.foto_enquadramento === 'topo' ? ' class="foco-topo"' : ''} src="${esc(foto(p.foto_url, p.especie, 400))}" alt="${esc(p.animal)}" width="150" height="150" loading="lazy" />
              <div>
                <h3>${esc(p.animal)} <span class="etiqueta ${classe}">${rotulo}</span></h3>
                <p>Com ${esc(comArtigo(p.ong_nome))}. Pedido enviado em ${dataBr(p.criado_em)}.</p>
                <ol class="etapas-pedido" aria-label="Andamento do pedido ${genero(p.sexo, 'do', 'da')} ${esc(p.animal)}">
                  ${etapasDoPedido(p)}
                </ol>
                <p class="pedido-proximo"><strong>Próximo passo:</strong> ${esc(proximoPasso(p))}</p>
                <form class="pedido-conversar" action="/api/conversas" method="post">
                  <input type="hidden" name="ong_id" value="${p.ong_id}" />
                  <input type="hidden" name="animal_id" value="${p.animal_id}" />
                  <button type="submit" class="link-conversar">Conversar com ${esc(comArtigo(p.ong_nome))}</button>
                </form>
              </div>
            </article>`;
}

const favorito = (a) => `
              <li>
                <a class="mini-animal" href="adocao.html#pet-${a.id}">
                  <div class="polaroid">
                    <img${a.foto_enquadramento === 'topo' ? ' class="foco-topo"' : ''} src="${esc(foto(a.foto_url, a.especie, 500))}" alt="${esc(a.nome)}" width="300" height="255" loading="lazy" />
                  </div>
                  <h3>${esc(a.nome)}</h3>
                  <p>${esc([`${(ESPECIE[a.especie] || ESPECIE.outro)[ehFemea(a.sexo) ? 1 : 0].replace(/^./, (l) => l.toUpperCase())} ${portePorExtenso(a.porte, a.sexo)}`, a.idade_aproximada].filter(Boolean).join(', '))}</p>
                </a>
              </li>`;

function descricaoAlerta(a) {
  const especie = (ESPECIE[a.especie] || ESPECIE.outro)[0];
  const idades = lista(a.idades).map((i) => rotuloIdade(i, 'macho').toLowerCase()).join(' ou ') || 'qualquer idade';
  const portes = lista(a.portes).map((p) => rotuloPorte(p).toLowerCase()).join(' ou ');
  return `${especie} ${idades}, ${portes ? `porte ${portes}` : 'qualquer porte'}${a.cidade ? `, em ${a.cidade}` : ''}`;
}

const alertaLinha = (a) => `
            <div class="alerta-linha">
              <div>
                <img src="img/icones/sino.svg" alt="" width="34" height="34" />
                <p>
                  ${esc(descricaoAlerta(a))}
                  <small>${a.ativo ? `Ativo desde ${dataBr(a.criado_em)}` : 'Pausado'}</small>
                </p>
              </div>
              <div class="grupo-botoes">
                <form action="/api/alertas/${a.id}/pausar" method="post"><button type="submit" class="botao ${a.ativo ? 'fantasma' : 'secundario'} pequeno">${a.ativo ? 'Pausar' : 'Reativar'}</button></form>
              </div>
            </div>`;

const anuncioLinha = (a) => `
            <div class="alerta-linha">
              <div>
                <img src="img/icones/pin.svg" alt="" width="34" height="34" />
                <p>
                  ${esc(a.nome_animal || 'Animal sem nome')}: ${a.status === 'aberto' ? 'procurando' : 'voltou para casa'}
                  <small>Publicado em ${dataBr(a.criado_em)}${a.avisos ? ` · ${a.avisos} ${a.avisos === 1 ? 'aviso de quem viu' : 'avisos de quem viu'}` : ''}</small>
                </p>
              </div>
              <div class="grupo-botoes">
                <a class="botao fantasma pequeno" href="animais-perdidos.html#perdido-${a.id}">Ver no mural</a>
                ${a.status === 'aberto' ? `<form action="/api/anuncios/${a.id}/resolver" method="post"><button type="submit" class="botao secundario pequeno">Já voltou</button></form>` : ''}
              </div>
            </div>`;

/* ---------- Painel da ONG ---------- */

const perfilOng = (o) => `
            <div class="painel-perfil">
              <span class="avatar" aria-hidden="true">${esc(iniciais(o.nome))}</span>
              <div>
                <strong>${esc(o.nome)}</strong>
                ${seloVerificado(o)}
              </div>
            </div>`;

const estatistica = (rotulo, valor, icone) => `
              <div class="estatistica">
                <dt>${rotulo}</dt>
                <dd>${numeroBr(valor)} <img src="img/icones/${icone}.svg" alt="" width="34" height="34" /></dd>
              </div>`;

const SITUACAO_ONG = {
  enviado: ['novo', 'Novo'], em_analise: ['analise', 'Em análise'], visita_agendada: ['visita', 'Visita marcada'],
  aprovado: ['aprovado', 'Aprovado'], recusado: ['recusado', 'Recusado'], cancelado: ['recusado', 'Cancelado'],
};
const MORADIA = { casa: 'Casa', 'casa-quintal': 'Casa com quintal', apartamento: 'Apartamento' };

function botoesDoPedido(p) {
  const botao = (status, classe, texto) => `<form action="/api/ong/pedidos/${p.id}/status" method="post"><input type="hidden" name="status" value="${status}" /><button type="submit" class="botao ${classe} pequeno">${texto}</button></form>`;
  if (['enviado', 'em_analise'].includes(p.status_atual)) {
    return botao('visita_agendada', 'escuro', 'Marcar visita') + botao('recusado', 'perigo', 'Recusar');
  }
  if (p.status_atual === 'visita_agendada') return botao('aprovado', 'escuro', 'Aprovar') + botao('recusado', 'perigo', 'Recusar');
  return '';
}

function linhaPedidoOng(p, n) {
  const [classe, rotulo] = SITUACAO_ONG[p.status_atual] || SITUACAO_ONG.enviado;
  const partes = String(p.nome).split(' ');
  const nomeCurto = partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1][0]}.` : p.nome;
  const origem = p.cidade ? `${p.cidade}, ${p.uf}` : 'Pedido sem conta';
  const botoes = botoesDoPedido(p);
  return `
                  <tr>
                    <td class="sem-rotulo">
                      <div class="pessoa">
                        <span class="avatar ${CORES_AVATAR[(n % (CORES_AVATAR.length - 1)) + 1]}" aria-hidden="true">${esc(iniciais(p.nome))}</span>
                        <span>${esc(nomeCurto)}<small>${esc(origem)}</small></span>
                      </div>
                    </td>
                    <td data-rotulo="Animal">${esc(p.animal)}</td>
                    <td data-rotulo="Recebido em">${dataBr(p.criado_em)}</td>
                    <td data-rotulo="Situação"><span class="etiqueta ${classe}">${rotulo}</span></td>
                    <td class="sem-rotulo">
                      <details class="pedido-detalhes">
                        <summary>Ver respostas</summary>
                        <div class="pedido-respostas">
                          <dl>
                            <div><dt>Contato</dt><dd><a href="${telLink(p.telefone)}">${telefoneBr(p.telefone)}</a>${p.email ? ` · <a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : ''}</dd></div>
                            <div><dt>Moradia</dt><dd>${MORADIA[p.moradia] || ''}</dd></div>
                            <div><dt>Outros animais</dt><dd>${p.outros_animais ? 'Sim' : 'Nenhum'}</dd></div>
                            ${p.mensagem ? `<div><dt>Por que quer adotar</dt><dd>“${esc(p.mensagem)}”</dd></div>` : ''}
                          </dl>
                          <div class="grupo-botoes">${botoes}${p.adotante_id ? `<form action="/api/conversas" method="post"><input type="hidden" name="adotante_id" value="${p.adotante_id}" /><button type="submit" class="botao secundario pequeno">Conversar</button></form>` : ''}</div>
                        </div>
                      </details>
                    </td>
                  </tr>`;
}

const STATUS_ANIMAL = {
  disponivel: ['disponivel', 'Disponível'], em_processo: ['processo', 'Em processo'],
  adotado: ['adotado', 'Adotado'], rascunho: ['rascunho', 'Rascunho'],
};

function animalOng(a) {
  const [classe, rotulo] = STATUS_ANIMAL[a.status] || STATUS_ANIMAL.rascunho;
  const pedidos = `${a.pedidos} ${a.pedidos === 1 ? 'pedido' : 'pedidos'}${a.pedidos_novos ? `, ${a.pedidos_novos} ${a.pedidos_novos === 1 ? 'novo' : 'novos'}` : ''}`;
  const acao = a.status === 'rascunho'
    ? `<form action="/api/ong/animais/${a.id}/publicar" method="post"><button type="submit" class="botao secundario pequeno">Publicar</button></form>`
    : `<a class="botao fantasma pequeno" href="adocao.html#pet-${a.id}">Ver anúncio</a>`;
  return `
              <li>
                <article class="animal-ong">
                  <div class="animal-ong-foto">
                    <img${a.foto_enquadramento === 'topo' ? ' class="foco-topo"' : ''} src="${esc(foto(a.foto_url, a.especie, 500))}" alt="${esc(a.nome)}" width="300" height="225" loading="lazy" />
                    <span class="etiqueta ${classe}">${rotulo}</span>
                  </div>
                  <div class="animal-ong-corpo">
                    <h3>${esc(a.nome)}</h3>
                    <p>${a.status === 'rascunho' ? 'Ainda não aparece na vitrine' : pedidos}</p>
                    <div class="grupo-botoes">${acao}</div>
                  </div>
                </article>
              </li>`;
}

function campanhaOng(c) {
  const aberta = c.status === 'aberta' && c.data_fim >= c.hoje;
  const meta = metaDaCampanha(c);
  const [rotulo] = TIPOS_CAMPANHA[c.tipo] || TIPOS_CAMPANHA.arrecadacao;
  const quando = c.tipo === 'evento' ? `Evento em ${dataBr(c.data_inicio)}` : `${rotulo} até ${dataBr(c.data_fim)}`;
  return `
              <article class="campanha-linha">
                <h3>${esc(c.titulo)} <span class="etiqueta ${aberta ? 'ativa' : 'concluida'}">${aberta ? 'Ativa' : 'Encerrada'}</span></h3>
                <p>${quando}</p>
                ${meta ? `<progress value="${meta.pct}" max="100" aria-label="${esc(c.titulo)}: ${meta.pct}% da meta">${meta.pct}%</progress>
                <p class="campanha-numeros">${meta.html.replace(/<\/?span>/g, '')}</p>` : ''}
              </article>`;
}

function progressoPerfil(o) {
  const itens = [
    ['Logo', Boolean(o.logo_url)],
    ['Apresentação', Boolean(o.apresentacao)],
    ['Documentos', o.documentos > 0],
    ['Endereço', Boolean(o.logradouro)],
    ['Ponto no mapa', o.latitude !== null && o.latitude !== undefined],
  ];
  const pct = Math.round((itens.filter(([, ok]) => ok).length / itens.length) * 100);
  return `
            <div class="perfil-progresso">
              <div>
                <h2 id="titulo-perfil">${pct === 100 ? 'Seu perfil está completo' : `Seu perfil está ${pct}% completo`}</h2>
                <p>Perfis completos passam mais confiança para quem vai adotar.</p>
                <progress value="${pct}" max="100" aria-label="Perfil ${pct}% completo">${pct}%</progress>
                <ul class="perfil-itens">
                  ${itens.map(([nome, ok]) => `<li${ok ? ' class="ok"' : ''}>${nome}</li>`).join('\n                  ')}
                </ul>
              </div>
              <a class="botao secundario" href="#editar-perfil">Editar perfil</a>
            </div>`;
}

/* ---------- Página inicial ---------- */

const ongMini = (o, i) => `
            <li>
              <a class="ong-mini" href="ongs.html#ong-${o.id}">
                <span class="avatar ${CORES_AVATAR[i % CORES_AVATAR.length]}" aria-hidden="true">${esc(iniciais(o.nome))}</span>
                <span><strong>${esc(o.nome)}</strong><small>${esc(o.cidade)}, ${esc(o.uf)}</small></span>
              </a>
            </li>`;

/* ---------- Avisos da conta (tabela notificacoes) ---------- */

const ICONE_AVISO = { pedido_adocao: 'pata', campanha: 'megafone', anuncio: 'pin', sistema: 'sino' };
function novidades(lista) {
  if (!lista.length) return '';
  return `
            <div class="novidades-bloco">
              <h2 class="visualmente-oculto">Novidades</h2>
              <ul class="novidades">${lista.map((n) => `
                <li>
                  <a href="${esc(n.link || '#visao-geral')}">
                    <img src="img/icones/${ICONE_AVISO[n.tipo] || 'sino'}.svg" alt="" width="30" height="30" />
                    <span><strong>${esc(n.titulo)}</strong><small>${esc(n.mensagem)}</small></span>
                    <time datetime="${String(n.criado_em).replace(' ', 'T')}">${diaMes(n.criado_em)}</time>
                  </a>
                </li>`).join('')}
              </ul>
            </div>`;
}

/* ---------- Meus dados (adotante) e senha ---------- */

const opcoesMoradia = (atual) => Object.entries(MORADIA)
  .map(([v, r]) => `<option value="${v}"${v === atual ? ' selected' : ''}>${r}</option>`).join('');

const formDadosAdotante = (d) => `
            <form class="painel-form" action="/api/conta/dados" method="post" data-manter>
              <h3>Dados pessoais</h3>
              <div class="campos">
                <div class="campo">
                  <label for="dados-nome">Nome completo</label>
                  <input type="text" id="dados-nome" name="nome" value="${esc(d.nome)}" autocomplete="name" maxlength="120" required />
                </div>
                <div class="campo">
                  <label for="dados-telefone">Telefone ou WhatsApp</label>
                  <input type="tel" id="dados-telefone" name="telefone" value="${esc(telefoneBr(d.telefone))}" autocomplete="tel" required />
                </div>
                <div class="campo">
                  <label for="dados-email">E-mail</label>
                  <input type="email" id="dados-email" value="${esc(d.email)}" disabled aria-describedby="dados-email-dica" />
                  <small class="dica" id="dados-email-dica">Para trocar o e-mail, fale com o suporte.</small>
                </div>
                <div class="campo">
                  <label for="dados-moradia">Onde você mora</label>
                  <select id="dados-moradia" name="moradia" required>${opcoesMoradia(d.moradia)}</select>
                </div>
                <div class="campo campo-largo campo-checkbox">
                  <input type="checkbox" id="dados-alertas" name="recebe_alertas" value="sim"${d.recebe_alertas ? ' checked' : ''} />
                  <label for="dados-alertas">Quero receber por e-mail os avisos da lista de espera</label>
                </div>
              </div>
              <div class="form-botoes"><button type="submit" class="botao primario">Salvar dados</button></div>
            </form>`;

const formSenha = () => `
            <form class="painel-form" action="/api/conta/senha" method="post">
              <h3>Trocar a senha</h3>
              <div class="campos">
                <div class="campo">
                  <label for="senha-atual">Senha atual</label>
                  <input type="password" id="senha-atual" name="senha_atual" autocomplete="current-password" required />
                </div>
                <div class="campo">
                  <label for="senha-nova">Nova senha</label>
                  <input type="password" id="senha-nova" name="senha" autocomplete="new-password" minlength="8" required aria-describedby="senha-nova-dica" />
                  <small class="dica" id="senha-nova-dica">Pelo menos 8 caracteres.</small>
                </div>
              </div>
              <div class="form-botoes"><button type="submit" class="botao secundario">Trocar senha</button></div>
            </form>`;

/* ---------- Perfil público da ONG ---------- */

const formPerfilOng = (o) => `
            <form class="painel-form" id="editar-perfil" action="/api/ong/perfil" method="post" enctype="multipart/form-data" data-manter>
              <h3>Dados do perfil público</h3>
              <div class="campos">
                <div class="campo campo-largo">
                  <label for="perfil-apresentacao">Apresentação</label>
                  <textarea id="perfil-apresentacao" name="apresentacao" rows="5" maxlength="2000" required>${esc(o.apresentacao)}</textarea>
                </div>
                <div class="campo">
                  <label for="perfil-telefone">Telefone ou WhatsApp</label>
                  <input type="tel" id="perfil-telefone" name="telefone" value="${esc(telefoneBr(o.telefone))}" required />
                </div>
                <div class="campo">
                  <label for="perfil-rede">Rede social ou site</label>
                  <input type="text" id="perfil-rede" name="rede_social" value="${esc(o.rede_social || '')}" maxlength="150" placeholder="@suaong" />
                </div>
                <div class="campo">
                  <label for="perfil-logo">Trocar a logo</label>
                  <input type="file" id="perfil-logo" name="logo" accept="image/png,image/jpeg,image/webp" />
                  <small class="dica">PNG, JPG ou WEBP.</small>
                </div>
                <div class="campo campo-checkbox">
                  <input type="checkbox" id="perfil-ocultar" name="ocultar_endereco" value="sim"${o.ocultar_endereco ? ' checked' : ''} />
                  <label for="perfil-ocultar">Mostrar só o bairro e a cidade no site</label>
                </div>
              </div>
              <div class="form-botoes"><button type="submit" class="botao primario">Salvar perfil</button></div>
            </form>`;

module.exports = {
  vazio, cartaoAnimal, cartaoPerdido, cartaoOng, cartaoCampanha,
  perfilAdotante, pedidoAdotante, favorito, alertaLinha, anuncioLinha,
  perfilOng, estatistica, linhaPedidoOng, animalOng, campanhaOng, progressoPerfil,
  comArtigo, genero, SITUACAO_PEDIDO, SITUACAO_ONG, MORADIA,
  novidades, formDadosAdotante, formSenha, formPerfilOng, ongMini,
};
