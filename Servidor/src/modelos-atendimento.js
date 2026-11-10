// HTML do atendimento: chat entre adotante e ONG e chamados de suporte.
// Todo texto que vem do banco passa por esc() antes de entrar na página.
const { esc, dataBr, diaMes, horaMinuto, rotuloDia, diaAnterior, iniciais, resumo } = require('./util/html');
const { hoje } = require('./util/validacao');
const { vazio, genero, SITUACAO_PEDIDO, SITUACAO_ONG } = require('./modelos');

const iso = (texto) => String(texto || '').replace(' ', 'T');

/** Na lista de conversas: hora se foi hoje, "Ontem" ou dia e mês. */
function quando(texto) {
  const dia = String(texto || '').slice(0, 10);
  if (dia === hoje()) return horaMinuto(texto);
  if (dia === diaAnterior(hoje())) return 'Ontem';
  return diaMes(dia);
}

/* ---------- Chat ---------- */

function mensagem(m, lado, { vista = false, nomeOutro = '' } = {}) {
  const hora = `<time datetime="${iso(m.enviada_em)}">${horaMinuto(m.enviada_em)}</time>`;
  if (m.tipo === 'aviso') return `<li class="msg aviso" data-id="${m.id}"><p>${esc(m.texto)}</p>${hora}</li>`;
  const minha = m.autor === lado.eu;
  const quem = `<span class="visualmente-oculto">${minha ? 'Você' : esc(nomeOutro)}: </span>`;
  return `<li class="msg ${minha ? 'minha' : 'outra'}${vista ? ' vista' : ''}" data-id="${m.id}"><p>${quem}${esc(m.texto)}</p>${hora}</li>`;
}

/** Mensagens com o separador de dia ("Hoje", "Ontem", "05/11/2026") e o "Visto" na última que o outro lado já leu. */
function mensagens(lista, lado, { vistoAte = 0, nomeOutro = '' } = {}) {
  const minhas = lista.filter((m) => m.autor === lado.eu && m.tipo === 'texto');
  const ultimaMinha = minhas.length ? minhas[minhas.length - 1].id : 0;
  const partes = [];
  let dia = '';
  for (const m of lista) {
    const d = String(m.enviada_em).slice(0, 10);
    if (d !== dia) {
      dia = d;
      partes.push(`<li class="msg-dia" data-dia="${d}"><span>${rotuloDia(d, hoje())}</span></li>`);
    }
    partes.push(mensagem(m, lado, { vista: m.id === ultimaMinha && m.id <= vistoAte, nomeOutro }));
  }
  return partes.join('\n            ');
}

function itemConversa(c, lado, ativa) {
  const nome = c[lado.nomeOutro];
  const naoLidas = Number(c[lado.naoLidas]) || 0;
  const previa = c.ultima_texto ? `${c.ultima_autor === lado.eu ? 'Você: ' : ''}${resumo(c.ultima_texto, 64)}` : 'Conversa iniciada';
  const sobre = c.animal_nome ? ` · ${c.animal_nome}` : '';
  return `
            <li>
              <a class="conversa-item${ativa ? ' ativa' : ''}${naoLidas ? ' nao-lida' : ''}" href="mensagens.html?c=${c.id}" data-conversa="${c.id}"${ativa ? ' aria-current="true"' : ''}>
                <span class="avatar${lado.eu === 'ong' ? ' bege' : ''}" aria-hidden="true">${esc(iniciais(nome))}</span>
                <span class="conversa-texto">
                  <strong>${esc(nome)}<span class="conversa-sobre">${esc(sobre)}</span></strong>
                  <small>${esc(previa)}</small>
                </span>
                <span class="conversa-meta">
                  <time datetime="${iso(c.ultima_mensagem_em)}">${quando(c.ultima_mensagem_em)}</time>
                  <span class="contador"${naoLidas ? ` aria-label="${naoLidas} não ${naoLidas === 1 ? 'lida' : 'lidas'}"` : ' hidden'}>${naoLidas}</span>
                </span>
              </a>
            </li>`;
}

const semConversas = (lado) => `<li class="conversas-vazio">${vazio(
  lado.eu === 'ong'
    ? 'As conversas com os adotantes aparecem aqui quando chega um pedido de adoção.'
    : 'Você ainda não tem conversas. Peça uma adoção ou escreva para a ONG pelo anúncio do animal.',
  lado.eu === 'ong' ? '' : '<a class="botao secundario pequeno" href="adocao.html">Ver animais</a>',
  'conversa',
)}</li>`;

function topoConversa(c, lado, pedido) {
  const nome = c[lado.nomeOutro];
  const mapa = lado.eu === 'ong' ? SITUACAO_ONG : SITUACAO_PEDIDO;
  const situacao = pedido && mapa[pedido.status_atual]
    ? ` <span class="etiqueta ${mapa[pedido.status_atual][0]}">${mapa[pedido.status_atual][1]}</span>` : '';
  const sobre = c.animal_nome ? `Sobre ${genero(c.animal_sexo, 'o', 'a')} ${esc(c.animal_nome)}` : (lado.eu === 'ong' ? 'Adotante' : 'Organização verificada');
  let atalho = '';
  if (lado.eu === 'ong' && pedido) atalho = '<a class="botao fantasma pequeno" href="painel-ong.html#pedidos">Ver pedido</a>';
  else if (lado.eu === 'adotante' && c.animal_id) atalho = `<a class="botao fantasma pequeno" href="adocao.html#pet-${c.animal_id}">Ver anúncio</a>`;
  else if (lado.eu === 'adotante') atalho = `<a class="botao fantasma pequeno" href="ongs.html#ong-${c.ong_id}">Ver perfil</a>`;
  return `
          <header class="chat-topo">
            <a class="chat-voltar" href="mensagens.html" aria-label="Voltar para a lista de conversas"></a>
            <span class="avatar${lado.eu === 'ong' ? ' bege' : ''}" aria-hidden="true">${esc(iniciais(nome))}</span>
            <div class="chat-quem">
              <h2 id="chat-titulo">${esc(nome)}</h2>
              <p>${sobre}${situacao}</p>
            </div>
            ${atalho}
          </header>`;
}

function conversaAberta(c, lado, lista, pedido) {
  const nomeOutro = c[lado.nomeOutro];
  return `${topoConversa(c, lado, pedido)}

          <ol class="mensagens" id="mensagens" role="log" aria-labelledby="chat-titulo" tabindex="0">
            ${mensagens(lista, lado, { vistoAte: c[lado.leuOutro], nomeOutro })}
            <li class="msg-fim" id="fim" aria-hidden="true"></li>
          </ol>

          <p class="chat-dica">
            <img src="img/icones/escudo-pata.svg" alt="" width="22" height="22" />
            <span>A adoção é sempre gratuita ou com taxa voluntária. Desconfie de pedidos de pagamento e <a href="ajuda.html#falar">avise o suporte</a>.</span>
          </p>

          <form class="chat-form" action="/api/conversas/${c.id}/mensagens" method="post" data-proprio>
            <label class="visualmente-oculto" for="chat-texto">Mensagem para ${esc(nomeOutro)}</label>
            <textarea id="chat-texto" name="texto" rows="1" maxlength="1000" placeholder="Escreva uma mensagem" required></textarea>
            <button type="submit" class="chat-enviar" aria-label="Enviar mensagem"></button>
          </form>
        `;
}

const conversaVazia = (lado) => `
          <div class="chat-sem-conversa">
            ${vazio(lado.eu === 'ong' ? 'Quando um adotante escrever, a conversa abre aqui.' : 'Escolha um animal e converse com a ONG sem sair do site.',
    lado.eu === 'ong' ? '' : '<a class="botao primario pequeno" href="adocao.html">Ver animais</a>', 'conversa')}
          </div>
        `;

/* ---------- Suporte ---------- */

const CATEGORIAS = {
  conta: 'Conta e acesso', adocao: 'Adoção', ong: 'ONGs e protetores', anuncio: 'Perdidos e achados',
  denuncia: 'Denúncias', sugestao: 'Sugestão', outro: 'Outro assunto',
};
const STATUS_CHAMADO = {
  aberto: ['analise', 'Aguardando a equipe'], respondido: ['aprovado', 'Respondido'], resolvido: ['adotado', 'Resolvido'],
};

function mensagemChamado(m, visao) {
  const minha = (visao === 'equipe') === (m.autor === 'equipe');
  const quem = m.autor === 'equipe' ? 'Equipe Patinhas Club' : (visao === 'equipe' ? 'Quem abriu o chamado' : 'Você');
  return `<li class="msg ${minha ? 'minha' : 'outra'}"><p><strong class="msg-autor">${quem}</strong>${esc(m.texto)}</p><time datetime="${iso(m.enviada_em)}">${dataBr(m.enviada_em)} às ${horaMinuto(m.enviada_em)}</time></li>`;
}

/** Chamado aberto na Central de ajuda (visão de quem pediu ajuda). */
function chamadoAberto(c, lista) {
  const [classe, rotulo] = STATUS_CHAMADO[c.status] || STATUS_CHAMADO.aberto;
  return `
        <section class="secao chamado-secao" id="chamado" aria-labelledby="titulo-chamado">
          <div class="container-estreito">
            <article class="chamado">
              <header class="chamado-topo">
                <div>
                  <p class="chamado-protocolo">Protocolo <strong>${esc(c.protocolo)}</strong></p>
                  <h2 id="titulo-chamado">${esc(c.assunto)}</h2>
                  <p>${esc(CATEGORIAS[c.categoria] || '')} · aberto em ${dataBr(c.criado_em)}</p>
                </div>
                <span class="etiqueta ${classe}">${rotulo}</span>
              </header>
              <p class="aviso-inline" id="chamado-aberto">Guarde o protocolo: com ele e o seu e-mail você acompanha a resposta aqui, mesmo sem conta.</p>
              <ol class="mensagens mensagens-chamado" aria-label="Mensagens do chamado">
                ${lista.map((m) => mensagemChamado(m, 'solicitante')).join('\n                ')}
              </ol>
              <form class="form-cartao chamado-resposta" action="/api/suporte/chamados/${esc(c.protocolo)}/mensagens" method="post">
                <div class="campo">
                  <label for="chamado-texto">${c.status === 'resolvido' ? 'Precisa reabrir? Escreva aqui' : 'Acrescentar uma informação'}</label>
                  <textarea id="chamado-texto" name="texto" rows="3" maxlength="2000" required></textarea>
                </div>
                <div class="form-botoes">
                  ${c.status === 'resolvido' ? '' : `<button type="submit" class="botao fantasma" formaction="/api/suporte/chamados/${esc(c.protocolo)}/resolver" formnovalidate>Já resolvi</button>`}
                  <button type="submit" class="botao primario">Enviar</button>
                </div>
              </form>
            </article>
          </div>
        </section>`;
}

const linhaMeuChamado = (c) => {
  const [classe, rotulo] = STATUS_CHAMADO[c.status] || STATUS_CHAMADO.aberto;
  return `
              <li>
                <a class="chamado-linha" href="ajuda.html?chamado=${esc(c.protocolo)}#chamado">
                  <span><strong>${esc(c.assunto)}</strong><small>${esc(c.protocolo)} · ${dataBr(c.atualizado_em)}</small></span>
                  <span class="etiqueta ${classe}">${rotulo}</span>
                </a>
              </li>`;
};

const meusChamados = (lista) => (lista.length ? `
          <div class="meus-chamados">
            <h3>Seus chamados</h3>
            <ul>${lista.map(linhaMeuChamado).join('')}
            </ul>
          </div>` : '');

/* ---------- Administração ---------- */

const TIPO_ONG = { ong: 'ONG', protetor: 'Protetor independente', abrigo: 'Abrigo' };
const DOCUMENTO = { identificacao: 'Identificação', atuacao: 'Comprovante de atuação', estatuto: 'Estatuto', cnpj: 'Cartão CNPJ' };
const TIPO_DENUNCIA = {
  abandono: 'Animal abandonado', 'maus-tratos': 'Suspeita de maus-tratos', risco: 'Animal em situação de risco',
  'adocao-irregular': 'Venda ou adoção irregular', outro: 'Outra ocorrência',
};
const STATUS_DENUNCIA = {
  recebida: ['novo', 'Recebida'], em_analise: ['analise', 'Em análise'],
  encaminhada: ['visita', 'Encaminhada às autoridades'], arquivada: ['recusado', 'Arquivada'],
};

const documentoFormatado = (d) => (d.length === 14
  ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  : d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4'));

function cartaoOngPendente(o, documentos) {
  const docs = documentos.length
    ? documentos.map((d) => `<a href="/api/admin/documentos/${d.id}" target="_blank" rel="noopener">${esc(DOCUMENTO[d.tipo] || d.tipo)}</a>`).join(' · ')
    : 'Nenhum documento enviado';
  return `
            <article class="admin-cartao" id="ong-${o.id}">
              <header>
                <span class="avatar" aria-hidden="true">${esc(iniciais(o.nome))}</span>
                <div>
                  <h3>${esc(o.nome)}</h3>
                  <p>${TIPO_ONG[o.tipo] || 'ONG'} · ${o.documento.length === 14 ? 'CNPJ' : 'CPF'} ${documentoFormatado(o.documento)} · ${esc(o.cidade || '')}${o.uf ? `, ${esc(o.uf)}` : ''}</p>
                </div>
                <span class="etiqueta analise">Aguardando</span>
              </header>
              <p>${esc(resumo(o.apresentacao, 280))}</p>
              <dl class="admin-dados">
                <div><dt>Responsável</dt><dd>${esc(o.responsavel)}${o.cargo ? `, ${esc(o.cargo)}` : ''}</dd></div>
                <div><dt>Contato</dt><dd>${esc(o.telefone_formatado)} · ${esc(o.email)}</dd></div>
                <div><dt>Documentos</dt><dd>${docs}</dd></div>
                <div><dt>Cadastro enviado</dt><dd>${dataBr(o.criado_em)}</dd></div>
              </dl>
              <div class="grupo-botoes">
                <form action="/api/admin/ongs/${o.id}/aprovar" method="post"><button type="submit" class="botao escuro pequeno">Aprovar cadastro</button></form>
                <details class="admin-recusar">
                  <summary class="botao perigo pequeno">Recusar</summary>
                  <form class="form-compacto" action="/api/admin/ongs/${o.id}/recusar" method="post">
                    <div class="campo">
                      <label for="motivo-${o.id}">Motivo (a organização recebe por e-mail)</label>
                      <textarea id="motivo-${o.id}" name="motivo" rows="2" maxlength="255" required></textarea>
                    </div>
                    <button type="submit" class="botao perigo pequeno">Confirmar recusa</button>
                  </form>
                </details>
              </div>
            </article>`;
}

function cartaoDenuncia(d, midias) {
  const [classe, rotulo] = STATUS_DENUNCIA[d.status] || STATUS_DENUNCIA.recebida;
  const lugar = [d.bairro, d.cidade && `${d.cidade}${d.uf ? `, ${d.uf}` : ''}`].filter(Boolean).join(', ') || 'Local informado no mapa';
  const quando = rotuloDia(d.criado_em, hoje()).toLowerCase();
  const contato = d.denunciante_nome
    ? `${esc(d.denunciante_nome)}${d.denunciante_telefone ? ` · ${esc(d.telefone_formatado)}` : ''}${d.denunciante_email ? ` · ${esc(d.denunciante_email)}` : ''}`
    : 'Anônima';
  const opcoes = Object.entries(STATUS_DENUNCIA)
    .map(([v, [, r]]) => `<option value="${v}"${v === d.status ? ' selected' : ''}>${r}</option>`).join('');
  const provas = midias.length
    ? midias.map((m2, i) => `<a href="/api/admin/midias/${m2.id}" target="_blank" rel="noopener">${m2.tipo === 'video' ? 'Vídeo' : 'Foto'} ${i + 1}</a>`).join(' · ')
    : 'Sem anexos';
  return `
            <article class="admin-cartao" id="denuncia-${d.id}">
              <header>
                <img src="img/icones/alerta.svg" alt="" width="44" height="44" />
                <div>
                  <h3>${esc(TIPO_DENUNCIA[d.tipo_ocorrencia] || 'Denúncia')} · protocolo ${d.id}</h3>
                  <p>${esc(lugar)} · recebida ${/^\d/.test(quando) ? `em ${quando}` : quando}</p>
                </div>
                <span class="etiqueta ${classe}">${rotulo}</span>
              </header>
              <p>${esc(d.situacao_animal)}</p>
              <dl class="admin-dados">
                <div><dt>Animais</dt><dd>${d.quantidade_animais}${d.ainda_no_local === 'sim' ? ' · ainda no local' : ''}</dd></div>
                <div><dt>Denunciante</dt><dd>${contato}</dd></div>
                <div><dt>Anexos</dt><dd>${provas}</dd></div>
              </dl>
              <form class="form-compacto admin-linha" action="/api/admin/denuncias/${d.id}" method="post">
                <div class="campo">
                  <label for="den-status-${d.id}">Situação</label>
                  <select id="den-status-${d.id}" name="status">${opcoes}</select>
                </div>
                <div class="campo">
                  <label for="den-parecer-${d.id}">Anotação da equipe</label>
                  <input type="text" id="den-parecer-${d.id}" name="parecer" maxlength="500" value="${esc(d.parecer || '')}" />
                </div>
                <button type="submit" class="botao escuro pequeno">Salvar</button>
              </form>
            </article>`;
}

function cartaoChamadoAdmin(c, lista) {
  const [classe, rotulo] = STATUS_CHAMADO[c.status] || STATUS_CHAMADO.aberto;
  return `
            <article class="admin-cartao" id="chamado-${c.id}">
              <header>
                <span class="avatar bege" aria-hidden="true">${esc(iniciais(c.nome))}</span>
                <div>
                  <h3>${esc(c.assunto)}</h3>
                  <p>${esc(c.nome)} · ${esc(CATEGORIAS[c.categoria] || '')} · ${esc(c.protocolo)}${c.usuario_id ? '' : ' · sem conta'}</p>
                </div>
                <span class="etiqueta ${classe}">${rotulo}</span>
              </header>
              <ol class="mensagens mensagens-chamado" aria-label="Mensagens do chamado ${esc(c.protocolo)}">
                ${lista.map((m2) => mensagemChamado(m2, 'equipe')).join('\n                ')}
              </ol>
              <form class="form-compacto" action="/api/admin/chamados/${c.id}/mensagens" method="post">
                <div class="campo">
                  <label for="resposta-${c.id}">Resposta para ${esc(c.nome.split(' ')[0])}</label>
                  <textarea id="resposta-${c.id}" name="texto" rows="3" maxlength="2000" required></textarea>
                </div>
                <div class="grupo-botoes">
                  <button type="submit" class="botao escuro pequeno">Responder</button>
                  <button type="submit" class="botao secundario pequeno" name="resolver" value="sim">Responder e encerrar</button>
                </div>
              </form>
            </article>`;
}

const adminVazio = (texto) => `<p class="admin-vazio">${texto}</p>`;

module.exports = {
  mensagem, mensagens, itemConversa, semConversas, conversaAberta, conversaVazia, quando,
  CATEGORIAS, STATUS_CHAMADO, mensagemChamado, chamadoAberto, meusChamados,
  TIPO_DENUNCIA, STATUS_DENUNCIA, cartaoOngPendente, cartaoDenuncia, cartaoChamadoAdmin, adminVazio,
};
