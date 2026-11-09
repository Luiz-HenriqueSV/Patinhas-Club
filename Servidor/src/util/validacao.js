// Leitura e validação dos formulários. A validação do navegador ajuda a pessoa;
// esta é a que vale, porque qualquer um pode mandar dados direto para a API.
const Geo = require('../../../Web/scripts/geo-nucleo.js');

class ErroHttp extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

class ErroValidacao extends ErroHttp {
  constructor(erros, mensagem = 'Confira os campos destacados.') {
    super(422, mensagem);
    this.erros = erros;
  }
}

const primeiro = (v) => (Array.isArray(v) ? v[0] : v);
const lista = (v) => (v === undefined || v === null || v === '' ? [] : Array.isArray(v) ? v : [v]);

/** Data de hoje no fuso de São Paulo: "2026-11-05" */
const hoje = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
const agora = () => new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(',', '');

function cpfValido(valor) {
  const d = Geo.soDigitos(valor);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const digito = (n) => {
    let soma = 0;
    for (let i = 0; i < n; i += 1) soma += Number(d[i]) * (n + 1 - i);
    return ((soma * 10) % 11) % 10;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

function cnpjValido(valor) {
  const d = Geo.soDigitos(valor);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const digito = (n) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const resto = pesos.reduce((soma, peso, i) => soma + peso * Number(d[i]), 0) % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return digito(12) === Number(d[12]) && digito(13) === Number(d[13]);
}

/** "(11) 99544-9612" ou "+55 11 99544-9612" -> "11995449612" */
function normalizarTelefone(valor) {
  let d = Geo.soDigitos(valor);
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  return d.length === 10 || d.length === 11 ? d : null;
}

/** "são bernardo do campo" -> "São Bernardo do Campo" */
function nomeProprio(texto) {
  const pequenas = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
  return String(texto).toLocaleLowerCase('pt-BR').split(' ')
    .map((p, i) => (i > 0 && pequenas.has(p) ? p : p.charAt(0).toLocaleUpperCase('pt-BR') + p.slice(1)))
    .join(' ');
}

function dataReal(texto) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto || '');
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

/**
 * Lê os campos de um formulário acumulando os erros por nome de campo:
 *   const l = leitor(req.body);
 *   const nome = l.texto('nome', { obrigatorio: true, max: 120 });
 *   l.validar(); // lança ErroValidacao com todos os erros juntos
 */
function leitor(corpo) {
  const dados = corpo || {};
  const erros = {};
  const bruto = (nome) => primeiro(dados[nome]);
  const erro = (nome, mensagem) => {
    if (!erros[nome]) erros[nome] = mensagem;
    return null;
  };
  const vazio = (nome, obrigatorio) => (obrigatorio ? erro(nome, 'Preencha este campo.') : null);

  return {
    erros,
    erro,

    texto(nome, { obrigatorio = false, max = 255, multilinha = false } = {}) {
      const original = bruto(nome);
      const v = multilinha
        ? String(original ?? '').split(/\r?\n/).map((linha) => linha.replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim() || null
        : Geo.limpar(original);
      if (!v) return vazio(nome, obrigatorio);
      if (v.length > max) return erro(nome, `Use no máximo ${max} caracteres.`);
      return v;
    },

    opcao(nome, opcoes, { obrigatorio = false, padrao = null } = {}) {
      const v = Geo.limpar(bruto(nome));
      if (!v) return obrigatorio ? erro(nome, 'Escolha uma opção.') : padrao;
      return opcoes.includes(v) ? v : erro(nome, 'Opção inválida.');
    },

    opcoes(nome, opcoes) {
      return [...new Set(lista(dados[nome]).map(String).filter((v) => opcoes.includes(v)))];
    },

    marcado(nome) {
      return ['sim', 'on', 'true', '1'].includes(String(bruto(nome) ?? '').toLowerCase());
    },

    email(nome, { obrigatorio = false } = {}) {
      const v = Geo.limpar(bruto(nome));
      if (!v) return vazio(nome, obrigatorio);
      if (v.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return erro(nome, 'Confira o e-mail, como voce@email.com.');
      return v.toLowerCase();
    },

    telefone(nome, { obrigatorio = false } = {}) {
      const v = Geo.limpar(bruto(nome));
      if (!v) return vazio(nome, obrigatorio);
      return normalizarTelefone(v) || erro(nome, 'Coloque o DDD e o número, como (11) 90000-0000.');
    },

    cpf(nome, { obrigatorio = false } = {}) {
      const v = Geo.limpar(bruto(nome));
      if (!v) return vazio(nome, obrigatorio);
      return cpfValido(v) ? Geo.soDigitos(v) : erro(nome, 'Este CPF não é válido.');
    },

    /** CNPJ para ONG e abrigo; CPF para protetor independente. */
    documento(nome, tipo) {
      const v = Geo.limpar(bruto(nome));
      if (!v) return vazio(nome, true);
      const ok = tipo === 'cpf' ? cpfValido(v) : cnpjValido(v);
      return ok ? Geo.soDigitos(v) : erro(nome, tipo === 'cpf' ? 'Este CPF não é válido.' : 'Este CNPJ não é válido.');
    },

    cep(nome, { obrigatorio = false } = {}) {
      const v = Geo.limpar(bruto(nome));
      if (!v) return vazio(nome, obrigatorio);
      return Geo.normalizarCep(v) || erro(nome, 'O CEP tem 8 números, como 09910-000.');
    },

    uf(nome, { obrigatorio = false } = {}) {
      const v = Geo.limpar(bruto(nome));
      if (!v) return obrigatorio ? erro(nome, 'Escolha o estado.') : null;
      return Geo.siglaUf(v) || erro(nome, 'Escolha um estado válido.');
    },

    data(nome, { obrigatorio = false, futuro = true, idadeMinima = null } = {}) {
      const v = Geo.limpar(bruto(nome));
      if (!v) return vazio(nome, obrigatorio);
      if (!dataReal(v)) return erro(nome, 'Data inválida.');
      if (!futuro && v > hoje()) return erro(nome, 'A data não pode ser no futuro.');
      if (v < '1900-01-01') return erro(nome, 'Data inválida.');
      if (idadeMinima) {
        const [a, m, d] = hoje().split('-').map(Number);
        const limite = `${a - idadeMinima}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (v > limite) return erro(nome, `É preciso ter ${idadeMinima} anos ou mais.`);
      }
      return v;
    },

    hora(nome) {
      const v = Geo.limpar(bruto(nome));
      if (!v) return null;
      return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(v) ? v.slice(0, 5) + ':00' : erro(nome, 'Horário inválido.');
    },

    /** datetime-local: "2026-10-08T18:30" -> "2026-10-08 18:30:00" */
    dataHora(nome, { obrigatorio = false, futuro = true } = {}) {
      const v = Geo.limpar(bruto(nome));
      if (!v) return vazio(nome, obrigatorio);
      const m = /^(\d{4}-\d{2}-\d{2})[T ]([01]\d|2[0-3]):([0-5]\d)/.exec(v);
      if (!m || !dataReal(m[1])) return erro(nome, 'Data e hora inválidas.');
      const valor = `${m[1]} ${m[2]}:${m[3]}:00`;
      if (!futuro && valor > agora()) return erro(nome, 'Não pode ser no futuro.');
      return valor;
    },

    inteiro(nome, { obrigatorio = false, min = -Infinity, max = Infinity } = {}) {
      const v = Geo.limpar(bruto(nome));
      if (!v) return vazio(nome, obrigatorio);
      const n = Number(v);
      if (!Number.isInteger(n) || n < min || n > max) return erro(nome, `Use um número entre ${min} e ${max}.`);
      return n;
    },

    senha(nome) {
      const v = String(bruto(nome) ?? '');
      if (!v) return vazio(nome, true);
      if (v.length < 8) return erro(nome, 'A senha precisa de pelo menos 8 caracteres.');
      if (v.length > 128) return erro(nome, 'Use no máximo 128 caracteres.');
      return v;
    },

    /** Campos escondidos do localizador. Coordenadas fora do lugar são ignoradas. */
    coordenadas() {
      const lat = Number(bruto('latitude'));
      const lon = Number(bruto('longitude'));
      if (!bruto('latitude') || !bruto('longitude') || !Number.isFinite(lat) || !Number.isFinite(lon)
          || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
      const precisao = Number(bruto('precisao_m'));
      const origem = ['gps', 'mapa', 'cep', 'digitado'].includes(bruto('origem_localizacao')) ? bruto('origem_localizacao') : 'mapa';
      return {
        latitude: Math.round(lat * 1e6) / 1e6,
        longitude: Math.round(lon * 1e6) / 1e6,
        precisao_m: Number.isFinite(precisao) && precisao > 0 ? Math.min(65535, Math.round(precisao)) : null,
        origem,
      };
    },

    validar() {
      if (Object.keys(erros).length) throw new ErroValidacao(erros);
    },
  };
}

/** "/api/animais/12/pedidos" -> 12 (ou erro 404) */
function idDaRota(valor) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 1) throw new ErroHttp(404, 'Não encontrado.');
  return n;
}

/** Meta da campanha: "500 kg de ração" -> { valor: 500, unidade: "kg" }; "R$ 1.200" -> { valor: 1200, unidade: "R$" } */
function interpretarMeta(texto) {
  const m = /^(R\$)?\s*(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?\s*([^\d\s,.;]+)?/i.exec(texto || '');
  if (!m) return { valor: null, unidade: null };
  const valor = Number(`${m[2].replace(/\./g, '')}.${m[3] || 0}`);
  if (!(valor > 0)) return { valor: null, unidade: null };
  return { valor, unidade: m[1] ? 'R$' : (m[4] || '').slice(0, 30) || null };
}

module.exports = {
  ErroHttp, ErroValidacao, leitor, lista, idDaRota,
  cpfValido, cnpjValido, normalizarTelefone, nomeProprio, hoje, interpretarMeta,
};
