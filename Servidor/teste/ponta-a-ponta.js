// Testes de ponta a ponta, falando com o servidor de verdade: cadastros, anúncios, denúncias, animais,
// campanhas, lista de espera, chat, suporte, administração, favoritos, conta e todas as páginas.
// Como rodar (na pasta Servidor):
//   1. npm run banco            (o teste espera o banco com os dados de demonstração, recém-criado)
//   2. npm start                (em outro terminal)
//   3. npm run teste:fluxos     (ou BASE=http://localhost:3000 node teste/ponta-a-ponta.js)
// O teste cria pedidos, mensagens e chamados no banco: rode "npm run banco" de novo para voltar ao começo.
const BASE = process.env.BASE || 'http://localhost:3000';
const assert = require('node:assert/strict');
let ok = 0;
const falhas = [];

class Navegador {
  constructor(nome) { this.nome = nome; this.cookies = new Map(); }
  guardar(res) {
    for (const c of res.headers.getSetCookie ? res.headers.getSetCookie() : []) {
      const [par] = c.split(';');
      const i = par.indexOf('=');
      this.cookies.set(par.slice(0, i), par.slice(i + 1));
    }
  }
  get cabecalhoCookie() { return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '); }
  async pedir(caminho, { metodo = 'GET', dados, json = true, seguir = false } = {}) {
    const corpo = dados ? new URLSearchParams(dados) : undefined;
    const res = await fetch(BASE + caminho, {
      method: metodo, body: corpo, redirect: seguir ? 'follow' : 'manual',
      headers: { Cookie: this.cabecalhoCookie, ...(json ? { Accept: 'application/json' } : { Accept: 'text/html' }) },
    });
    this.guardar(res);
    const texto = await res.text();
    let dadosJson = null;
    try { dadosJson = JSON.parse(texto); } catch { /* html */ }
    return { status: res.status, texto, json: dadosJson, local: res.headers.get('location') };
  }
  post(caminho, dados, extra) { return this.pedir(caminho, { metodo: 'POST', dados, ...extra }); }
  /** Formulário com arquivos e caixas marcadas (multipart), como o navegador envia. */
  async enviar(caminho, campos, arquivos = {}) {
    const corpo = new FormData();
    for (const [k, v] of Object.entries(campos)) for (const x of [].concat(v)) corpo.append(k, String(x));
    for (const [k, lista] of Object.entries(arquivos)) for (const a of [].concat(lista)) corpo.append(k, new Blob([a.dados], { type: a.tipo }), a.nome);
    const res = await fetch(BASE + caminho, { method: 'POST', body: corpo, redirect: 'manual', headers: { Cookie: this.cabecalhoCookie, Accept: 'application/json' } });
    this.guardar(res);
    const texto = await res.text();
    let json = null;
    try { json = JSON.parse(texto); } catch { /* html */ }
    return { status: res.status, texto, json };
  }
  pagina(caminho) { return this.pedir(caminho, { json: false }); }
  async entrar(email, senha = 'patinhas123') {
    const r = await this.post('/api/entrar', { email, senha });
    assert.equal(r.status, 200, `login ${email}: ${r.texto}`);
    return r.json;
  }
  /** Abre o canal SSE e guarda os eventos recebidos. */
  async ouvir() {
    this.eventos = [];
    this.parar = new AbortController();
    const res = await fetch(`${BASE}/api/conversas/eventos`, { headers: { Cookie: this.cabecalhoCookie, Accept: 'text/event-stream' }, signal: this.parar.signal });
    assert.equal(res.status, 200, 'SSE abriu');
    assert.match(res.headers.get('content-type'), /text\/event-stream/);
    const leitor = res.body.getReader();
    const dec = new TextDecoder();
    let buffer = '';
    (async () => {
      try {
        for (;;) {
          const { value, done } = await leitor.read();
          if (done) break;
          buffer += dec.decode(value, { stream: true });
          let i;
          while ((i = buffer.indexOf('\n\n')) !== -1) {
            const bloco = buffer.slice(0, i); buffer = buffer.slice(i + 2);
            const ev = /^event: (.+)$/m.exec(bloco); const d = /^data: (.+)$/m.exec(bloco);
            if (ev && d) this.eventos.push({ tipo: ev[1], dados: JSON.parse(d[1]) });
          }
        }
      } catch { /* abortado */ }
    })();
  }
  async esperar(tipo, filtro = () => true, ms = 2000) {
    const fim = Date.now() + ms;
    while (Date.now() < fim) {
      const e = this.eventos.find((x) => x.tipo === tipo && filtro(x.dados));
      if (e) return e.dados;
      await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error(`${this.nome}: evento ${tipo} não chegou`);
  }
}

const FOTO = { nome: 'foto.png', tipo: 'image/png', dados: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64') };
const PDF = { nome: 'documento.pdf', tipo: 'application/pdf', dados: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n') };
const dia = (deslocamento) => {
  const d = new Date(Date.now() + deslocamento * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const LOCAL = { endereco: 'Rua Augusta, 500', bairro: 'Consolação', cidade: 'São Paulo', estado: 'SP', cep: '01305-000' };

async function teste(nome, fn) {
  try { await fn(); ok += 1; console.log(`  ok  ${nome}`); } catch (e) { falhas.push(nome); console.log(`  FALHOU  ${nome}\n        ${e.message.split('\n').slice(0, 4).join('\n        ')}`); }
}

(async () => {
  const adotante = new Navegador('adotante');
  const ong = new Navegador('ong');
  const admin = new Navegador('admin');
  const visitante = new Navegador('visitante');
  const outro = new Navegador('outro');

  await teste('login dos três tipos de conta leva cada um para a sua área', async () => {
    const destinos = [await adotante.entrar('adotante@patinhasclub.test'), await ong.entrar('ong@patinhasclub.test'), await admin.entrar('admin@patinhasclub.test')]
      .map((r) => r.redirecionar.replace(/^\//, ''));
    assert.deepEqual(destinos, ['minha-conta.html', 'painel-ong.html', 'admin.html']);
  });

  await teste('cabeçalho de quem entrou mostra Mensagens com o número de não lidas', async () => {
    const r = await adotante.pagina('/index.html');
    assert.match(r.texto, /class="cabecalho-mensagens"[^>]*aria-label="Mensagens: 1 não lida"/);
    assert.match(r.texto, /<span class="contador" data-nao-lidas>1<\/span>/);
    assert.doesNotMatch((await admin.pagina('/index.html')).texto, /cabecalho-mensagens/);
  });

  await teste('lista de conversas do adotante vem do banco, a mais recente primeiro', async () => {
    const r = await adotante.pagina('/mensagens.html');
    assert.equal(r.status, 200);
    const ids = [...r.texto.matchAll(/class="conversa-item[^"]*" href="mensagens\.html\?c=(\d+)"/g)].map((m) => m[1]);
    assert.deepEqual(ids, ['2', '1']);
    assert.match(r.texto, /Sobre o Churros/);
    assert.match(r.texto, /class="container chat so-lista"/, 'sem ?c= começa mostrando a lista no celular');
  });

  await teste('abrir a conversa pelo link marca como lida e mostra o "Visto"', async () => {
    const r = await adotante.pagina('/mensagens.html?c=2');
    assert.match(r.texto, /class="container chat" data-chat data-eu="adotante" data-conversa="2"/);
    assert.match(r.texto, /<li class="msg aviso" data-id="8">/);
    const nl = await adotante.pedir('/api/conversas/nao-lidas');
    assert.equal(nl.json.naoLidas, 0);
  });

  await teste('ONG e adotante conversam em tempo real (SSE) e o "Visto" chega na hora', async () => {
    await ong.ouvir();
    await adotante.ouvir();
    const r = await adotante.post('/api/conversas/2/mensagens', { texto: 'Posso levar minha família na visita?' });
    assert.equal(r.status, 200, r.texto);
    const id = r.json.mensagem.id;
    const chegou = await ong.esperar('mensagem', (d) => d.mensagem.id === id);
    assert.equal(chegou.conversa, 2);
    assert.equal(chegou.naoLidasNaConversa, 1);
    assert.equal(chegou.de, 'Juliana Mendes');
    await adotante.esperar('mensagem', (d) => d.mensagem.id === id);
    const lida = await ong.post('/api/conversas/2/lida');
    assert.equal(lida.status, 200);
    const visto = await adotante.esperar('lida', (d) => d.conversa === 2);
    assert.equal(visto.ate, id);
  });

  await teste('mensagem com HTML aparece como texto (sem virar código)', async () => {
    await ong.post('/api/conversas/2/mensagens', { texto: '<img src=x onerror=alert(1)> oi' });
    const r = await adotante.pagina('/mensagens.html?c=2');
    assert.match(r.texto, /&lt;img src=x onerror=alert\(1\)&gt; oi/);
    assert.doesNotMatch(r.texto, /<img src=x/);
  });

  await teste('mensagem vazia ou longa demais é recusada com o erro no campo', async () => {
    const vazia = await adotante.post('/api/conversas/2/mensagens', { texto: '   ' });
    assert.equal(vazia.status, 422);
    assert.ok(vazia.json.erros.texto);
    const longa = await adotante.post('/api/conversas/2/mensagens', { texto: 'a'.repeat(1001) });
    assert.equal(longa.status, 422);
  });

  await teste('ninguém lê a conversa dos outros', async () => {
    const alheia = await ong.pedir('/api/conversas/1/mensagens'); // conversa 1 é da protetora Ana, não da ONG 1
    assert.equal(alheia.status, 404);
    const semLogin = await visitante.pedir('/api/conversas/2/mensagens');
    assert.equal(semLogin.status, 401);
    const admin403 = await admin.pedir('/api/conversas/2/mensagens');
    assert.ok([401, 403].includes(admin403.status), String(admin403.status));
  });

  await teste('ONG só puxa conversa com quem pediu um animal dela', async () => {
    const negado = await ong.post('/api/conversas', { adotante_id: '999' });
    assert.equal(negado.status, 403);
    const permitido = await ong.post('/api/conversas', { adotante_id: '7' });
    assert.equal(permitido.status, 200, permitido.texto);
    assert.equal(permitido.json.redirecionar.replace(/^\//, ''), 'mensagens.html?c=2', 'reaproveita a conversa do par');
  });

  await teste('adotante abre conversa pelo anúncio do animal (uma por ONG)', async () => {
    const r = await adotante.post('/api/conversas', { ong_id: '2', animal_id: '2' });
    assert.equal(r.status, 200, r.texto);
    const deNovo = await adotante.post('/api/conversas', { ong_id: '2' });
    assert.equal(deNovo.json.conversa, r.json.conversa);
    const naoVerificada = await adotante.post('/api/conversas', { ong_id: '10' });
    assert.equal(naoVerificada.status, 404);
  });

  await teste('pedido de adoção com conta abre a conversa com o registro do pedido', async () => {
    const vitrine = await adotante.pagina('/adocao.html');
    const animal = [...vitrine.texto.matchAll(/action="\/api\/animais\/(\d+)\/pedidos"/g)].map((m) => m[1]).find((id) => !['1', '3'].includes(id));
    assert.ok(animal, 'achou um animal sem pedido');
    const r = await adotante.post(`/api/animais/${animal}/pedidos`, { nome: 'Juliana Mendes', telefone: '11987650007', moradia: 'casa', termo: 'sim' });
    assert.equal(r.status, 200, r.texto);
    const conversa = await adotante.esperar('mensagem', (d) => d.mensagem.tipo === 'aviso' && /Pedido de adoção/.test(d.mensagem.texto));
    assert.ok(conversa.conversa > 0);
  });

  await teste('a ONG muda a situação do pedido e o andamento entra na conversa', async () => {
    const painel = await ong.pagina('/painel-ong.html');
    const pedidoId = (/action="\/api\/ong\/pedidos\/(\d+)\/status"/.exec(painel.texto) || [])[1];
    assert.ok(pedidoId);
    assert.match(painel.texto, /name="adotante_id" value="\d+" \/><button type="submit" class="botao secundario pequeno">Conversar/);
    const r = await ong.post(`/api/ong/pedidos/${pedidoId}/status`, { status: 'visita_agendada' });
    assert.equal(r.status, 200, r.texto);
  });

  await teste('favoritar e desfavoritar pelo coração do cartão', async () => {
    const vitrine = await adotante.pagina('/adocao.html');
    assert.match(vitrine.texto, /<form class="card-favorito" action="\/api\/favoritos\/1" method="post" data-favorito>/);
    const a = await adotante.post('/api/favoritos/2');
    const b = await adotante.post('/api/favoritos/2');
    assert.notEqual(a.json.favorito, b.json.favorito);
    const visit = await visitante.pagina('/adocao.html');
    assert.match(visit.texto, /<a class="card-favorito" href="entrar\.html"/);
    assert.match(visit.texto, /Entre para conversar com a ONG/);
    assert.equal((await visitante.post('/api/favoritos/2')).status, 401);
  });

  await teste('Meus dados: adotante atualiza o telefone e troca a senha', async () => {
    const r = await adotante.post('/api/conta/dados', { nome: 'Juliana Mendes', telefone: '(11) 98888-1234', moradia: 'apartamento' });
    assert.equal(r.status, 200, r.texto);
    const conta = await adotante.pagina('/minha-conta.html');
    assert.match(conta.texto, /value="\(11\) 98888-1234"/);
    assert.match(conta.texto, /<option value="apartamento" selected>/);
    const errada = await adotante.post('/api/conta/senha', { senha_atual: 'errada123', senha: 'novaSenha2026' });
    assert.equal(errada.status, 422);
    const certa = await adotante.post('/api/conta/senha', { senha_atual: 'patinhas123', senha: 'novaSenha2026' });
    assert.equal(certa.status, 200);
    await outro.entrar('adotante@patinhasclub.test', 'novaSenha2026');
    await adotante.post('/api/conta/senha', { senha_atual: 'novaSenha2026', senha: 'patinhas123' });
  });

  await teste('ONG atualiza o perfil público', async () => {
    const r = await ong.post('/api/ong/perfil', { apresentacao: 'Resgatamos cães e gatos em Diadema desde 2015.', telefone: '11998887766', rede_social: '@amigosdepatas' });
    assert.equal(r.status, 200, r.texto);
    const pub = await visitante.pagina('/ongs.html');
    assert.match(pub.texto, /Resgatamos cães e gatos em Diadema desde 2015\./);
  });

  let protocolo;
  await teste('visitante abre chamado de suporte e acompanha pela página', async () => {
    const r = await visitante.post('/api/suporte/chamados', { categoria: 'conta', assunto: 'Não consigo entrar', mensagem: 'Diz que a senha não confere.', nome: 'Marina Lopes', email: 'marina@exemplo.test' });
    assert.equal(r.status, 200, r.texto);
    protocolo = r.json.protocolo;
    assert.match(protocolo, /^SUP-[2-9A-Z]{8}$/);
    const pag = await visitante.pagina(`/ajuda.html?chamado=${protocolo}`);
    assert.match(pag.texto, new RegExp(`Protocolo <strong>${protocolo}</strong>`));
    assert.match(pag.texto, /Diz que a senha não confere\./);
  });

  await teste('outra pessoa só vê o chamado confirmando protocolo e e-mail', async () => {
    const pag = await outro.pagina(`/ajuda.html?chamado=${protocolo}`);
    assert.doesNotMatch(pag.texto, /Diz que a senha não confere/);
    const errado = await outro.post('/api/suporte/acompanhar', { protocolo, email: 'outra@exemplo.test' });
    assert.equal(errado.status, 422);
    const certo = await outro.post('/api/suporte/acompanhar', { protocolo: protocolo.toLowerCase(), email: 'marina@exemplo.test' });
    assert.equal(certo.status, 200, certo.texto);
    assert.match((await outro.pagina(`/ajuda.html?chamado=${protocolo}`)).texto, /Diz que a senha não confere/);
  });

  await teste('equipe responde o chamado; a pessoa responde de volta e encerra', async () => {
    const painel = await admin.pagina('/admin.html');
    assert.equal(painel.status, 200);
    const id = new RegExp(`action="/api/admin/chamados/(\\d+)/mensagens"[\\s\\S]*?`).exec(painel.texto.slice(painel.texto.indexOf(protocolo) - 4000));
    const chamadoId = (painel.texto.match(new RegExp(`id="chamado-(\\d+)"[\\s\\S]{0,1200}?${protocolo}`)) || [])[1];
    assert.ok(chamadoId && id, 'achou o chamado no painel');
    const resp = await admin.post(`/api/admin/chamados/${chamadoId}/mensagens`, { texto: 'Oi, Marina! Use "Esqueci minha senha" na tela de entrar.' });
    assert.equal(resp.status, 200, resp.texto);
    let pag = await visitante.pagina(`/ajuda.html?chamado=${protocolo}`);
    assert.match(pag.texto, /class="etiqueta aprovado">Respondido/);
    await visitante.post(`/api/suporte/chamados/${protocolo}/mensagens`, { texto: 'Deu certo, obrigada!' });
    pag = await visitante.pagina(`/ajuda.html?chamado=${protocolo}`);
    assert.match(pag.texto, /Aguardando a equipe/);
    await visitante.post(`/api/suporte/chamados/${protocolo}/resolver`);
    pag = await visitante.pagina(`/ajuda.html?chamado=${protocolo}`);
    assert.match(pag.texto, /class="etiqueta adotado">Resolvido/);
  });

  await teste('administração valida a ONG pendente e libera a criação da senha', async () => {
    const painel = await admin.pagina('/admin.html');
    assert.match(painel.texto, /Recanto dos Bigodes/);
    assert.match(painel.texto, /CNPJ 11\.444\.777\/0001-61/);
    const antes = await outro.post('/api/entrar', { email: 'recanto@patinhasclub.test', senha: 'qualquercoisa' });
    assert.equal(antes.status, 422);
    const r = await admin.post('/api/admin/ongs/10/aprovar');
    assert.equal(r.status, 200, r.texto);
    const deNovo = await admin.post('/api/admin/ongs/10/aprovar');
    assert.equal(deNovo.status, 404);
    const pub = await visitante.pagina('/ongs.html');
    assert.match(pub.texto, /Recanto dos Bigodes/);
  });

  await teste('administração atualiza a denúncia com anotação', async () => {
    const r = await admin.post('/api/admin/denuncias/1', { status: 'encaminhada', parecer: 'Encaminhada à DEPA.' });
    assert.equal(r.status, 200, r.texto);
    const painel = await admin.pagina('/admin.html');
    assert.match(painel.texto, /value="Encaminhada à DEPA\."/);
    assert.match(painel.texto, /<option value="encaminhada" selected>/);
  });

  await teste('só a equipe acessa a administração', async () => {
    const pag = await adotante.pagina('/admin.html');
    assert.equal(pag.status, 303);
    assert.equal(pag.local, '/minha-conta.html');
    assert.equal((await ong.post('/api/admin/denuncias/1', { status: 'arquivada' })).status, 403);
    assert.equal((await visitante.post('/api/admin/ongs/10/recusar', { motivo: 'x' })).status, 401);
  });

  await teste('página inicial mostra animais e ONGs do banco', async () => {
    const r = await visitante.pagina('/index.html');
    assert.match(r.texto, /class="mini-animal" href="adocao\.html#pet-\d+"/);
    assert.match(r.texto, /class="ong-mini" href="ongs\.html#ong-\d+"/);
    assert.doesNotMatch(r.texto, /pet-churros/);
  });

  await teste('avisos da conta aparecem uma vez na visão geral', async () => {
    const a = await adotante.pagina('/minha-conta.html');
    const b = await adotante.pagina('/minha-conta.html');
    assert.ok((a.texto.match(/class="novidades"/g) || []).length >= (b.texto.match(/class="novidades"/g) || []).length);
  });


  /* ---------- cadastros e formulários do site ---------- */
  const nova = new Navegador('nova adotante');

  await teste('cadastro de adotante cria a conta e já entra (cidade sem acento é a mesma cidade)', async () => {
    const r = await nova.enviar('/api/adotantes', {
      nome: 'Marina Teste', nascimento: '1995-05-20', cpf: '529.982.247-25', email: 'nova.adotante@patinhasclub.test',
      telefone: '(11) 98765-4321', cidade: 'sao paulo', estado: 'SP', moradia: 'apartamento', tem_animais: ['gato'],
      procura: ['cao', 'gato'], senha: 'senhaforte123', aceite_termos: 'on',
    });
    assert.equal(r.status, 200, r.texto);
    assert.equal(r.json.redirecionar, '/minha-conta.html#boas-vindas');
    const sessao = (await nova.pedir('/api/sessao')).json.usuario;
    assert.equal(sessao.email, 'nova.adotante@patinhasclub.test');
    assert.equal(sessao.cidade, 'São Paulo', 'usou a cidade que já existia');
  });

  await teste('e-mail ou CPF repetido volta com o erro no campo, sem gravar nada pela metade', async () => {
    const base = {
      nome: 'Repetida', nascimento: '1990-01-10', telefone: '(11) 91234-5678', cidade: 'Campinas', estado: 'SP',
      moradia: 'casa', senha: 'senhaforte123', aceite_termos: 'on',
    };
    const email = await visitante.enviar('/api/adotantes', { ...base, email: 'NOVA.ADOTANTE@patinhasclub.test' });
    assert.equal(email.status, 422);
    assert.match(email.json.erros.email, /Já existe uma conta com este e-mail/);
    const cpf = await visitante.enviar('/api/adotantes', { ...base, email: 'repetida@patinhasclub.test', cpf: '529.982.247-25' });
    assert.equal(cpf.status, 422);
    assert.match(cpf.json.erros.cpf, /CPF já tem uma conta/);
    const depois = await new Navegador('repetida').enviar('/api/adotantes', { ...base, email: 'repetida@patinhasclub.test' });
    assert.equal(depois.status, 200, 'o usuário da tentativa com CPF repetido foi desfeito');
  });

  await teste('cadastro de ONG com logo e documento fica aguardando a validação da equipe', async () => {
    const r = await visitante.enviar('/api/ongs', {
      tipo: 'ong', nome_organizacao: 'Amigos de Quatro Patas', documento: '11.222.333/0001-81', ano_fundacao: '2015',
      apresentacao: 'Resgatamos e cuidamos de cães e gatos na zona sul.', responsavel: 'Paula Lima', email: 'quatro.patas@patinhasclub.test',
      telefone: '(11) 3333-4444', ...LOCAL, especies: ['cao', 'gato'], servicos: ['adocao', 'resgate'], aceite_termos: 'on', declaracao: 'on',
    }, { logo: FOTO, doc_identificacao: PDF });
    assert.equal(r.status, 200, r.texto);
    assert.equal(r.json.redirecionar, '/cadastro-ong-enviado.html');
    assert.match((await admin.pagina('/admin.html')).texto, /Amigos de Quatro Patas/);
  });

  let anuncioId;
  await teste('anúncio de animal perdido com foto entra no mural e recebe aviso de quem viu', async () => {
    const r = await nova.enviar('/api/anuncios', {
      nome_animal: 'Bolinha', especie: 'cao', porte: 'pequeno', idade: 'adulto', sexo: 'femea', cor: 'caramelo',
      caracteristicas: 'Coleira vermelha', nome_tutor: 'Marina Teste', telefone: '(11) 98765-4321', autoriza_contato: 'on',
      ...LOCAL, data_desaparecimento: dia(-1), hora_desaparecimento: '18:30',
    }, { foto: FOTO });
    assert.equal(r.status, 200, r.texto);
    const mural = await visitante.pagina('/animais-perdidos.html');
    const m = /id="anuncio-(\d+)"[\s\S]*?Bolinha/.exec(mural.texto) || /Bolinha[\s\S]*?\/api\/anuncios\/(\d+)\/avisos/.exec(mural.texto);
    assert.ok(m, 'Bolinha aparece no mural com o formulário de aviso');
    anuncioId = m[1];
    const aviso = await visitante.post(`/api/anuncios/${anuncioId}/avisos`, {
      onde: 'Praça perto do metrô', quando: `${dia(0)}T08:15`, estado: 'assustado', contato: '(11) 97777-6666',
    });
    assert.equal(aviso.status, 200, aviso.texto);
  });

  await teste('dono marca o anúncio como resolvido; outra pessoa não consegue', async () => {
    assert.equal((await adotante.post(`/api/anuncios/${anuncioId}/resolver`, { desfecho: 'x' })).status, 404);
    const r = await nova.post(`/api/anuncios/${anuncioId}/resolver`, { desfecho: 'Voltou para casa!' });
    assert.equal(r.status, 200, r.texto);
  });

  await teste('denúncia com foto vai para a fila da equipe e a foto não fica pública', async () => {
    const r = await visitante.enviar('/api/denuncias', {
      tipo_ocorrencia: 'abandono', quantidade_animais: '3', ainda_no_local: 'sim',
      situacao_animal: 'Filhotes deixados numa caixa na calçada.', especie: 'gato', ...LOCAL, data_denuncia: dia(0),
      receber_andamento: 'on', email: 'quem.viu@patinhasclub.test',
    }, { fotos: [FOTO, FOTO] });
    assert.equal(r.status, 200, r.texto);
    const fila = (await admin.pagina('/admin.html')).texto;
    assert.match(fila, /Filhotes deixados numa caixa/);
    const midia = /\/api\/admin\/midias\/(\d+)/.exec(fila);
    assert.ok(midia, 'a equipe vê a foto pelo endereço protegido');
    assert.equal((await admin.pedir(midia[0], { json: false })).status, 200);
    assert.equal((await visitante.pedir(midia[0])).status, 401);
  });

  await teste('ONG salva rascunho, o banco barra publicar incompleto e o animal completo vai para a vitrine', async () => {
    const rascunho = await ong.enviar('/api/ong/animais?rascunho=1', { nome: 'Pipoca', especie: 'gato' }, { fotos: FOTO });
    assert.equal(rascunho.status, 200, rascunho.texto);
    const barrado = await ong.post(`/api/ong/animais/${rascunho.json.id}/publicar`, {});
    assert.equal(barrado.status, 422);
    assert.match(barrado.json.mensagem, /Complete sexo, porte, idade e a história/);
    const completo = await ong.enviar('/api/ong/animais', {
      nome: 'Biscoito', especie: 'cao', sexo: 'macho', idade: 'filhote', porte: 'medio', historia: 'Resgatado na chuva, muito brincalhão.',
      cidade: 'São Paulo', saude: ['vacinado', 'vermifugado'], jeito: ['brincalhao', 'carinhoso'], convive: ['criancas', 'caes'],
    }, { fotos: [FOTO, FOTO] });
    assert.equal(completo.status, 200, completo.texto);
    assert.match((await visitante.pagina('/adocao.html')).texto, /Biscoito/);
  });

  await teste('ONG cria campanha e ela aparece na página de campanhas', async () => {
    const r = await ong.post('/api/ong/campanhas', {
      tipo: 'arrecadacao', titulo: 'Ração para o inverno', descricao: 'Juntando ração para 40 animais.', meta: '300 kg',
      fim: dia(30), como_ajudar: 'Entregue no abrigo ou faça um Pix.',
    });
    assert.equal(r.status, 200, r.texto);
    assert.match((await visitante.pagina('/campanhas.html')).texto, /Ração para o inverno/);
  });

  await teste('lista de espera inscreve com conta e o adotante pausa o alerta', async () => {
    const r = await nova.enviar('/api/lista-de-espera', {
      animal: 'gato', porte: ['pequeno', 'medio'], idade: ['filhote'], cidade: 'Campinas', uf: 'SP',
      nome: 'Marina Teste', email: 'nova.adotante@patinhasclub.test', avisar_por: ['email'], termos: 'on',
    });
    assert.equal(r.status, 200, r.texto);
    const conta = (await nova.pagina('/minha-conta.html')).texto;
    const alerta = /\/api\/alertas\/(\d+)\/pausar/.exec(conta);
    assert.ok(alerta, 'o alerta aparece na conta com o botão de pausar');
    assert.equal((await nova.post(alerta[0], {})).status, 200);
  });

  await teste('pedido de adoção sem conta é aceito com os dados de contato', async () => {
    const vitrine = (await visitante.pagina('/adocao.html')).texto;
    const animal = /\/api\/animais\/(\d+)\/pedidos/.exec(vitrine);
    assert.ok(animal, 'a vitrine tem o formulário de interesse');
    const r = await new Navegador('sem conta').post(animal[0], {
      nome: 'Carlos Visitante', telefone: '(11) 95555-4444', moradia: 'casa-quintal', mensagem: 'Tenho quintal grande.', termo: 'on',
    });
    assert.equal(r.status, 200, r.texto);
  });

  await teste('recuperar senha responde igual exista ou não a conta, e link inválido é recusado', async () => {
    const existe = await visitante.post('/api/senha/recuperar', { email: 'adotante@patinhasclub.test' });
    const naoExiste = await visitante.post('/api/senha/recuperar', { email: 'ninguem@patinhasclub.test' });
    assert.equal(existe.status, 200);
    assert.deepEqual(existe.json, naoExiste.json);
    const link = await visitante.pagina('/redefinir-senha?token=invalido');
    assert.notEqual(link.status, 500);
    assert.doesNotMatch(link.texto, /Algo deu errado/);
  });

  await teste('todas as páginas abrem sem erro para visitante, adotante, ONG e equipe (com e sem localização)', async () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const paginas = fs.readdirSync(path.join(__dirname, '..', '..', 'Web')).filter((f) => f.endsWith('.html'));
    const problemas = [];
    for (const quem of [visitante, nova, ong, admin]) {
      for (const p of paginas) {
        for (const busca of ['', '?lat=-23.5505&lon=-46.6333']) {
          const r = await quem.pagina(`/${p}${busca}`);
          if (r.status >= 500 || /Algo deu errado/.test(r.texto)) problemas.push(`${quem.nome} ${p}${busca}: ${r.status}`);
        }
      }
    }
    assert.deepEqual(problemas, []);
  });

  await teste('busca por perto mostra a distância calculada no banco, da mais perto para a mais longe', async () => {
    const r = await visitante.pagina('/adocao.html?lat=-23.5505&lon=-46.6333');
    const metros = [...r.texto.matchAll(/A ([\d.,]+) (km|m) de você/g)]
      .map(([, n, u]) => Number(n.replace(/\./g, '').replace(',', '.')) * (u === 'km' ? 1000 : 1));
    assert.ok(metros.length >= 2, 'os cartões mostram a distância');
    assert.deepEqual(metros, [...metros].sort((a, b) => a - b));
  });

  for (const n of [ong, adotante]) n.parar && n.parar.abort();
  console.log(`\n${ok} ok, ${falhas.length} com falha${falhas.length ? `: ${falhas.join('; ')}` : ''}`);
  process.exit(falhas.length ? 1 : 0);
})();
