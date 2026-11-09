// npm test — leitura dos formulários e modelos de HTML
const test = require('node:test');
const assert = require('node:assert/strict');
const { leitor, ErroValidacao, cpfValido, cnpjValido, normalizarTelefone, interpretarMeta } = require('../src/util/validacao');
const { esc, trocarBloco, iniciais, telefoneBr, horaCurta } = require('../src/util/html');
const m = require('../src/modelos');

test('documentos e telefone', () => {
  assert.ok(cpfValido('181.909.378-63'));
  assert.ok(!cpfValido('111.111.111-11'));
  assert.ok(cnpjValido('52.601.815/0001-20'));
  assert.ok(!cnpjValido('52.601.815/0001-21'));
  assert.equal(normalizarTelefone('(11) 99544-9612'), '11995449612');
  assert.equal(normalizarTelefone('+55 11 99544-9612'), '11995449612');
  assert.equal(normalizarTelefone('9954'), null);
});

test('leitor junta todos os erros de uma vez', () => {
  const l = leitor({ nome: '  Thor  ', telefone: '123', porte: 'gigante', saude: ['vacinado', 'hackeado'], data: '2026-02-30' });
  assert.equal(l.texto('nome', { obrigatorio: true }), 'Thor');
  l.telefone('telefone', { obrigatorio: true });
  l.opcao('porte', ['pequeno', 'medio', 'grande']);
  assert.deepEqual(l.opcoes('saude', ['vacinado', 'castrado']), ['vacinado']);
  l.data('data');
  l.email('email', { obrigatorio: true });
  assert.throws(() => l.validar(), (e) => e instanceof ErroValidacao
    && Object.keys(e.erros).sort().join() === 'data,email,porte,telefone');
});

test('coordenadas do localizador', () => {
  const ok = leitor({ latitude: '-23.686123456', longitude: '-46.6228', precisao_m: '8.6', origem_localizacao: 'gps' }).coordenadas();
  assert.deepEqual(ok, { latitude: -23.686123, longitude: -46.6228, precisao_m: 9, origem: 'gps' });
  assert.equal(leitor({ latitude: '200', longitude: '10' }).coordenadas(), null);
  assert.equal(leitor({}).coordenadas(), null);
});

test('textos de várias linhas mantêm as quebras', () => {
  const l = leitor({ como_ajudar: 'Passo 1\r\n\r\n\r\n  Passo   2  ' });
  assert.equal(l.texto('como_ajudar', { multilinha: true }), 'Passo 1\n\nPasso 2');
});

test('meta da campanha', () => {
  assert.deepEqual(interpretarMeta('500 kg de ração'), { valor: 500, unidade: 'kg' });
  assert.deepEqual(interpretarMeta('R$ 1.200,50'), { valor: 1200.5, unidade: 'R$' });
  assert.deepEqual(interpretarMeta('ajudar muito'), { valor: null, unidade: null });
});

test('HTML seguro e formatação', () => {
  assert.equal(esc('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');
  assert.equal(trocarBloco('a<!-- dados:x -->velho<!-- /dados:x -->b', 'x', 'novo'), 'a<!-- dados:x -->novo<!-- /dados:x -->b');
  assert.equal(iniciais('ONG Amigos de Patas'), 'AP');
  assert.equal(iniciais('Juliana Mendes'), 'JM');
  assert.equal(telefoneBr('11995449612'), '(11) 99544-9612');
  assert.equal(horaCurta('07:30:00'), '7h30');
});

test('cartão de adoção escapa o texto e marca os filtros', () => {
  const html = m.cartaoAnimal({
    id: 9, nome: '<b>Mel</b>', especie: 'gato', especie_nome: 'Gato', sexo: 'femea', porte: 'pequeno', faixa_etaria: 'adulto',
    idade_aproximada: '2 anos', historia: 'Tranquila.', saude: 'vacinado,castrado', convive: 'criancas', necessidades_especiais: 0,
    status: 'disponivel', ong_id: 3, ong_nome: 'Protetora Ana Souza', cidade: 'Diadema', uf: 'SP', distancia_m: 820, foto_url: null,
  }, 1);
  assert.ok(html.includes('&lt;b&gt;Mel&lt;/b&gt;') && !html.includes('<b>Mel</b>'));
  assert.ok(html.includes('data-distancia="1"') && html.includes('data-criancas'));
  assert.ok(html.includes('A 820 m de você') && html.includes('Vacinada') && html.includes('Adulta, 2 anos'));
  assert.ok(html.includes('action="/api/animais/9/pedidos"'));
  assert.ok(html.includes('img/sem-foto-gato.svg'));
});

test('pedido do adotante mostra a etapa atual', () => {
  const html = m.pedidoAdotante({ status_atual: 'visita_agendada', visita: '2026-11-08 15:00:00', animal: 'Mel', sexo: 'femea', especie: 'gato', ong_nome: 'Protetora Ana Souza', criado_em: '2026-10-30 10:00:00' });
  assert.ok(html.includes('<li class="agora">Visita em 08/11, às 15h</li>'));
  assert.ok(html.includes('Com a Protetora Ana Souza'));
});
