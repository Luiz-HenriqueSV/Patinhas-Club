// npm test — funções de localização usadas pelo navegador e pelo servidor
const test = require('node:test');
const assert = require('node:assert/strict');
const Geo = require('../../Web/scripts/geo-nucleo.js');

const NOMINATIM = {
  lat: '-23.6886', lon: '-46.6189', name: '',
  address: {
    house_number: '123', road: 'Rua Manoel da Nóbrega', suburb: 'Centro', city: 'Diadema',
    state: 'São Paulo', 'ISO3166-2-lvl4': 'BR-SP', postcode: '09910-720', country_code: 'br',
  },
};

test('CEP, UF e textos', () => {
  assert.equal(Geo.normalizarCep('09910-720'), '09910720');
  assert.equal(Geo.normalizarCep('0991'), null);
  assert.equal(Geo.formatarCep('09910720'), '09910-720');
  assert.equal(Geo.siglaUf('BR-SP'), 'SP');
  assert.equal(Geo.siglaUf('são paulo'), 'SP');
  assert.equal(Geo.siglaUf('XX'), null);
  assert.equal(Geo.comparavel('  São  Bernardo! '), 'sao bernardo');
});

test('mesma rua com abreviações', () => {
  assert.ok(Geo.mesmaRua('Av. Pres. Kennedy', 'Avenida Presidente Kennedy'));
  assert.ok(Geo.mesmaRua('R. Manoel da Nobrega', 'Rua Manoel da Nóbrega'));
  assert.ok(!Geo.mesmaRua('Rua das Flores', 'Rua das Palmeiras'));
});

test('separa rua, número e referência', () => {
  assert.deepEqual(Geo.separarEndereco('Rua Exemplo, 123, perto da padaria'), { logradouro: 'Rua Exemplo', numero: '123', referencia: 'perto da padaria' });
  assert.deepEqual(Geo.separarEndereco('Rua 25 de Março, 500'), { logradouro: 'Rua 25 de Março', numero: '500', referencia: null });
  assert.deepEqual(Geo.separarEndereco('Praça da Moça'), { logradouro: 'Praça da Moça', numero: null, referencia: null });
  assert.deepEqual(Geo.separarEndereco('Praça da Moça, perto do coreto'), { logradouro: 'Praça da Moça', numero: null, referencia: 'perto do coreto' });
});

test('converte a resposta do Nominatim', () => {
  const e = Geo.deNominatim(NOMINATIM);
  assert.equal(e.logradouro, 'Rua Manoel da Nóbrega');
  assert.equal(e.numero, '123');
  assert.equal(e.bairro, 'Centro');
  assert.equal(e.cidade, 'Diadema');
  assert.equal(e.uf, 'SP');
  assert.equal(e.cep, '09910720');
  assert.equal(Geo.deNominatim({ error: 'Unable to geocode' }), null);
});

test('escolhe o CEP do trecho certo da rua', () => {
  const lista = [
    { cep: '09910-000', logradouro: 'Avenida Alda', complemento: 'até 799/800', bairro: 'Centro', localidade: 'Diadema', uf: 'SP' },
    { cep: '09910-001', logradouro: 'Avenida Alda', complemento: 'de 801/802 ao fim', bairro: 'Centro', localidade: 'Diadema', uf: 'SP' },
  ];
  assert.equal(Geo.escolherCep(lista, { numero: '456' }).cep, '09910000');
  assert.equal(Geo.escolherCep(lista, { numero: '1500' }).cep, '09910001');
  assert.equal(Geo.cobreNumero('de 1001 a 1999 - lado ímpar', '1002'), false);
  assert.equal(Geo.cobreNumero('de 1001 a 1999 - lado ímpar', '1003'), true);
  assert.equal(Geo.cobreNumero(null, '10'), null);
});

test('Correios corrigem bairro e CEP quando a rua confere', () => {
  const osm = Geo.deNominatim(NOMINATIM);
  const correios = Geo.deViaCep({ cep: '09910-720', logradouro: 'Rua Manoel da Nóbrega', bairro: 'Centro', localidade: 'Diadema', uf: 'SP', ibge: '3513801' });
  const r = Geo.combinar(osm, correios);
  assert.equal(r.cep, '09910720');
  assert.equal(r.ibge, 3513801);
  const outraRua = Geo.deViaCep({ cep: '09910-999', logradouro: 'Rua Outra', bairro: 'Vila Nogueira', localidade: 'Diadema', uf: 'SP' });
  assert.equal(Geo.combinar(osm, outraRua).cep, null, 'CEP de outra rua é descartado');
});

test('fluxo completo coordenadas -> endereço com APIs simuladas', async () => {
  const urls = [];
  const buscar = async (url) => {
    urls.push(url);
    if (url.includes('/reverse')) return NOMINATIM;
    if (url.includes('09910720')) return { cep: '09910-720', logradouro: 'Rua Manoel da Nóbrega', bairro: 'Centro', localidade: 'Diadema', uf: 'SP', ibge: '3513801' };
    throw new Error(`URL inesperada: ${url}`);
  };
  const e = await Geo.enderecoDoPonto(-23.68861, -46.61893, buscar);
  assert.equal(Geo.rotulo(e), 'Rua Manoel da Nóbrega, 123 – Centro, Diadema/SP');
  assert.equal(e.latitude, -23.68861, 'mantém o ponto exato da pessoa, não o centro da rua');
  assert.equal(urls.length, 2);
});

test('distância e precisão', () => {
  const praca = { latitude: -23.6863, longitude: -46.6234 };
  const ong = { latitude: -23.6849, longitude: -46.6203 };
  const m = Geo.distanciaMetros(praca, ong);
  assert.ok(m > 300 && m < 400, `distância ${m}`);
  assert.equal(Geo.formatarDistancia(m), `${Math.round(m / 10) * 10} m`);
  assert.equal(Geo.formatarDistancia(1240), '1,2 km');
  assert.equal(Geo.qualidade(8), 'exata');
  assert.equal(Geo.qualidade(60), 'boa');
  assert.equal(Geo.qualidade(900), 'aproximada');
});

test('fila respeita 1 pedido por segundo', async () => {
  const fila = Geo.criarFila(200);
  const inicio = Date.now();
  const tempos = await Promise.all([1, 2, 3].map(() => fila(async () => Date.now() - inicio)));
  assert.ok(tempos[1] >= 190 && tempos[2] >= 390, tempos.join(','));
});
