// Adoção: pedido pelo cartão do animal, lista de espera e alertas.
const express = require('express');
const { consulta } = require('../banco');
const { leitor, idDaRota, ErroHttp, ErroValidacao } = require('../util/validacao');
const { concluir, exigir } = require('../util/resposta');
const { idDaCidade } = require('../servicos/enderecos');
const { notificar, enviarEmail } = require('../servicos/mensagens');
const { telefoneBr } = require('../util/html');

const rotas = express.Router();
const ABERTOS = "('enviado','em_analise','visita_agendada')";

/* ---------- Pedido de adoção (com ou sem conta) ---------- */

rotas.post('/api/animais/:id/pedidos', async (req, res) => {
  const animalId = idDaRota(req.params.id);
  const l = leitor(req.body);
  const d = {
    nome: l.texto('nome', { obrigatorio: true, max: 120 }),
    telefone: l.telefone('telefone', { obrigatorio: true }),
    email: l.email('email'),
    moradia: l.opcao('moradia', ['casa', 'casa-quintal', 'apartamento'], { obrigatorio: true }),
    outros: l.marcado('outros_animais'),
    mensagem: l.texto('mensagem', { max: 500, multilinha: true }),
  };
  if (!l.marcado('termo')) l.erro('termo', 'Para enviar, aceite o compromisso de adoção responsável.');
  l.validar();

  const [animal] = await consulta(
    `SELECT a.id, a.nome, a.ong_id, u.email AS email_ong
       FROM animais a JOIN ongs o ON o.usuario_id = a.ong_id JOIN usuarios u ON u.id = o.usuario_id
      WHERE a.id = ? AND a.status IN ('disponivel','em_processo') AND o.status_verificacao = 'verificada'`,
    [animalId],
  );
  if (!animal) throw new ErroHttp(404, 'Este animal não está mais disponível para adoção.');

  const sessao = req.session.usuario;
  const adotanteId = sessao && sessao.tipo === 'adotante' ? sessao.id : null;
  const [repetido] = await consulta(
    `SELECT id FROM pedidos_adocao WHERE animal_id = ? AND status_atual IN ${ABERTOS}
        AND (adotante_id = ? OR telefone = ?) LIMIT 1`,
    [animalId, adotanteId || 0, d.telefone],
  );
  if (repetido) {
    throw new ErroValidacao({ mensagem: 'Você já tem um pedido em andamento para este animal.' },
      `Você já enviou um pedido para ${animal.nome}. A ONG vai entrar em contato.`);
  }

  await consulta(
    `INSERT INTO pedidos_adocao (animal_id, adotante_id, nome, telefone, email, moradia, outros_animais, mensagem)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [animalId, adotanteId, d.nome, d.telefone, d.email, d.moradia, d.outros, d.mensagem],
  );
  const resumo = `${d.nome} quer adotar ${animal.nome}. Contato: ${telefoneBr(d.telefone)}${d.email ? `, ${d.email}` : ''}.`;
  notificar(animal.ong_id, 'pedido_adocao', `Novo pedido para ${animal.nome}`, resumo, 'painel-ong.html#pedidos');
  enviarEmail(animal.email_ong, `Novo pedido de adoção para ${animal.nome}`, `${resumo}\nVeja as respostas no painel da ONG.`);
  concluir(req, res, 'adocao.html#pedido-enviado');
});

/* ---------- Lista de espera ---------- */

rotas.post('/api/lista-de-espera', async (req, res) => {
  const l = leitor(req.body);
  const d = {
    especie: l.opcao('animal', ['cao', 'gato', 'outro'], { obrigatorio: true }),
    portes: l.opcoes('porte', ['pequeno', 'medio', 'grande']),
    idades: l.opcoes('idade', ['filhote', 'adulto', 'idoso']),
    sexo: l.opcao('sexo', ['tanto-faz', 'macho', 'femea'], { padrao: 'tanto-faz' }),
    cidade: l.texto('cidade', { obrigatorio: true, max: 100 }),
    uf: l.uf('uf'),
    especiais: l.marcado('aceita_especiais'),
    nome: l.texto('nome', { obrigatorio: true, max: 120 }),
    email: l.email('email', { obrigatorio: true }),
    telefone: l.telefone('telefone'),
    avisarPor: l.opcoes('avisar_por', ['email', 'whatsapp']),
  };
  if (!l.marcado('termos')) l.erro('termos', 'Aceite os termos para entrar na lista.');
  if (d.avisarPor.includes('whatsapp') && !d.telefone) l.erro('telefone', 'Para avisar pelo WhatsApp, informe o telefone.');
  l.validar();

  const cidadeId = await idDaCidade(consulta, { cidade: d.cidade, uf: d.uf });
  const sessao = req.session.usuario;
  await consulta(
    `INSERT INTO alertas_lista_espera (adotante_id, nome, email, telefone, especie_id, portes, idades, sexo, cidade_id,
                                       aceita_especiais, avisar_por)
     VALUES (?, ?, ?, ?, (SELECT id FROM especies WHERE codigo = ?), ?, ?, ?, ?, ?, ?)`,
    [sessao && sessao.tipo === 'adotante' ? sessao.id : null, d.nome, d.email, d.telefone, d.especie,
      d.portes.join(',') || null, d.idades.join(',') || null, d.sexo === 'tanto-faz' ? null : d.sexo, cidadeId,
      d.especiais, (d.avisarPor.length ? d.avisarPor : ['email']).join(',')],
  );
  concluir(req, res, 'lista_de_espera.html#inscricao-confirmada');
});

/* ---------- Pausar ou reativar um alerta (Minha conta) ---------- */

rotas.post('/api/alertas/:id/pausar', exigir('adotante'), async (req, res) => {
  const id = idDaRota(req.params.id);
  const [alerta] = await consulta('SELECT ativo FROM alertas_lista_espera WHERE id = ? AND adotante_id = ?', [id, req.session.usuario.id]);
  if (!alerta) throw new ErroHttp(404, 'Alerta não encontrado.');
  await consulta('UPDATE alertas_lista_espera SET ativo = NOT ativo WHERE id = ?', [id]);
  concluir(req, res, alerta.ativo ? 'minha-conta.html#alerta-pausado' : 'minha-conta.html#alertas');
});

module.exports = rotas;
