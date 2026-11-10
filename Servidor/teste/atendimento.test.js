// Testes do HTML do chat e do suporte (não precisam do banco).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const a = require('../src/modelos-atendimento');
const { LADOS } = require('../src/servicos/conversas');
const { hoje } = require('../src/util/validacao');

const dia = hoje();

test('mensagem com HTML vira texto e o "Visto" fica só na última mensagem minha já lida', () => {
  const lista = [
    { id: 1, autor: 'adotante', tipo: 'aviso', texto: 'Pedido de adoção da Mel enviado.', enviada_em: `${dia} 09:00:00` },
    { id: 2, autor: 'adotante', tipo: 'texto', texto: '<b>oi</b>', enviada_em: `${dia} 09:01:00` },
    { id: 3, autor: 'adotante', tipo: 'texto', texto: 'tudo bem?', enviada_em: `${dia} 09:02:00` },
    { id: 4, autor: 'ong', tipo: 'texto', texto: 'Oi!', enviada_em: `${dia} 09:05:00` },
  ];
  const html = a.mensagens(lista, LADOS.adotante, { vistoAte: 4, nomeOutro: 'ONG Amigos de Patas' });
  assert.match(html, /&lt;b&gt;oi&lt;\/b&gt;/);
  assert.doesNotMatch(html, /<b>oi<\/b>/);
  assert.equal((html.match(/ vista"/g) || []).length, 1);
  assert.match(html, /<li class="msg minha vista" data-id="3">/);
  assert.match(html, /<li class="msg aviso" data-id="1">/);
  assert.match(html, /<span>Hoje<\/span>/);
});

test('separador de dia aparece quando a data muda', () => {
  const lista = [
    { id: 1, autor: 'ong', tipo: 'texto', texto: 'a', enviada_em: '2026-01-05 10:00:00' },
    { id: 2, autor: 'ong', tipo: 'texto', texto: 'b', enviada_em: '2026-01-05 11:00:00' },
    { id: 3, autor: 'ong', tipo: 'texto', texto: 'c', enviada_em: '2026-01-06 10:00:00' },
  ];
  const html = a.mensagens(lista, LADOS.ong);
  assert.equal((html.match(/class="msg-dia"/g) || []).length, 2);
  assert.match(html, /05\/01\/2026/);
});

test('item da lista mostra "Você:" na prévia e o contador de não lidas', () => {
  const c = {
    id: 9, adotante_nome: 'Juliana Mendes', ong_nome: 'ONG Amigos de Patas', animal_nome: 'Churros',
    ultima_texto: 'Até sábado!', ultima_autor: 'ong', ultima_mensagem_em: `${dia} 18:35:00`, nao_lidas_adotante: 2, nao_lidas_ong: 0,
  };
  const paraAdotante = a.itemConversa(c, LADOS.adotante, false);
  assert.match(paraAdotante, /class="conversa-item nao-lida"/);
  assert.match(paraAdotante, /aria-label="2 não lidas">2</);
  assert.match(paraAdotante, /<small>Até sábado!<\/small>/);
  const paraOng = a.itemConversa(c, LADOS.ong, true);
  assert.match(paraOng, /<small>Você: Até sábado!<\/small>/);
  assert.match(paraOng, /aria-current="true"/);
  assert.match(paraOng, /<span class="contador" hidden>0<\/span>/);
});

test('chamado de suporte escapa o texto e mostra a situação', () => {
  const c = { protocolo: 'SUP-7K2M9QXA', assunto: '<script>x</script>', categoria: 'conta', status: 'respondido', criado_em: `${dia} 10:00:00` };
  const html = a.chamadoAberto(c, [{ autor: 'equipe', texto: 'Resposta', enviada_em: `${dia} 11:00:00` }]);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /class="etiqueta aprovado">Respondido/);
  assert.match(html, /action="\/api\/suporte\/chamados\/SUP-7K2M9QXA\/mensagens"/);
  assert.match(html, /Equipe Patinhas Club/);
});
