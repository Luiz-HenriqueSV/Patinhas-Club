// Gravação de endereços e cidades, e o cache de CEP.
const Geo = require('../../../Web/scripts/geo-nucleo.js');
const geo = require('./geocodificacao');
const { consulta } = require('../banco');
const { ErroValidacao, nomeProprio } = require('../util/validacao');

/**
 * Acha a cidade ou cria se ainda não existe. Sem a UF, procura pelo nome no
 * banco e, se não achar, pergunta ao mapa em que estado ela fica.
 */
async function idDaCidade(q, { cidade, uf, ibge = null }) {
  if (!cidade) throw new ErroValidacao({ cidade: 'Informe a cidade.' });
  let sigla = uf;
  if (!sigla) {
    const iguais = await q('SELECT id FROM cidades WHERE nome = ? LIMIT 2', [cidade]);
    if (iguais.length === 1) return iguais[0].id;
    const ponto = await geo.pontoDoEndereco({ cidade }).catch(() => null);
    sigla = ponto && ponto.uf;
    if (!sigla) throw new ErroValidacao({ cidade: 'Não achamos essa cidade. Confira o nome ou use sua localização.' });
  }
  const [estado] = await q('SELECT id FROM estados WHERE sigla = ?', [sigla]);
  if (!estado) throw new ErroValidacao({ estado: 'Escolha um estado válido.' });

  const nome = /[A-ZÀ-Ú]/.test(cidade) ? cidade : nomeProprio(cidade);
  await q('INSERT IGNORE INTO cidades (estado_id, nome, codigo_ibge) VALUES (?, ?, ?)', [estado.id, nome, ibge || null]);
  let [linha] = await q('SELECT id, codigo_ibge FROM cidades WHERE estado_id = ? AND nome = ?', [estado.id, nome]);
  if (!linha && ibge) [linha] = await q('SELECT id, codigo_ibge FROM cidades WHERE codigo_ibge = ?', [ibge]);
  if (!linha) throw new ErroValidacao({ cidade: 'Não foi possível registrar essa cidade.' });
  if (ibge && !linha.codigo_ibge) await q('UPDATE cidades SET codigo_ibge = ? WHERE id = ?', [ibge, linha.id]);
  return linha.id;
}

/**
 * Grava um endereço vindo de um formulário:
 *   { endereco: "Rua X, 123, perto da padaria", bairro, cidade, uf, cep, coordenadas }
 * "coordenadas" são os campos escondidos do localizador (GPS, pino do mapa ou CEP).
 */
async function criarEndereco(q, dados) {
  const partes = Geo.separarEndereco(dados.endereco);
  const cidadeId = await idDaCidade(q, { cidade: dados.cidade, uf: dados.uf, ibge: dados.ibge });
  const c = dados.coordenadas || null;
  const r = await q(
    `INSERT INTO enderecos (cidade_id, cep, logradouro, numero, bairro, referencia, latitude, longitude, precisao_m, origem)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [cidadeId, dados.cep || null, partes.logradouro, partes.numero, dados.bairro || null,
      partes.referencia ? partes.referencia.slice(0, 150) : null,
      c ? c.latitude : null, c ? c.longitude : null, c ? c.precisao_m : null, c ? c.origem : 'digitado'],
  );
  return { id: r.insertId, cidadeId, semCoordenadas: !c };
}

/**
 * Quem não usou o GPS também aparece na busca por distância: depois de responder
 * à pessoa, o servidor calcula as coordenadas pelo endereço digitado.
 */
function completarCoordenadas(enderecoId, dados) {
  const partes = Geo.separarEndereco(dados.endereco);
  geo.pontoDoEndereco({ logradouro: partes.logradouro, numero: partes.numero, bairro: dados.bairro, cidade: dados.cidade, uf: dados.uf })
    .then((p) => p && consulta(
      'UPDATE enderecos SET latitude = ?, longitude = ?, precisao_m = ?, origem = ? WHERE id = ? AND latitude IS NULL',
      [p.latitude, p.longitude, p.precisao_m, dados.cep ? 'cep' : 'digitado', enderecoId],
    ))
    .catch((erro) => console.warn(`[localização] endereço ${enderecoId} ficou sem coordenadas: ${erro.message}`));
}

/** CEP -> endereço, guardando a resposta da ViaCEP na tabela "ceps" por 180 dias. */
async function cepComCache(cep) {
  try {
    const [salvo] = await consulta(
      `SELECT c.cep, c.logradouro, c.complemento, c.bairro, c.latitude, c.longitude,
              ci.nome AS cidade, ci.codigo_ibge AS ibge, e.sigla AS uf
         FROM ceps c
         JOIN cidades ci ON ci.id = c.cidade_id
         JOIN estados e ON e.id = ci.estado_id
        WHERE c.cep = ? AND c.atualizado_em > NOW() - INTERVAL 180 DAY`,
      [cep],
    );
    if (salvo) return { ...salvo, precisao_m: salvo.latitude === null ? null : 150 };
  } catch (erro) {
    console.warn(`[localização] cache de CEP indisponível: ${erro.message}`);
  }
  const e = await geo.enderecoDoCep(cep);
  if (!e) return null;
  try {
    const cidadeId = await idDaCidade(consulta, { cidade: e.cidade, uf: e.uf, ibge: e.ibge });
    await consulta(
      'REPLACE INTO ceps (cep, cidade_id, logradouro, complemento, bairro, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [e.cep, cidadeId, e.logradouro, e.complemento, e.bairro, e.latitude ?? null, e.longitude ?? null],
    );
  } catch (erro) {
    console.warn(`[localização] não deu para guardar o CEP ${cep}: ${erro.message}`);
  }
  return e;
}

module.exports = { idDaCidade, criarEndereco, completarCoordenadas, cepComCache };
