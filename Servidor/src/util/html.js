// Ajudantes para montar HTML com segurança (todo texto do banco passa por esc).

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

/**
 * As páginas do site marcam onde entram os dados do banco:
 *   <!-- dados:animais --> ...cartões de exemplo... <!-- /dados:animais -->
 * Sem o servidor, o protótipo mostra os exemplos; com ele, o conteúdo é trocado.
 */
function trocarBloco(html, nome, conteudo) {
  const inicio = `<!-- dados:${nome} -->`;
  const fim = `<!-- /dados:${nome} -->`;
  const a = html.indexOf(inicio);
  const b = html.indexOf(fim, a);
  if (a === -1 || b === -1) return html;
  return html.slice(0, a + inicio.length) + conteudo + html.slice(b);
}

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function partesData(texto) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(String(texto || ''));
  return m ? { a: m[1], m: m[2], d: m[3], h: m[4], min: m[5] } : null;
}

/** "2026-10-08 14:30:00" -> "08/10/2026" */
function dataBr(texto) {
  const p = partesData(texto);
  return p ? `${p.d}/${p.m}/${p.a}` : '';
}

/** "2026-10-08" -> "08/10" */
function diaMes(texto) {
  const p = partesData(texto);
  return p ? `${p.d}/${p.m}` : '';
}

/** "2026-10-17" -> "Sábado" */
function diaDaSemana(texto) {
  const p = partesData(texto);
  return p ? DIAS[new Date(Date.UTC(+p.a, +p.m - 1, +p.d)).getUTCDay()] : '';
}

/** "18:00:00" -> "18h"; "07:30:00" -> "7h30" */
function horaCurta(texto) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(texto || ''));
  if (!m) return '';
  return `${Number(m[1])}h${m[2] === '00' ? '' : m[2]}`;
}

/** "11995449612" -> "(11) 99544-9612" */
function telefoneBr(d) {
  const s = String(d || '');
  if (s.length === 11) return `(${s.slice(0, 2)}) ${s.slice(2, 7)}-${s.slice(7)}`;
  if (s.length === 10) return `(${s.slice(0, 2)}) ${s.slice(2, 6)}-${s.slice(6)}`;
  return s;
}

const telLink = (d) => `tel:+55${String(d || '').replace(/\D/g, '')}`;

const numeroBr = (n) => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

/** "ONG Amigos de Patas" -> "AP"; "Juliana Mendes" -> "JM" */
function iniciais(nome) {
  const ignorar = new Set(['ong', 'projeto', 'instituto', 'grupo', 'protetora', 'protetor', 'associacao', 'associação', 'coletivo', 'de', 'da', 'do', 'das', 'dos', 'e']);
  const palavras = String(nome || '').split(/\s+/).filter((p) => p && !ignorar.has(p.toLowerCase()));
  return (palavras.slice(0, 2).map((p) => p[0]).join('') || '?').toUpperCase();
}

/** Corta um texto longo numa palavra inteira. */
function resumo(texto, max = 160) {
  const t = String(texto || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

/** Página curta e independente (erros, confirmação, criar senha), com o visual do site. */
function paginaSimples({ titulo, mensagem = '', erros = null, corpo = '', voltar = null }) {
  const listaErros = erros && Object.keys(erros).length
    ? `<ul class="lista-erros">${Object.values(erros).map((e) => `<li>${esc(e)}</li>`).join('')}</ul>`
    : '';
  const botaoVoltar = voltar
    ? `<p><a class="botao primario" href="${esc(voltar)}" onclick="if (history.length > 1) { history.back(); return false; }">Voltar</a></p>`
    : '';
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(titulo)} | Patinhas Club</title>
    <link rel="icon" href="/img/favicon_io/favicon.ico" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Delius+Swash+Caps&amp;family=Poppins:wght@400;500;600;700&amp;display=swap" />
    <link rel="stylesheet" href="/styles/styles.css" />
  </head>
  <body data-servidor>
    <main class="pagina-simples">
      <div class="container">
        <a href="/index.html"><img src="/img/path16.svg" alt="Patinhas Club" width="150" height="82" /></a>
        <h1>${esc(titulo)}</h1>
        ${mensagem ? `<p>${esc(mensagem)}</p>` : ''}
        ${listaErros}
        ${corpo}
        ${botaoVoltar}
      </div>
    </main>
    <script src="/scripts/app.js" defer></script>
  </body>
</html>`;
}

module.exports = {
  esc, trocarBloco, dataBr, diaMes, diaDaSemana, horaCurta, telefoneBr, telLink, numeroBr, iniciais, resumo, paginaSimples,
};
