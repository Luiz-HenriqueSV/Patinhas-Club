/*
 * Patinhas Club — localizador em tempo real
 * ------------------------------------------------------------
 * Usa o GPS do aparelho (navigator.geolocation.watchPosition) para
 * preencher o endereço sozinho, mostra a precisão ao vivo e deixa a
 * pessoa ajustar o ponto exato num mapa (Leaflet + OpenStreetMap).
 *
 * Marcação: <div class="localizador" data-localizador="MODO" hidden></div>
 *   completo    mapa + preenche endereco, bairro, cidade, estado e cep
 *   compacto    mapa menor + preenche um campo só (data-campos="onde")
 *   cidade      sem mapa, preenche cidade e estado
 *   proximidade botão "Perto de mim" que ordena a lista pela distância
 * data-campos="a,b" troca os campos preenchidos; data-texto troca a dica inicial;
 * data-agora="data,hora" preenche data e hora de agora quando a pessoa usa o GPS (ela está no local).
 *
 * Com o servidor ligado (<body data-servidor>), as buscas passam por
 * /api/localizacao (cache e limite de uso). Com o site aberto direto,
 * o navegador fala com o OpenStreetMap e a ViaCEP.
 */
(function () {
  'use strict';

  const Geo = window.PatinhasGeo;
  if (!Geo) return;

  const LEAFLET = {
    css: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    cssSri: 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=',
    js: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    jsSri: 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=',
  };
  const PRECISAO_META = 20; // m: com isso o ponto já é exato
  const ANDOU = 25; // m: só busca o endereço de novo se a pessoa andar mais que isso
  const TEMPO_MAXIMO = 2 * 60 * 1000; // para de seguir o GPS depois de 2 min (bateria)
  const CENTRO_PADRAO = [-23.6861, -46.6228]; // Diadema, antes do primeiro ponto

  const comServidor = () => document.body.hasAttribute('data-servidor');

  /* ---------- De onde vêm os endereços ---------- */

  const filaNominatim = Geo.criarFila(1100);

  async function pegarJson(url) {
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status });
    return r.json();
  }

  const buscarDireto = (url) => (url.startsWith(Geo.URLS.nominatim)
    ? filaNominatim(() => pegarJson(url))
    : pegarJson(url));

  async function obter(caminho, direto) {
    if (comServidor()) {
      try {
        return (await pegarJson(`/api/localizacao/${caminho}`)).endereco || null;
      } catch (erro) {
        if (erro.status && erro.status < 500) throw erro;
        // servidor sem acesso aos serviços de mapa: tenta direto pelo navegador
      }
    }
    return direto();
  }

  const fontes = {
    ponto: (lat, lon) => obter(`reverso?lat=${lat}&lon=${lon}`, () => Geo.enderecoDoPonto(lat, lon, buscarDireto)),
    cep: (cep) => obter(`cep/${cep}`, () => Geo.enderecoDoCep(cep, buscarDireto)),
    endereco: (e) => obter(
      `buscar?${new URLSearchParams(Object.entries(e).filter(([, v]) => v))}`,
      () => Geo.pontoDoEndereco(e, buscarDireto),
    ),
  };

  /* ---------- Leaflet sob demanda (só baixa quando o mapa vai aparecer) ---------- */

  let carregandoLeaflet = null;
  function carregarLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (carregandoLeaflet) return carregandoLeaflet;
    carregandoLeaflet = new Promise((ok, falha) => {
      const css = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: LEAFLET.css, integrity: LEAFLET.cssSri, crossOrigin: '' });
      const js = Object.assign(document.createElement('script'), { src: LEAFLET.js, integrity: LEAFLET.jsSri, crossOrigin: '', async: true });
      js.onload = () => (window.L ? ok(window.L) : falha(new Error('Leaflet não carregou')));
      js.onerror = () => { carregandoLeaflet = null; falha(new Error('Leaflet indisponível')); };
      document.head.append(css, js);
    });
    return carregandoLeaflet;
  }

  const zoomPara = (precisao) => (!Number.isFinite(precisao) || precisao <= 30 ? 18 : precisao <= 120 ? 17 : precisao <= 600 ? 15 : 13);

  /* ---------- Componente ---------- */

  const MENSAGENS = {
    inicial: 'Está no local? Toque no botão e o endereço se preenche sozinho. Depois é só conferir.',
    buscando: 'Procurando o sinal do GPS…',
    exata: () => 'Localização exata. Endereço preenchido, confira os campos.',
    boa: () => 'Localização boa. Confira o pino no mapa e ajuste se precisar.',
    aproximada: (p) => `Localização aproximada (±${Geo.formatarDistancia(p)}). Aguarde o GPS melhorar ou arraste o pino até o ponto exato.`,
    cidade: 'Cidade preenchida pela sua localização.',
    mapa: 'Ponto marcado por você no mapa. O endereço acompanha o pino.',
    cep: 'Endereço do CEP preenchido. Marque no mapa o ponto exato.',
    digitado: 'Achamos o endereço no mapa. Arraste o pino se o ponto não estiver certo.',
    tempo: 'Paramos de seguir o GPS para poupar bateria. Toque em "Atualizar" se você mudou de lugar.',
    pausado: 'Localização pausada. O último ponto foi mantido.',
    semEndereco: 'Guardamos o ponto exato, mas não achamos o endereço dele. Preencha os campos.',
    falhaEndereco: 'O ponto foi guardado, mas a busca do endereço falhou agora. Preencha os campos.',
    negado: 'Você não liberou a localização. Libere no cadeado ao lado do endereço do site ou preencha os campos abaixo.',
    indisponivel: 'Não deu para descobrir sua localização. Veja se o GPS está ligado ou preencha os campos abaixo.',
    demorando: 'O GPS está demorando. Perto de uma janela ou ao ar livre o sinal melhora.',
    semGps: 'Este navegador não informa a localização. Preencha os campos abaixo.',
    inseguro: 'A localização só funciona em endereço seguro (https ou localhost). Preencha os campos abaixo.',
    cepNaoExiste: 'Não encontramos esse CEP. Confira os números.',
    cepFalhou: 'Não conseguimos consultar o CEP agora. Preencha o endereço.',
  };

  class Localizador {
    constructor(raiz) {
      this.raiz = raiz;
      this.form = raiz.closest('form');
      this.modo = raiz.dataset.localizador || 'completo';
      this.comMapa = this.modo !== 'cidade';
      this.editados = new Set();
      this.seguindo = false;
      this.melhor = null;
      this.ultimoComEndereco = null;
      this.pendente = null;
      this.ocupado = false;
      this.montar();
      this.campos = this.definirCampos();
      this.ocultos = this.criarOcultos();
      this.ligarEventos();
      raiz.hidden = false;
    }

    montar() {
      const compacto = this.modo === 'compacto';
      this.raiz.classList.add(`localizador-${this.modo}`);
      this.raiz.innerHTML = `
        <div class="localizador-barra">
          <button type="button" class="botao ${compacto ? 'secundario' : 'primario'} pequeno localizador-botao" aria-pressed="false">
            <img src="img/icones/pin.svg" alt="" width="20" height="20" />
            <span>Usar minha localização</span>
          </button>
          <span class="localizador-precisao" title="Precisão do GPS: o ponto real está dentro deste raio" hidden></span>
        </div>
        <p class="localizador-status" role="status" aria-live="polite"></p>
        ${this.comMapa ? '<div class="localizador-mapa" hidden aria-label="Mapa: arraste o pino até o ponto exato"></div>' : ''}`;
      this.botao = this.raiz.querySelector('.localizador-botao');
      this.rotuloBotao = this.botao.querySelector('span');
      this.status = this.raiz.querySelector('.localizador-status');
      this.selo = this.raiz.querySelector('.localizador-precisao');
      this.caixaMapa = this.raiz.querySelector('.localizador-mapa');
      this.avisar('inicial', this.raiz.dataset.texto || (this.modo === 'cidade' ? 'Preenchemos a cidade pela sua localização, se você quiser.' : MENSAGENS.inicial));
    }

    campo(nome) {
      return this.form ? this.form.querySelector(`[name="${nome}"]`) : null;
    }

    definirCampos() {
      if (this.raiz.dataset.campos) return this.raiz.dataset.campos.split(',').map((s) => s.trim());
      if (this.modo === 'cidade') return ['cidade', this.campo('estado') ? 'estado' : 'uf'];
      return ['endereco', 'bairro', 'cidade', 'estado', 'cep'];
    }

    criarOcultos() {
      const nomes = ['latitude', 'longitude', 'precisao_m', 'origem_localizacao'];
      if (this.campos.includes('uf')) nomes.push('uf');
      const ocultos = {};
      for (const nome of nomes) {
        let el = this.form && this.form.querySelector(`input[type="hidden"][name="${nome}"]`);
        if (!el) {
          el = Object.assign(document.createElement('input'), { type: 'hidden', name: nome });
          this.raiz.append(el);
        }
        ocultos[nome] = el;
      }
      return ocultos;
    }

    ligarEventos() {
      this.botao.addEventListener('click', () => (this.seguindo ? this.parar('pausado') : this.iniciar()));
      if (!this.form) return;
      this.form.addEventListener('input', (e) => {
        if (e.isTrusted && this.campos.includes(e.target.name)) this.editados.add(e.target.name);
      });
      this.form.addEventListener('reset', () => setTimeout(() => this.limpar()));
      this.form.addEventListener('submit', () => this.parar());
      const cep = this.campo('cep');
      if (cep && this.campos.includes('cep')) cep.addEventListener('input', (e) => e.isTrusted && this.aoDigitarCep(cep));
      if (this.modo === 'completo') {
        for (const nome of ['endereco', 'bairro', 'cidade', 'estado']) {
          const el = this.campo(nome);
          if (el) el.addEventListener('change', (e) => e.isTrusted && this.aoDigitarEndereco());
        }
      }
      document.addEventListener('visibilitychange', () => document.hidden && this.seguindo && this.parar('pausado'));
    }

    /* ----- GPS ----- */

    iniciar() {
      if (!('geolocation' in navigator)) return this.avisar('erro', MENSAGENS.semGps);
      if (!window.isSecureContext) return this.avisar('erro', MENSAGENS.inseguro);
      this.editados.clear();
      this.melhor = null;
      this.seguindo = true;
      this.botao.setAttribute('aria-pressed', 'true');
      this.rotuloBotao.textContent = this.modo === 'cidade' ? 'Localizando…' : 'Parar';
      this.raiz.classList.add('ao-vivo');
      this.avisar('buscando', MENSAGENS.buscando);
      if (this.comMapa) this.prepararMapa();
      const opcoes = this.modo === 'cidade'
        ? { enableHighAccuracy: false, maximumAge: 10 * 60 * 1000, timeout: 15000 }
        : { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 };
      this.observador = navigator.geolocation.watchPosition((p) => this.aoReceber(p), (e) => this.aoFalhar(e), opcoes);
      clearTimeout(this.relogio);
      this.relogio = setTimeout(() => this.parar('tempo'), TEMPO_MAXIMO);
    }

    parar(motivo) {
      if (this.observador != null) navigator.geolocation.clearWatch(this.observador);
      this.observador = null;
      clearTimeout(this.relogio);
      const estava = this.seguindo;
      this.seguindo = false;
      this.raiz.classList.remove('ao-vivo');
      this.botao.setAttribute('aria-pressed', 'false');
      this.rotuloBotao.textContent = this.melhor || this.ocultos.latitude.value
        ? 'Atualizar'
        : 'Usar minha localização';
      if (estava && (motivo === 'tempo' || motivo === 'pausado')) this.avisar('pausado', MENSAGENS[motivo]);
    }

    aoReceber({ coords }) {
      const leitura = { latitude: coords.latitude, longitude: coords.longitude, precisao: Math.max(1, Math.round(coords.accuracy)) };
      const melhor = this.melhor;
      if (melhor) {
        const andou = Geo.distanciaMetros(melhor, leitura);
        // leitura pior sem a pessoa ter se mexido: é só oscilação do sinal
        if (leitura.precisao > melhor.precisao && andou < Math.max(melhor.precisao, ANDOU)) return;
      }
      if (!melhor) this.preencherAgora();
      this.melhor = leitura;
      this.definirPonto(leitura, 'gps');
      this.mostrarPrecisao(leitura.precisao);
      const nivel = Geo.qualidade(leitura.precisao);
      if (this.modo !== 'cidade' && nivel !== this.nivelAnunciado) {
        this.nivelAnunciado = nivel;
        this.avisar(nivel, MENSAGENS[nivel](leitura.precisao));
      }
      const ref = this.ultimoComEndereco;
      if (!ref || Geo.distanciaMetros(ref, leitura) > ANDOU || leitura.precisao < ref.precisao / 2) this.pedirEndereco(leitura);
    }

    aoFalhar(erro) {
      if (erro.code === erro.TIMEOUT) {
        if (!this.melhor) this.avisar('alerta', MENSAGENS.demorando);
        return; // o watchPosition continua tentando
      }
      // sinal que oscila no meio do caminho (túnel, prédio): mantém o último ponto e continua seguindo
      if (erro.code === erro.POSITION_UNAVAILABLE && this.melhor) return;
      this.parar('erro');
      this.avisar('erro', erro.code === erro.PERMISSION_DENIED ? MENSAGENS.negado : MENSAGENS.indisponivel);
    }

    mostrarPrecisao(precisao) {
      if (!this.selo) return;
      this.selo.hidden = !Number.isFinite(precisao);
      this.selo.dataset.nivel = Geo.qualidade(precisao);
      this.selo.textContent = Number.isFinite(precisao) ? `±${precisao < 1000 ? `${Math.round(precisao)} m` : Geo.formatarDistancia(precisao)}` : '';
    }

    /** Quem usa o GPS está no local agora: data e hora vazias ganham o momento atual. */
    preencherAgora() {
      const nomes = (this.raiz.dataset.agora || '').split(',').map((s) => s.trim()).filter(Boolean);
      const d = new Date();
      const dois = (n) => String(n).padStart(2, '0');
      const data = `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
      const hora = `${dois(d.getHours())}:${dois(d.getMinutes())}`;
      for (const nome of nomes) {
        const el = this.campo(nome);
        if (!el || el.value) continue;
        el.value = el.type === 'datetime-local' ? `${data}T${hora}` : el.type === 'time' ? hora : data;
        el.classList.add('preenchido-auto');
      }
    }

    /* ----- Endereço ----- */

    pedirEndereco(ponto) {
      this.pendente = ponto;
      if (!this.ocupado) this.processarFila();
    }

    async processarFila() {
      this.ocupado = true;
      while (this.pendente) {
        const ponto = this.pendente;
        this.pendente = null;
        this.ultimoComEndereco = ponto;
        try {
          const e = await fontes.ponto(ponto.latitude.toFixed(6), ponto.longitude.toFixed(6));
          if (this.pendente) continue; // já chegou um ponto mais novo
          if (!e) this.avisar('alerta', MENSAGENS.semEndereco);
          else {
            this.preencher(e);
            if (this.modo === 'cidade') {
              this.avisar('exata', MENSAGENS.cidade);
              this.parar('ok');
            } else if (ponto.origem === 'mapa') this.avisar('exata', MENSAGENS.mapa);
          }
        } catch (erro) {
          this.avisar('alerta', MENSAGENS.falhaEndereco);
        }
      }
      this.ocupado = false;
    }

    preencher(e, { respeitarEditados = true } = {}) {
      const valores = {
        endereco: Geo.linhaEndereco(e),
        bairro: e.bairro,
        cidade: e.cidade,
        estado: e.uf,
        uf: e.uf,
        cep: Geo.formatarCep(e.cep),
        onde: Geo.rotulo(e),
      };
      for (const nome of this.campos) {
        const el = nome === 'uf' ? this.ocultos.uf : this.campo(nome);
        const valor = valores[nome];
        if (!el || !valor || (respeitarEditados && this.editados.has(nome))) continue;
        if (el.tagName === 'SELECT' && ![...el.options].some((o) => o.value === valor)) continue;
        if (el.value === valor) continue;
        el.value = valor;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        if (el.type !== 'hidden') {
          el.classList.remove('preenchido-auto');
          void el.offsetWidth; // reinicia a animação
          el.classList.add('preenchido-auto');
        }
      }
    }

    async aoDigitarCep(campo) {
      const cep = Geo.normalizarCep(campo.value);
      if (!cep || cep === this.ultimoCep) return;
      this.ultimoCep = cep;
      this.avisar('buscando', 'Buscando o CEP…');
      try {
        const e = await fontes.cep(cep);
        if (Geo.normalizarCep(campo.value) !== cep) return;
        if (!e) return this.avisar('alerta', MENSAGENS.cepNaoExiste);
        this.preencher({ ...e, numero: null });
        const temPontoMelhor = ['gps', 'mapa'].includes(this.ocultos.origem_localizacao.value);
        if (Number.isFinite(e.latitude) && !temPontoMelhor) {
          this.definirPonto({ latitude: e.latitude, longitude: e.longitude, precisao: e.precisao_m }, 'cep');
        }
        this.avisar('boa', this.comMapa ? MENSAGENS.cep : 'Endereço do CEP preenchido.');
      } catch (erro) {
        this.avisar('alerta', MENSAGENS.cepFalhou);
      }
    }

    aoDigitarEndereco() {
      if (['gps', 'mapa'].includes(this.ocultos.origem_localizacao.value)) return;
      clearTimeout(this.esperaDigitacao);
      this.esperaDigitacao = setTimeout(async () => {
        const partes = Geo.separarEndereco(this.campo('endereco') && this.campo('endereco').value);
        const consulta = {
          logradouro: partes.logradouro,
          numero: partes.numero,
          bairro: this.campo('bairro') && this.campo('bairro').value,
          cidade: this.campo('cidade') && this.campo('cidade').value,
          uf: this.campo('estado') && this.campo('estado').value,
        };
        if (!consulta.cidade || (!consulta.logradouro && !consulta.bairro)) return;
        try {
          const ponto = await fontes.endereco(consulta);
          if (!ponto || ['gps', 'mapa'].includes(this.ocultos.origem_localizacao.value)) return;
          this.definirPonto({ latitude: ponto.latitude, longitude: ponto.longitude, precisao: ponto.precisao_m }, 'digitado');
          this.avisar('boa', MENSAGENS.digitado);
        } catch (erro) { /* sem ponto: o servidor tenta de novo ao salvar */ }
      }, 700);
    }

    /* ----- Mapa ----- */

    prepararMapa() {
      if (!this.comMapa) return Promise.resolve(null);
      if (!this.promessaMapa) {
        this.promessaMapa = carregarLeaflet().then((L) => {
          this.L = L;
          this.caixaMapa.hidden = false;
          const mapa = L.map(this.caixaMapa, { scrollWheelZoom: false }).setView(CENTRO_PADRAO, 12);
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          }).addTo(mapa);
          mapa.on('click', (ev) => this.ajustarNoMapa(ev.latlng));
          this.caixaMapa.hidden = !this.ocultos.latitude.value;
          this.mapa = mapa;
          return mapa;
        }).catch(() => {
          this.promessaMapa = null;
          this.raiz.classList.add('sem-mapa');
          return null;
        });
      }
      return this.promessaMapa;
    }

    async definirPonto(ponto, origem) {
      this.ocultos.latitude.value = ponto.latitude.toFixed(6);
      this.ocultos.longitude.value = ponto.longitude.toFixed(6);
      this.ocultos.precisao_m.value = Number.isFinite(ponto.precisao) ? String(Math.min(65535, Math.round(ponto.precisao))) : '';
      this.ocultos.origem_localizacao.value = origem;
      this.raiz.dataset.origem = origem;
      if (origem !== 'gps') this.mostrarPrecisao(origem === 'mapa' ? NaN : ponto.precisao);
      const mapa = await this.prepararMapa();
      if (!mapa) return;
      const L = this.L;
      const posicao = [ponto.latitude, ponto.longitude];
      const raio = Number.isFinite(ponto.precisao) ? ponto.precisao : 0;
      const primeiraVez = this.caixaMapa.hidden || !this.pino;
      this.caixaMapa.hidden = false;
      if (!this.pino) {
        this.pino = L.marker(posicao, {
          draggable: true,
          autoPan: true,
          title: 'Arraste até o ponto exato',
          icon: L.divIcon({ className: 'localizador-pino', html: '<span></span>', iconSize: [34, 40], iconAnchor: [17, 38] }),
        }).addTo(mapa);
        this.pino.on('dragend', () => this.ajustarNoMapa(this.pino.getLatLng()));
        this.circulo = L.circle(posicao, { radius: raio, color: '#00707b', weight: 1, fillColor: '#00c8da', fillOpacity: 0.15, interactive: false }).addTo(mapa);
      } else {
        this.pino.setLatLng(posicao);
        this.circulo.setLatLng(posicao);
        this.circulo.setRadius(raio);
      }
      if (primeiraVez) {
        mapa.invalidateSize();
        mapa.setView(posicao, zoomPara(ponto.precisao));
      } else if (origem !== 'mapa') {
        mapa.panTo(posicao, { animate: true });
      }
    }

    ajustarNoMapa(latlng) {
      if (this.seguindo) this.parar('manual');
      const ponto = { latitude: latlng.lat, longitude: latlng.lng, precisao: NaN, origem: 'mapa' };
      this.definirPonto(ponto, 'mapa');
      this.avisar('exata', MENSAGENS.mapa);
      this.pedirEndereco(ponto);
    }

    /* ----- Utilidades ----- */

    avisar(estado, texto) {
      this.raiz.dataset.estado = estado;
      if (this.status.textContent !== texto) this.status.textContent = texto;
    }

    limpar() {
      this.parar();
      for (const el of Object.values(this.ocultos)) el.value = '';
      delete this.raiz.dataset.origem;
      this.melhor = null;
      this.ultimoComEndereco = null;
      this.nivelAnunciado = null;
      this.ultimoCep = null;
      this.editados.clear();
      this.mostrarPrecisao(NaN);
      if (this.pino) { this.pino.remove(); this.circulo.remove(); this.pino = null; }
      if (this.caixaMapa) this.caixaMapa.hidden = true;
      this.rotuloBotao.textContent = 'Usar minha localização';
      this.avisar('inicial', this.raiz.dataset.texto || MENSAGENS.inicial);
    }
  }

  /* ---------- "Perto de mim" nas listas (adoção e mural) ---------- */

  function iniciarProximidade(raiz) {
    const url = new URL(location.href);
    const temPosicao = url.searchParams.has('lat') && url.searchParams.has('lon');
    raiz.hidden = false;
    raiz.classList.add('localizador-proximidade');
    raiz.innerHTML = `
      <button type="button" class="botao secundario pequeno localizador-botao">
        <img src="img/icones/pin.svg" alt="" width="20" height="20" />
        <span>${temPosicao ? 'Atualizar' : 'Perto de mim'}</span>
      </button>
      <p class="localizador-status" role="status" aria-live="polite"></p>`;
    const status = raiz.querySelector('.localizador-status');
    const botao = raiz.querySelector('button');
    if (temPosicao) {
      const limpo = new URL(url);
      ['lat', 'lon', 'distancia'].forEach((p) => limpo.searchParams.delete(p));
      limpo.hash = 'mural';
      const link = Object.assign(document.createElement('a'), { href: limpo.href, textContent: 'Ver sem distância' });
      status.append('Ordenado pela distância até você. ', link);
    }

    function localizar(distancia) {
      if (!comServidor()) {
        status.textContent = 'A ordem por distância funciona com o servidor ligado (veja o README).';
        return;
      }
      if (!('geolocation' in navigator) || !window.isSecureContext) {
        status.textContent = MENSAGENS[!('geolocation' in navigator) ? 'semGps' : 'inseguro'];
        return;
      }
      botao.disabled = true;
      status.textContent = 'Descobrindo onde você está…';
      navigator.geolocation.getCurrentPosition((p) => {
        const destino = new URL(location.href);
        destino.searchParams.set('lat', p.coords.latitude.toFixed(5));
        destino.searchParams.set('lon', p.coords.longitude.toFixed(5));
        if (distancia) destino.searchParams.set('distancia', distancia);
        else destino.searchParams.delete('distancia');
        destino.hash = 'mural';
        location.assign(destino.href);
      }, (erro) => {
        botao.disabled = false;
        status.textContent = erro.code === erro.PERMISSION_DENIED
          ? 'Você não liberou a localização. Libere no cadeado ao lado do endereço do site.'
          : 'Não deu para descobrir sua localização agora. Veja se o GPS está ligado.';
        const todas = document.querySelector('input[name="distancia"][id$="todas"]');
        if (todas) todas.checked = true;
      }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
    }

    botao.addEventListener('click', () => localizar(url.searchParams.get('distancia')));
    if (!temPosicao) {
      document.querySelectorAll('input[name="distancia"]').forEach((opcao) => {
        opcao.addEventListener('change', () => {
          const km = (opcao.id.match(/(\d+)$/) || [])[1];
          if (opcao.checked && km) localizar(km);
        });
      });
    }
  }

  function iniciar() {
    document.querySelectorAll('[data-localizador]').forEach((raiz) => {
      if (raiz.dataset.localizador === 'proximidade') iniciarProximidade(raiz);
      else raiz.localizador = new Localizador(raiz);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
