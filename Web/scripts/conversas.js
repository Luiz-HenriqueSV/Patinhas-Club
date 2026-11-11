/*
 * Patinhas Club — chat entre adotante e ONG (mensagens.html)
 * ------------------------------------------------------------
 * Sem JavaScript, a página já funciona: o formulário envia a
 * mensagem e o servidor recarrega a conversa. Este arquivo deixa
 * a conversa "ao vivo":
 *   - envia sem recarregar e mostra a mensagem na hora;
 *   - recebe as mensagens em tempo real (EventSource / SSE);
 *   - se a conexão cair, consulta o servidor de tempos em tempos
 *     até ela voltar;
 *   - atualiza a lista de conversas, os contadores e o "Visto".
 * Sem o servidor (protótipo aberto direto), a mensagem aparece na
 * tela, mas não é salva.
 */
(function () {
  'use strict';

  const app = document.querySelector('[data-chat]');
  if (!app) return;

  const comServidor = document.body.hasAttribute('data-servidor');
  const eu = app.dataset.eu;
  const conversaId = Number(app.dataset.conversa) || null;
  const lista = app.querySelector('.conversas');
  const caixa = app.querySelector('#mensagens');
  const form = app.querySelector('.chat-form');
  const campo = form && form.querySelector('textarea');
  const tituloOriginal = document.title;
  let pendentesNoTitulo = 0;

  /* ---------- Utilidades ---------- */

  const hojeLocal = () => new Date().toLocaleDateString('sv-SE'); // "2026-11-09"
  const ultimoId = () => Math.max(0, ...[...caixa.querySelectorAll('.msg[data-id]')].map((li) => Number(li.dataset.id) || 0));
  const naTela = () => Boolean(caixa && caixa.offsetParent) && document.visibilityState === 'visible';
  const pertoDoFim = () => caixa.scrollHeight - caixa.scrollTop - caixa.clientHeight < 120;
  const irParaOFim = (suave) => caixa.scrollTo({ top: caixa.scrollHeight, behavior: suave ? 'smooth' : 'auto' });

  function iniciais(nome) {
    const ignorar = ['ong', 'projeto', 'instituto', 'grupo', 'protetora', 'protetor', 'de', 'da', 'do', 'das', 'dos', 'e'];
    const palavras = String(nome || '').split(/\s+/).filter((p) => p && !ignorar.includes(p.toLowerCase()));
    return (palavras.slice(0, 2).map((p) => p[0]).join('') || '?').toUpperCase();
  }

  async function api(url, opcoes = {}) {
    const resposta = await fetch(url, { credentials: 'same-origin', ...opcoes, headers: { Accept: 'application/json', ...(opcoes.headers || {}) } });
    const corpo = await resposta.json().catch(() => null);
    if (resposta.status === 401) { location.assign((corpo && corpo.redirecionar) || '/entrar.html'); throw new Error('sem login'); }
    if (!resposta.ok || !corpo || !corpo.ok) throw Object.assign(new Error((corpo && corpo.mensagem) || 'Falha na resposta'), { corpo });
    return corpo;
  }

  function avisar(texto) {
    let aviso = document.querySelector('.aviso-rodape');
    if (!aviso) {
      aviso = Object.assign(document.createElement('div'), { className: 'aviso-rodape' });
      aviso.setAttribute('role', 'status');
      document.body.append(aviso);
    }
    aviso.textContent = texto;
    aviso.classList.add('visivel');
    clearTimeout(avisar.relogio);
    avisar.relogio = setTimeout(() => aviso.classList.remove('visivel'), 4000);
  }

  /** Contadores de não lidas do cabeçalho e dos menus (todos têm data-nao-lidas). */
  function mostrarNaoLidas(total) {
    document.querySelectorAll('[data-nao-lidas]').forEach((el) => {
      el.textContent = total;
      el.hidden = !total;
    });
  }

  /* ---------- Montagem das mensagens ---------- */

  function criarMensagem(m) {
    const li = document.createElement('li');
    const texto = document.createElement('p');
    const hora = document.createElement('time');
    hora.dateTime = String(m.enviada_em || '').replace(' ', 'T');
    hora.textContent = String(m.enviada_em || '').slice(11, 16);
    if (m.tipo === 'aviso') {
      li.className = 'msg aviso';
    } else {
      const minha = m.autor === eu;
      li.className = `msg ${minha ? 'minha' : 'outra'}`;
      const quem = Object.assign(document.createElement('span'), { className: 'visualmente-oculto' });
      quem.textContent = minha ? 'Você: ' : `${nomeDoOutro()}: `;
      texto.append(quem);
    }
    if (m.id) li.dataset.id = m.id;
    texto.append(document.createTextNode(m.texto)); // textContent: nada do que a pessoa digita vira HTML
    li.append(texto, hora);
    return li;
  }

  const nomeDoOutro = () => (app.querySelector('#chat-titulo') || {}).textContent || '';

  function acrescentar(m, { rolar = true } = {}) {
    if (m.id && caixa.querySelector(`.msg[data-id="${m.id}"]`)) return null; // já chegou por outro caminho
    const fim = caixa.querySelector('.msg-fim');
    const dia = String(m.enviada_em || '').slice(0, 10) || hojeLocal();
    const separadores = caixa.querySelectorAll('.msg-dia');
    const ultimoDia = separadores.length ? separadores[separadores.length - 1].dataset.dia : '';
    if (ultimoDia !== dia && !(ultimoDia === undefined && dia !== hojeLocal())) {
      const sep = Object.assign(document.createElement('li'), { className: 'msg-dia' });
      sep.dataset.dia = dia;
      sep.append(Object.assign(document.createElement('span'), { textContent: dia === hojeLocal() ? 'Hoje' : dia.split('-').reverse().join('/') }));
      caixa.insertBefore(sep, fim);
    }
    const estavaNoFim = pertoDoFim();
    const li = criarMensagem(m);
    caixa.insertBefore(li, fim);
    if (rolar && (estavaNoFim || m.autor === eu)) irParaOFim(true);
    return li;
  }

  function marcarVisto(ate) {
    caixa.querySelectorAll('.msg.minha.vista').forEach((li) => li.classList.remove('vista'));
    const minhas = [...caixa.querySelectorAll('.msg.minha[data-id]')].filter((li) => Number(li.dataset.id) <= ate);
    if (minhas.length) minhas[minhas.length - 1].classList.add('vista');
  }

  /* ---------- Lista de conversas ---------- */

  function atualizarLista({ conversa, mensagem, de, naoLidasNaConversa }) {
    if (!lista) return;
    let link = lista.querySelector(`[data-conversa="${conversa}"]`);
    if (!link) {
      // conversa nova: monta o item com o que veio no evento
      const vazio = lista.querySelector('.conversas-vazio');
      if (vazio) vazio.remove();
      const li = document.createElement('li');
      li.innerHTML = '<a class="conversa-item"><span class="avatar" aria-hidden="true"></span><span class="conversa-texto"><strong></strong><small></small></span><span class="conversa-meta"><time></time><span class="contador" hidden>0</span></span></a>';
      link = li.firstElementChild;
      link.href = `mensagens.html?c=${conversa}`;
      link.dataset.conversa = conversa;
      if (eu === 'ong') link.querySelector('.avatar').classList.add('bege');
      link.querySelector('.avatar').textContent = iniciais(de);
      link.querySelector('strong').textContent = de;
      lista.prepend(li);
    } else if (link.parentElement !== lista.firstElementChild) {
      lista.prepend(link.parentElement); // a conversa mais recente sobe
    }
    const previa = mensagem.texto.length > 64 ? `${mensagem.texto.slice(0, 64).replace(/\s+\S*$/, '')}…` : mensagem.texto;
    link.querySelector('small').textContent = `${mensagem.autor === eu ? 'Você: ' : ''}${previa}`;
    link.querySelector('time').textContent = String(mensagem.enviada_em).slice(11, 16);
    const aberta = conversa === conversaId && naTela();
    const n = aberta ? 0 : naoLidasNaConversa;
    const contador = link.querySelector('.contador');
    contador.textContent = n;
    contador.hidden = !n;
    link.classList.toggle('nao-lida', Boolean(n));
  }

  /* ---------- Leitura ---------- */

  let marcando = null;
  function marcarComoLida() {
    if (!comServidor || !conversaId || !naTela()) return;
    clearTimeout(marcando);
    marcando = setTimeout(async () => {
      try {
        const r = await api(`/api/conversas/${conversaId}/lida`, { method: 'POST' });
        mostrarNaoLidas(r.naoLidas);
        const link = lista && lista.querySelector(`[data-conversa="${conversaId}"]`);
        if (link) {
          link.classList.remove('nao-lida');
          const contador = link.querySelector('.contador');
          contador.textContent = 0;
          contador.hidden = true;
        }
      } catch (erro) { /* tenta de novo na próxima mensagem */ }
    }, 300);
  }

  /* ---------- Envio ---------- */

  function ajustarAltura() {
    campo.style.height = 'auto';
    campo.style.height = `${Math.min(campo.scrollHeight + 2, 140)}px`;
  }

  async function enviar(texto, bolha) {
    bolha.classList.remove('falhou');
    bolha.classList.add('enviando');
    bolha.querySelector('time').textContent = 'Enviando…';
    try {
      const r = await api(form.getAttribute('action'), { method: 'POST', body: new URLSearchParams({ texto }) });
      const jaChegou = caixa.querySelector(`.msg[data-id="${r.mensagem.id}"]`);
      if (jaChegou && jaChegou !== bolha) { bolha.remove(); return; } // o evento em tempo real chegou antes da resposta
      bolha.dataset.id = r.mensagem.id;
      bolha.classList.remove('enviando');
      bolha.querySelector('time').textContent = String(r.mensagem.enviada_em).slice(11, 16);
      atualizarLista({ conversa: conversaId, mensagem: r.mensagem, de: nomeDoOutro(), naoLidasNaConversa: 0 });
    } catch (erro) {
      if (erro.message === 'sem login') return;
      bolha.classList.remove('enviando');
      bolha.classList.add('falhou');
      const validacao = erro.corpo && erro.corpo.erros && erro.corpo.erros.texto;
      bolha.querySelector('time').textContent = validacao || 'Não enviada. Toque para tentar de novo.';
      if (!validacao) {
        bolha.tabIndex = 0;
        bolha.setAttribute('role', 'button');
        const repetir = (ev) => {
          if (ev.type === 'keydown' && ev.key !== 'Enter' && ev.key !== ' ') return;
          bolha.removeEventListener('click', repetir);
          bolha.removeEventListener('keydown', repetir);
          bolha.removeAttribute('role');
          bolha.removeAttribute('tabindex');
          enviar(texto, bolha);
        };
        bolha.addEventListener('click', repetir);
        bolha.addEventListener('keydown', repetir);
      }
    }
  }

  if (form && campo) {
    campo.addEventListener('input', ajustarAltura);
    // Enter envia e Shift+Enter quebra a linha (no celular, Enter só quebra a linha)
    campo.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing && !matchMedia('(pointer: coarse)').matches) {
        ev.preventDefault();
        form.requestSubmit();
      }
    });
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const texto = campo.value.trim();
      if (!texto) { campo.focus(); return; }
      const agora = new Date();
      const bolha = acrescentar({ autor: eu, tipo: 'texto', texto, enviada_em: `${hojeLocal()} ${agora.toTimeString().slice(0, 8)}` });
      campo.value = '';
      ajustarAltura();
      campo.focus();
      if (!comServidor) { avisar('Modo protótipo: o servidor não está ligado, então a mensagem não foi salva.'); return; }
      enviar(texto, bolha);
    });
  }

  /* ---------- Tempo real ---------- */

  function aoReceber(d) {
    mostrarNaoLidas(d.naoLidas);
    atualizarLista(d);
    if (d.conversa !== conversaId) {
      if (d.mensagem.autor !== eu) avisar(`Nova mensagem de ${d.de}`);
    } else {
      const temporaria = d.mensagem.autor === eu && [...caixa.querySelectorAll('.msg.enviando')].find((li) => li.querySelector('p').lastChild.textContent === d.mensagem.texto);
      if (temporaria) {
        temporaria.dataset.id = d.mensagem.id;
        temporaria.classList.remove('enviando');
        temporaria.querySelector('time').textContent = String(d.mensagem.enviada_em).slice(11, 16);
      } else {
        acrescentar(d.mensagem);
      }
      if (d.mensagem.autor !== eu) marcarComoLida();
    }
    if (d.mensagem.autor !== eu && document.visibilityState !== 'visible') {
      pendentesNoTitulo += 1;
      document.title = `(${pendentesNoTitulo}) ${tituloOriginal}`;
    }
  }

  async function buscarNovas() {
    if (!conversaId) return;
    try {
      const r = await api(`/api/conversas/${conversaId}/mensagens?depois=${ultimoId()}`);
      let recebeu = false;
      for (const m of r.mensagens) { if (acrescentar(m) && m.autor !== eu) recebeu = true; }
      marcarVisto(r.vistoAte);
      if (recebeu) marcarComoLida();
    } catch (erro) { /* sem rede: a próxima tentativa resolve */ }
  }

  function estado(texto) {
    let el = app.querySelector('.chat-estado');
    if (!texto) { if (el) el.remove(); return; }
    if (!el) {
      el = Object.assign(document.createElement('p'), { className: 'chat-estado' });
      el.setAttribute('role', 'status');
      (app.querySelector('.chat-topo') || app.querySelector('.chat-lista-topo')).after(el);
    }
    el.textContent = texto;
  }

  function conectar() {
    let reserva = null; // consulta periódica enquanto a conexão em tempo real não volta
    const ligarReserva = () => { if (!reserva) reserva = setInterval(buscarNovas, 5000); };
    const desligarReserva = () => { clearInterval(reserva); reserva = null; };
    if (!('EventSource' in window)) { ligarReserva(); return; }

    const fonte = new EventSource('/api/conversas/eventos');
    let caiu = false;
    fonte.addEventListener('open', () => {
      desligarReserva();
      estado('');
      if (caiu) buscarNovas(); // traz o que chegou enquanto estava fora do ar
      caiu = false;
    });
    fonte.addEventListener('mensagem', (ev) => aoReceber(JSON.parse(ev.data)));
    fonte.addEventListener('lida', (ev) => { const d = JSON.parse(ev.data); if (d.conversa === conversaId) marcarVisto(d.ate); });
    fonte.addEventListener('naoLidas', (ev) => mostrarNaoLidas(JSON.parse(ev.data).naoLidas));
    fonte.addEventListener('error', () => {
      caiu = true;
      estado('Reconectando… as mensagens novas aparecem assim que a conexão voltar.');
      ligarReserva();
    });
    window.addEventListener('pagehide', () => fonte.close());
  }

  /* ---------- Início ---------- */

  // A conversa ocupa a altura que sobra embaixo do cabeçalho
  const cabecalho = document.querySelector('.cabecalho');
  const medir = () => document.documentElement.style.setProperty('--altura-cabecalho', `${cabecalho ? cabecalho.offsetHeight : 98}px`);
  medir();
  window.addEventListener('resize', medir);
  // No celular o cabeçalho rola junto com a página: a conversa aberta já começa ocupando a tela
  if (caixa && !app.classList.contains('so-lista') && matchMedia('(max-width: 1023px)').matches && location.search) {
    app.scrollIntoView({ block: 'start' });
  }

  if (caixa) {
    irParaOFim(false);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      pendentesNoTitulo = 0;
      document.title = tituloOriginal;
      marcarComoLida();
    });
    const item = lista && lista.querySelector(`[data-conversa="${conversaId}"]`);
    if (item && item.classList.contains('nao-lida')) marcarComoLida();
  }
  if (comServidor) conectar();
})();
