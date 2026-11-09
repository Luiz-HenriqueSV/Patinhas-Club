// API de localização usada pelo localizador (Web/scripts/localizacao.js).
//   GET /api/localizacao/reverso?lat=-23.68&lon=-46.62  coordenadas -> endereço
//   GET /api/localizacao/cep/09910720                   CEP -> endereço + coordenadas
//   GET /api/localizacao/buscar?logradouro=&numero=&bairro=&cidade=&uf=   endereço -> coordenadas
// Resposta: { "endereco": {...} } ou { "endereco": null } quando não há resultado.
const express = require('express');
const Geo = require('../../../Web/scripts/geo-nucleo.js');
const geo = require('../servicos/geocodificacao');
const { cepComCache } = require('../servicos/enderecos');
const { ErroHttp } = require('../util/validacao');

const rotas = express.Router();
const texto = (v) => Geo.limpar(Array.isArray(v) ? v[0] : v);

function coordenada(valor, limite) {
  const n = Number(texto(valor));
  return texto(valor) && Number.isFinite(n) && Math.abs(n) <= limite ? n : null;
}

rotas.get('/reverso', async (req, res) => {
  const lat = coordenada(req.query.lat, 90);
  const lon = coordenada(req.query.lon, 180);
  if (lat === null || lon === null) throw new ErroHttp(400, 'Coordenadas inválidas.');
  const endereco = await geo.enderecoDoPonto(lat, lon);
  res.set('Cache-Control', 'private, max-age=300').json({ endereco });
});

rotas.get('/cep/:cep', async (req, res) => {
  const cep = Geo.normalizarCep(req.params.cep);
  if (!cep) throw new ErroHttp(400, 'O CEP precisa ter 8 números.');
  const endereco = await cepComCache(cep);
  res.set('Cache-Control', 'public, max-age=86400').json({ endereco });
});

rotas.get('/buscar', async (req, res) => {
  const consulta = {
    logradouro: texto(req.query.logradouro),
    numero: texto(req.query.numero),
    bairro: texto(req.query.bairro),
    cidade: texto(req.query.cidade),
    uf: Geo.siglaUf(texto(req.query.uf)),
  };
  if (!consulta.cidade) throw new ErroHttp(400, 'Informe ao menos a cidade.');
  const endereco = await geo.pontoDoEndereco(consulta);
  res.set('Cache-Control', 'private, max-age=3600').json({ endereco });
});

module.exports = rotas;
