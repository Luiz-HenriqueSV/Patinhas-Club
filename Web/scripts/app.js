/*
 * Patinhas Club — envio dos formulários
 * ------------------------------------------------------------
 * Sem JavaScript, os formulários vão para /api/... e o servidor
 * redireciona para a mensagem de sucesso. Com JavaScript, este
 * arquivo envia sem recarregar, mostra os erros do servidor ao
 * lado de cada campo e preenche nome, telefone e e-mail de quem
 * já está logado.
 *
 * Sem o servidor (site aberto direto), formulários com
 * data-prototipo="pagina.html#aviso" seguem o fluxo do protótipo.
 */
(function () {
  'use strict';

  const ehApi = (url) => /^\/api\//.test(url || '');
  const comServidor = () => document.body.hasAttribute('data-servidor');

  /* ---------- Envio ---------- */

  document.addEventListener('submit', async (evento) => {
    const form = evento.target;
    const botao = evento.submitter;
    const acao = (botao && botao.getAttribute('formaction')) || form.getAttribute('action');
    if (!ehApi(acao)) return;
    evento.preventDefault();
    if (form.dataset.enviando) return;

    const prototipo = (botao && botao.dataset.prototipo) || form.dataset.prototipo;
    if (!comServidor() && prototipo) return modoPrototipo(form, prototipo);

    limparErros(form);
    form.dataset.enviando = 'sim';
    form.setAttribute('aria-busy', 'true');
    if (botao) botao.classList.add('enviando');
    try {
      let dados;
      try { dados = new FormData(form, botao); } catch (e) {
        dados = new FormData(form);
        if (botao && botao.name) dados.append(botao.name, botao.value);
      }
      const resposta = await fetch(acao, {
        method: 'POST', body: dados, credentials: 'same-origin', headers: { Accept: 'application/json' },
      });
      const corpo = await resposta.json().catch(() => null);
      if (!corpo) throw new TypeError('Resposta sem JSON');
      if (corpo.ok) {
        form.reset();
        return irPara(corpo.redirecionar);
      }
      if (resposta.status === 401 && corpo.redirecionar) return irPara(corpo.redirecionar); // precisa entrar
      mostrarErros(form, corpo);
    } catch (erro) {
      mostrarErros(form, { mensagem: 'Não foi possível falar com o servidor. Confira sua conexão e tente de novo.' });
    } finally {
      delete form.dataset.enviando;
      form.removeAttribute('aria-busy');
      if (botao) botao.classList.remove('enviando');
    }
  });

  function modoPrototipo(form, destino) {
    avisarRodape('Modo protótipo: o servidor não está ligado, então nada foi salvo.');
    setTimeout(() => { form.reset(); irPara(destino); }, 1400);
  }

  function irPara(url) {
    if (!url) return;
    const alvo = new URL(url, location.href);
    if (alvo.pathname === location.pathname && alvo.search === location.search) {
      if (alvo.hash === location.hash) location.hash = '';
      location.hash = alvo.hash;
    } else {
      location.assign(alvo.href);
    }
  }

  /* ---------- Erros ---------- */

  function limparErros(form) {
    form.querySelectorAll('.alerta-form, .msg-erro-servidor').forEach((el) => el.remove());
    form.querySelectorAll('[data-erro-servidor]').forEach((campo) => {
      campo.removeAttribute('aria-invalid');
      const original = campo.dataset.descricaoOriginal;
      if (original) campo.setAttribute('aria-describedby', original);
      else campo.removeAttribute('aria-describedby');
      delete campo.dataset.erroServidor;
      delete campo.dataset.descricaoOriginal;
    });
  }

  function mostrarErros(form, { mensagem, erros = {} }) {
    let primeiro = null;
    let sequencia = 0;
    for (const [nome, texto] of Object.entries(erros)) {
      const campo = form.querySelector(`[name="${CSS.escape(nome)}"]:not([type="hidden"])`);
      if (!campo) continue;
      const caixa = campo.closest('.campo') || campo.closest('fieldset') || campo.parentElement;
      const aviso = document.createElement('small');
      aviso.className = 'msg-erro-servidor';
      aviso.id = `erro-${form.id || 'form'}-${nome}-${++sequencia}`;
      aviso.textContent = texto;
      caixa.append(aviso);
      campo.dataset.erroServidor = 'sim';
      campo.dataset.descricaoOriginal = campo.getAttribute('aria-describedby') || '';
      campo.setAttribute('aria-invalid', 'true');
      campo.setAttribute('aria-describedby', [campo.dataset.descricaoOriginal, aviso.id].filter(Boolean).join(' '));
      if (!primeiro) primeiro = campo;
    }
    const resumo = document.createElement('div');
    resumo.className = 'alerta-form';
    resumo.setAttribute('role', 'alert');
    resumo.tabIndex = -1;
    resumo.textContent = mensagem || 'Confira os campos destacados.';
    form.prepend(resumo);
    (primeiro || resumo).focus();
    if (!primeiro) resumo.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function avisarRodape(texto) {
    let caixa = document.querySelector('.aviso-rodape');
    if (!caixa) {
      caixa = Object.assign(document.createElement('div'), { className: 'aviso-rodape' });
      caixa.setAttribute('role', 'status');
      document.body.append(caixa);
    }
    caixa.textContent = texto;
    caixa.classList.add('visivel');
    clearTimeout(avisarRodape.relogio);
    avisarRodape.relogio = setTimeout(() => caixa.classList.remove('visivel'), 4000);
  }

  /* ---------- Quem está logado não precisa digitar o contato de novo ---------- */

  async function preencherContato() {
    const formularios = [...document.querySelectorAll('form[action^="/api/"]')]
      .filter((f) => !/^\/api\/(adotantes|ongs|entrar|senha)/.test(f.getAttribute('action')));
    if (!formularios.length || !comServidor()) return;
    const sessao = await fetch('/api/sessao', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const u = sessao && sessao.usuario;
    if (!u) return;
    const valores = { nome: u.nome, nome_tutor: u.nome, email: u.email, telefone: u.telefone, contato: u.telefone || u.email };
    for (const form of formularios) {
      const campos = { ...valores };
      const acao = form.getAttribute('action');
      if (/lista-de-espera|ong\/animais/.test(acao)) Object.assign(campos, { cidade: u.cidade, estado: u.uf });
      for (const [nome, valor] of Object.entries(campos)) {
        const el = form.querySelector(`[name="${nome}"]:not([type="hidden"])`);
        if (el && valor && !el.value) el.value = valor;
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', preencherContato);
  else preencherContato();
})();
