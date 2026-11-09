/*
 * Patinhas Club — núcleo de geolocalização
 * ------------------------------------------------------------
 * Funções puras usadas no navegador (localizacao.js) e no servidor
 * (Servidor/src/servicos/geocodificacao.js), para os dois lados
 * transformarem coordenadas em endereço do mesmo jeito.
 *
 * Fontes: Nominatim (OpenStreetMap) para coordenadas <-> endereço e
 * ViaCEP (Correios) para CEP, bairro e nome oficial da rua.
 */
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.PatinhasGeo = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const URLS = {
    nominatim: 'https://nominatim.openstreetmap.org',
    viacep: 'https://viacep.com.br/ws',
  };

  const UFS = {
    AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
    DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso',
    MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná',
    PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
    RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina',
    SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
  };

  /* ---------- Texto ---------- */

  const soDigitos = (v) => String(v ?? '').replace(/\D+/g, '');

  function limpar(v) {
    const s = String(v ?? '').replace(/\s+/g, ' ').trim();
    return s || null;
  }

  /** Minúsculas, sem acento e sem pontuação: "São  Paulo!" -> "sao paulo". */
  function comparavel(v) {
    return String(v ?? '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function normalizarCep(v) {
    const d = soDigitos(v);
    return d.length === 8 ? d : null;
  }

  function formatarCep(v) {
    const d = normalizarCep(v);
    return d ? `${d.slice(0, 5)}-${d.slice(5)}` : '';
  }

  /** Aceita "SP", "BR-SP" (código do OSM) ou "São Paulo". */
  function siglaUf(v) {
    if (!v) return null;
    const s = String(v).trim();
    const iso = s.match(/^BR-([A-Z]{2})$/i);
    if (iso) return UFS[iso[1].toUpperCase()] ? iso[1].toUpperCase() : null;
    if (/^[A-Za-z]{2}$/.test(s)) return UFS[s.toUpperCase()] ? s.toUpperCase() : null;
    const alvo = comparavel(s);
    for (const [sigla, nome] of Object.entries(UFS)) if (comparavel(nome) === alvo) return sigla;
    return null;
  }

  /* ---------- Ruas ---------- */

  const TIPOS_DE_RUA = /^(rua|r|avenida|av|travessa|tv|trav|alameda|al|praca|pca|estrada|est|rodovia|rod|viela|largo|lgo|via|passagem|vila|beco|ladeira|servidao)\b\s*/;
  const ABREVIACOES = {
    dr: 'doutor', prof: 'professor', profa: 'professora', sen: 'senador', dep: 'deputado',
    pres: 'presidente', gov: 'governador', cel: 'coronel', cap: 'capitao', gen: 'general',
    mal: 'marechal', ten: 'tenente', brig: 'brigadeiro', alm: 'almirante', eng: 'engenheiro',
    pe: 'padre', sta: 'santa', sto: 'santo', s: 'sao', n: 'nossa', sra: 'senhora', vig: 'vigario',
  };
  const PALAVRAS_VAZIAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

  /** "Av. Pres. Kennedy" e "Avenida Presidente Kennedy" viram "presidente kennedy". */
  function nucleoDaRua(v) {
    return comparavel(v).replace(TIPOS_DE_RUA, '')
      .split(' ').map((p) => ABREVIACOES[p] || p)
      .filter((p) => p && !PALAVRAS_VAZIAS.has(p)).join(' ');
  }

  function mesmaRua(a, b) {
    if (!a || !b) return false;
    const x = nucleoDaRua(a);
    const y = nucleoDaRua(b);
    return Boolean(x) && x === y;
  }

  /** Nome da rua sem o tipo, para a busca por logradouro da ViaCEP. */
  function semTipoDeRua(v) {
    const s = limpar(v) || '';
    const semTipo = s.replace(/^(rua|r\.|avenida|av\.?|travessa|tv\.?|alameda|al\.?|praça|praca|estrada|rodovia|viela|largo)\s+/i, '');
    return semTipo.length >= 3 ? semTipo : s;
  }

  /**
   * "Rua Exemplo, 123, perto da padaria" -> { logradouro: "Rua Exemplo", numero: "123", referencia: "perto da padaria" }
   * Quando não há número, tudo depois da primeira vírgula vira referência.
   */
  function separarEndereco(texto) {
    const t = limpar(texto);
    if (!t) return { logradouro: null, numero: null, referencia: null };
    const m = t.match(/^(.+?),?\s+(?:n[º°o.]?\s*)?(\d{1,6}[A-Za-z]?)(?:\s*[,;–-]\s*(.+))?$/);
    if (m && /[A-Za-zÀ-ú]{3}/.test(m[1])) {
      return { logradouro: m[1].replace(/,\s*$/, '').trim(), numero: m[2], referencia: limpar(m[3]) };
    }
    const [rua, ...resto] = t.split(',');
    return { logradouro: limpar(rua), numero: null, referencia: limpar(resto.join(',')) };
  }

  /* ---------- Conversão das respostas das APIs ---------- */

  /** Resposta do Nominatim (/reverse ou um item do /search) -> endereço do Patinhas. */
  function deNominatim(j) {
    if (!j || j.error || j.lat === undefined) return null;
    const a = j.address || {};
    const logradouro = limpar(a.road || a.pedestrian || a.footway || a.residential || a.path || a.cycleway);
    const nome = limpar(j.name);
    return {
      logradouro,
      numero: limpar(a.house_number),
      bairro: limpar(a.suburb || a.neighbourhood || a.quarter || a.city_district || a.district || a.borough || a.hamlet),
      cidade: limpar(a.city || a.town || a.village || a.municipality || a.county),
      uf: siglaUf(a['ISO3166-2-lvl4']) || siglaUf(a.state),
      cep: normalizarCep(a.postcode),
      referencia: nome && nome !== logradouro ? nome : null,
      latitude: Number(j.lat),
      longitude: Number(j.lon),
    };
  }

  /** Resposta da ViaCEP -> endereço do Patinhas (ou null se o CEP não existe). */
  function deViaCep(j) {
    if (!j || j.erro === true || j.erro === 'true' || !j.cep) return null;
    return {
      cep: normalizarCep(j.cep),
      logradouro: limpar(j.logradouro),
      complemento: limpar(j.complemento),
      bairro: limpar(j.bairro),
      cidade: limpar(j.localidade),
      uf: siglaUf(j.uf),
      ibge: Number(j.ibge) || null,
    };
  }

  /**
   * Ruas longas têm um CEP por trecho ("de 801/802 ao fim", "até 1199 - lado ímpar").
   * Devolve true/false se o complemento diz algo sobre o número, ou null se não diz.
   */
  function cobreNumero(complemento, numero) {
    const n = parseInt(numero, 10);
    if (!complemento || !Number.isFinite(n)) return null;
    const c = comparavel(complemento);
    const par = n % 2 === 0;
    if (c.includes('lado impar') && par) return false;
    if (c.includes('lado par') && !par) return false;
    const limite = (a, b) => (b !== undefined && par ? Number(b) : Number(a));
    let m = c.match(/\bde (\d+)(?: (\d+))? (?:a|ate) (\d+)(?: (\d+))?/);
    if (m) return n >= limite(m[1], m[2]) && n <= limite(m[3], m[4]);
    m = c.match(/\bde (\d+)(?: (\d+))? ao fim/);
    if (m) return n >= limite(m[1], m[2]);
    m = c.match(/\bate (\d+)(?: (\d+))?/);
    if (m) return n <= limite(m[1], m[2]);
    if (c.includes('lado impar') || c.includes('lado par')) return true;
    return null;
  }

  /** Entre os CEPs de uma rua (busca da ViaCEP), escolhe o que cobre o número da casa. */
  function escolherCep(lista, { numero, bairro } = {}) {
    const opcoes = (Array.isArray(lista) ? lista : []).map(deViaCep).filter(Boolean);
    if (opcoes.length <= 1) return opcoes[0] || null;
    const doBairro = bairro ? opcoes.filter((o) => comparavel(o.bairro) === comparavel(bairro)) : [];
    const base = doBairro.length ? doBairro : opcoes;
    return base.find((o) => cobreNumero(o.complemento, numero) === true)
      || base.find((o) => cobreNumero(o.complemento, numero) === null)
      || base[0];
  }

  /**
   * Junta o endereço do mapa (OSM) com o dos Correios. Os Correios têm o CEP, o bairro
   * e o nome oficial da rua; o mapa tem o número e as coordenadas.
   */
  function combinar(osm, correios) {
    if (!osm) return correios ? { ...correios } : null;
    const r = { ...osm, ibge: null };
    if (!correios) return r;
    const mesmaCidade = !r.cidade || comparavel(correios.cidade) === comparavel(r.cidade);
    if (!mesmaCidade) return r;
    const ruaConfere = !correios.logradouro || !r.logradouro || mesmaRua(r.logradouro, correios.logradouro);
    if (ruaConfere) {
      r.cep = correios.cep || r.cep;
      if (correios.logradouro) r.logradouro = correios.logradouro;
      if (correios.bairro) r.bairro = correios.bairro;
    } else {
      r.cep = null; // o CEP do mapa era de outra rua
    }
    r.cidade = correios.cidade || r.cidade;
    r.uf = correios.uf || r.uf;
    r.ibge = correios.ibge || null;
    return r;
  }

  /* ---------- Textos para a tela ---------- */

  /** "Rua Manoel da Nóbrega, 123" */
  function linhaEndereco(e) {
    if (!e) return '';
    return [e.logradouro, e.numero].filter(Boolean).join(', ') || e.referencia || '';
  }

  /** "Rua Manoel da Nóbrega, 123 – Centro, Diadema/SP" */
  function rotulo(e) {
    if (!e) return '';
    const cidade = e.cidade ? e.cidade + (e.uf ? `/${e.uf}` : '') : '';
    const local = [e.bairro, cidade].filter(Boolean).join(', ');
    return [linhaEndereco(e), local].filter(Boolean).join(' – ');
  }

  /* ---------- Distância e precisão ---------- */

  /** Distância em metros entre dois pontos { latitude, longitude } (fórmula de Haversine). */
  function distanciaMetros(a, b) {
    const raio = 6371008.8;
    const rad = Math.PI / 180;
    const dLat = (b.latitude - a.latitude) * rad;
    const dLon = (b.longitude - a.longitude) * rad;
    const h = Math.sin(dLat / 2) ** 2
      + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * raio * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  /** 830 -> "830 m"; 1240 -> "1,2 km"; 15400 -> "15 km" */
  function formatarDistancia(m) {
    if (!Number.isFinite(m)) return '';
    if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
    const km = m / 1000;
    return `${km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km)} km`;
  }

  /** Classifica o raio de incerteza do GPS. */
  function qualidade(precisao) {
    if (!Number.isFinite(precisao)) return 'desconhecida';
    if (precisao <= 20) return 'exata';
    if (precisao <= 100) return 'boa';
    return 'aproximada';
  }

  /* ---------- URLs ---------- */

  function urlReverso(lat, lon) {
    const p = new URLSearchParams({
      format: 'jsonv2', addressdetails: '1', zoom: '18', 'accept-language': 'pt-BR',
      lat: Number(lat).toFixed(5), lon: Number(lon).toFixed(5),
    });
    return `${URLS.nominatim}/reverse?${p}`;
  }

  function urlBusca(campos) {
    const p = new URLSearchParams({
      format: 'jsonv2', addressdetails: '1', limit: '1', countrycodes: 'br', 'accept-language': 'pt-BR',
    });
    for (const [chave, valor] of Object.entries(campos)) if (valor) p.set(chave, valor);
    return `${URLS.nominatim}/search?${p}`;
  }

  const urlViaCep = (cep) => `${URLS.viacep}/${normalizarCep(cep)}/json/`;
  const urlViaCepRua = (uf, cidade, rua) =>
    `${URLS.viacep}/${uf}/${encodeURIComponent(cidade)}/${encodeURIComponent(semTipoDeRua(rua))}/json/`;

  /** Fila que respeita o limite de 1 pedido por segundo do Nominatim. */
  function criarFila(intervaloMs) {
    let proxima = 0;
    let cadeia = Promise.resolve();
    return function agendar(tarefa) {
      const vez = cadeia.then(async () => {
        const espera = proxima - Date.now();
        if (espera > 0) await new Promise((ok) => setTimeout(ok, espera));
        proxima = Date.now() + intervaloMs;
        return tarefa();
      });
      cadeia = vez.catch(() => {});
      return vez;
    };
  }

  /* ---------- Fluxos completos (buscar = função que recebe uma URL e devolve o JSON) ---------- */

  /** Coordenadas -> endereço completo, conferido com os Correios. */
  async function enderecoDoPonto(lat, lon, buscar) {
    const osm = deNominatim(await buscar(urlReverso(lat, lon)));
    if (!osm) return null;
    osm.latitude = Number(lat);
    osm.longitude = Number(lon);
    let correios = null;
    if (osm.cep) correios = deViaCep(await buscar(urlViaCep(osm.cep)).catch(() => null));
    const ruaDoCep = correios && correios.logradouro;
    if ((!correios || (ruaDoCep && !mesmaRua(ruaDoCep, osm.logradouro)))
        && osm.uf && osm.cidade && osm.logradouro && osm.logradouro.length >= 3) {
      const lista = await buscar(urlViaCepRua(osm.uf, osm.cidade, osm.logradouro)).catch(() => null);
      correios = escolherCep(lista, osm) || correios;
    }
    return combinar(osm, correios);
  }

  /** Endereço -> coordenadas. Tenta a rua, depois o bairro e por fim a cidade. */
  async function pontoDoEndereco(e, buscar) {
    const estado = e.uf ? UFS[e.uf] : undefined;
    const tentativas = [];
    if (e.logradouro && e.cidade) {
      tentativas.push([{ street: [e.numero, e.logradouro].filter(Boolean).join(' '), city: e.cidade, state: estado, country: 'Brasil' }, e.numero ? 30 : 150]);
    }
    if (e.bairro && e.cidade) tentativas.push([{ q: [e.bairro, e.cidade, estado, 'Brasil'].filter(Boolean).join(', ') }, 800]);
    if (e.cidade) tentativas.push([{ city: e.cidade, state: estado, country: 'Brasil' }, 5000]);
    for (const [campos, precisao] of tentativas) {
      const lista = await buscar(urlBusca(campos)).catch(() => null);
      const achado = Array.isArray(lista) && lista[0] ? deNominatim(lista[0]) : null;
      if (achado && (!e.uf || !achado.uf || achado.uf === e.uf)) {
        return { latitude: achado.latitude, longitude: achado.longitude, precisao_m: precisao, uf: achado.uf, cidade: achado.cidade };
      }
    }
    return null;
  }

  /** CEP -> endereço dos Correios + coordenadas aproximadas da rua. */
  async function enderecoDoCep(cep, buscar) {
    if (!normalizarCep(cep)) return null;
    const correios = deViaCep(await buscar(urlViaCep(cep)));
    if (!correios) return null;
    const ponto = await pontoDoEndereco(correios, buscar).catch(() => null);
    return ponto ? { ...correios, latitude: ponto.latitude, longitude: ponto.longitude, precisao_m: ponto.precisao_m } : correios;
  }

  return {
    URLS, UFS,
    soDigitos, limpar, comparavel, normalizarCep, formatarCep, siglaUf,
    mesmaRua, semTipoDeRua, separarEndereco,
    deNominatim, deViaCep, cobreNumero, escolherCep, combinar,
    linhaEndereco, rotulo, distanciaMetros, formatarDistancia, qualidade,
    urlReverso, urlBusca, urlViaCep, urlViaCepRua, criarFila,
    enderecoDoPonto, pontoDoEndereco, enderecoDoCep,
  };
});
