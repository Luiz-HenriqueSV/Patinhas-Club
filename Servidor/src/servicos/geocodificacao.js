// Endereço <-> coordenadas pelo servidor: mesma lógica do navegador (geo-nucleo.js),
// mais cache em memória, fila de 1 pedido por segundo e identificação no User-Agent,
// como pede a política de uso do OpenStreetMap.
const Geo = require('../../../Web/scripts/geo-nucleo.js');
const config = require('../config');

const AGENTE = `PatinhasClub/1.0 (projeto integrador Fatec Diadema${config.contato ? `; ${config.contato}` : ''})`;
const filaNominatim = Geo.criarFila(1100);
const cache = new Map();
const LIMITE_CACHE = 2000;

async function buscar(url) {
  if (cache.has(url)) {
    const valor = cache.get(url);
    cache.delete(url); // renova a posição (o mais antigo sai primeiro)
    cache.set(url, valor);
    return valor;
  }
  const pedir = async () => {
    const resposta = await fetch(url, {
      headers: { 'User-Agent': AGENTE, Accept: 'application/json', 'Accept-Language': 'pt-BR' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resposta.ok) {
      throw Object.assign(new Error(`${new URL(url).host} respondeu ${resposta.status}`), { status: 502 });
    }
    return resposta.json();
  };
  const json = url.startsWith(Geo.URLS.nominatim) ? await filaNominatim(pedir) : await pedir();
  cache.set(url, json);
  if (cache.size > LIMITE_CACHE) cache.delete(cache.keys().next().value);
  return json;
}

const comoErro502 = (erro) => {
  if (!erro.status) erro.status = 502;
  throw erro;
};

module.exports = {
  buscar,
  enderecoDoPonto: (lat, lon) => Geo.enderecoDoPonto(lat, lon, buscar).catch(comoErro502),
  enderecoDoCep: (cep) => Geo.enderecoDoCep(cep, buscar).catch(comoErro502),
  pontoDoEndereco: (e) => Geo.pontoDoEndereco(e, buscar).catch(comoErro502),
};
