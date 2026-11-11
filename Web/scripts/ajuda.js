/*
 * Patinhas Club — Central de ajuda (ajuda.html)
 * Busca nas perguntas frequentes enquanto a pessoa digita.
 * Sem JavaScript a busca fica escondida e todas as perguntas aparecem.
 */
(function () {
  'use strict';

  const caixa = document.querySelector('.busca-ajuda');
  const campo = document.getElementById('busca-ajuda');
  const vazia = document.querySelector('.busca-vazia');
  if (!caixa || !campo) return;
  caixa.hidden = false;

  // "não", "nao" e "NÃO" valem a mesma coisa na busca
  const simples = (texto) => texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const perguntas = [...document.querySelectorAll('.faq details')].map((item) => ({ item, texto: simples(item.textContent) }));
  const grupos = [...document.querySelectorAll('.faq-grupo')];

  function filtrar() {
    const termos = simples(campo.value).split(/\s+/).filter((t) => t.length > 1);
    let achou = 0;
    for (const p of perguntas) {
      const mostra = termos.every((t) => p.texto.includes(t));
      p.item.hidden = !mostra;
      p.item.open = Boolean(termos.length && mostra);
      if (mostra) achou += 1;
    }
    for (const g of grupos) g.hidden = !g.querySelector('details:not([hidden])');
    if (vazia) vazia.hidden = achou > 0;
  }

  let espera;
  campo.addEventListener('input', () => {
    clearTimeout(espera);
    espera = setTimeout(filtrar, 120);
  });
  campo.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') {
      evento.preventDefault();
      const primeira = perguntas.find((p) => !p.item.hidden);
      if (primeira) primeira.item.querySelector('summary').focus();
    }
  });
})();
