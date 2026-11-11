'use strict';
/*
 * Banco embutido (o padrão do projeto): o SQLite que já vem dentro do Node.js 22.13+.
 * Não precisa instalar MySQL nem XAMPP: o banco é o arquivo Servidor/dados/patinhas.db.
 *
 * Este módulo imita o mysql2/promise (createPool, query, transações), então o resto do
 * servidor não muda nada. Os scripts da pasta "Banco de dados" continuam em MySQL, que é o
 * que a disciplina pede; aqui eles são traduzidos na hora para o SQLite (AUTO_INCREMENT,
 * ENUM, INSERT IGNORE, INTERVAL, ON DUPLICATE KEY...). Para usar o MySQL/XAMPP de verdade,
 * coloque BANCO=mysql no Servidor/.env.
 */
const fs = require('node:fs');
const path = require('node:path');

/* ---------- carrega o SQLite do Node sem o aviso de "recurso experimental" ---------- */
let sqlite = null;
function carregarSqlite() {
  if (sqlite) return sqlite;
  const avisar = process.emitWarning;
  process.emitWarning = (aviso, ...resto) => {
    if (!/sqlite/i.test(String(aviso && aviso.message ? aviso.message : aviso))) avisar.call(process, aviso, ...resto);
  };
  try {
    sqlite = require('node:sqlite');
  } catch {
    sqlite = null;
  } finally {
    process.emitWarning = avisar;
  }
  if (!sqlite || typeof sqlite.DatabaseSync.prototype.function !== 'function') {
    sqlite = null;
    throw Object.assign(
      new Error(`O banco embutido precisa do Node.js 22.13 ou mais novo (este é o ${process.version}). `
        + 'Abra pelo iniciar.bat, que baixa a versão certa sozinho, ou use BANCO=mysql no Servidor/.env.'),
      { code: 'ER_NODE_ANTIGO' },
    );
  }
  return sqlite;
}

/* ---------- funções do MySQL que o SQLite não tem ---------- */
const dois = (n) => String(n).padStart(2, '0');
const formatar = (d, hora) => `${d.getUTCFullYear()}-${dois(d.getUTCMonth() + 1)}-${dois(d.getUTCDate())}`
  + (hora ? ` ${dois(d.getUTCHours())}:${dois(d.getUTCMinutes())}:${dois(d.getUTCSeconds())}` : '');
function lerData(texto) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(String(texto ?? ''));
  if (!m) return null;
  return { d: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0))), hora: m[4] !== undefined };
}
function agora() { // hora local do computador, como o NOW() do MySQL
  const n = new Date();
  return `${n.getFullYear()}-${dois(n.getMonth() + 1)}-${dois(n.getDate())} ${dois(n.getHours())}:${dois(n.getMinutes())}:${dois(n.getSeconds())}`;
}
function intervalo(base, sinal, n, unidade) { // base + INTERVAL n UNIDADE
  const p = lerData(base);
  if (!p || n === null || n === undefined) return null;
  const k = (sinal === '-' ? -1 : 1) * Number(n);
  const u = String(unidade).toUpperCase();
  const d = p.d;
  if (u === 'SECOND') d.setUTCSeconds(d.getUTCSeconds() + k);
  else if (u === 'MINUTE') d.setUTCMinutes(d.getUTCMinutes() + k);
  else if (u === 'HOUR') d.setUTCHours(d.getUTCHours() + k);
  else if (u === 'DAY') d.setUTCDate(d.getUTCDate() + k);
  else if (u === 'WEEK') d.setUTCDate(d.getUTCDate() + 7 * k);
  else if (u === 'MONTH' || u === 'YEAR') { // como o MySQL: 31/01 + 1 mês = 28/02
    const dia = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + (u === 'YEAR' ? 12 * k : k));
    d.setUTCDate(Math.min(dia, new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()));
  }
  return formatar(d, p.hora || ['SECOND', 'MINUTE', 'HOUR'].includes(u));
}
function diferenca(unidade, a, b) { // TIMESTAMPDIFF(unidade, a, b)
  const x = lerData(a);
  const y = lerData(b);
  if (!x || !y) return null;
  const u = String(unidade).toUpperCase();
  if (u === 'MONTH' || u === 'YEAR') {
    let meses = (y.d.getUTCFullYear() - x.d.getUTCFullYear()) * 12 + (y.d.getUTCMonth() - x.d.getUTCMonth());
    const resto = (d) => d.getUTCDate() * 86400 + d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds();
    if (meses > 0 && resto(y.d) < resto(x.d)) meses--;
    if (meses < 0 && resto(y.d) > resto(x.d)) meses++;
    return u === 'YEAR' ? Math.trunc(meses / 12) : meses;
  }
  const segundos = { SECOND: 1, MINUTE: 60, HOUR: 3600, DAY: 86400, WEEK: 604800 }[u] || 1;
  return Math.trunc((y.d - x.d) / 1000 / segundos);
}
function distancia(p1, p2) { // ST_Distance_Sphere(POINT(lon, lat), POINT(lon, lat)), em metros
  if (p1 == null || p2 == null) return null;
  const [lon1, lat1] = String(p1).split(',').map(Number);
  const [lon2, lat2] = String(p2).split(',').map(Number);
  const r = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 2 * 6370986 * Math.asin(Math.sqrt(a));
}
function registrarFuncoes(db) {
  const f = (nome, fn, { varargs = false, deterministic = true } = {}) => db.function(nome, { varargs, deterministic }, fn);
  const variavel = { deterministic: false };
  f('NOW', () => agora(), variavel);
  f('SYSDATE', () => agora(), variavel);
  f('CURDATE', () => agora().slice(0, 10), variavel);
  f('CURTIME', () => agora().slice(11), variavel);
  f('UNIX_TIMESTAMP', () => Math.floor(Date.now() / 1000), variavel);
  f('YEAR', (d) => (lerData(d) ? lerData(d).d.getUTCFullYear() : null));
  f('MONTH', (d) => (lerData(d) ? lerData(d).d.getUTCMonth() + 1 : null));
  f('DAY', (d) => (lerData(d) ? lerData(d).d.getUTCDate() : null));
  f('DATEDIFF', (a, b) => (lerData(a) && lerData(b)
    ? Math.round((Date.parse(`${String(a).slice(0, 10)}T00:00:00Z`) - Date.parse(`${String(b).slice(0, 10)}T00:00:00Z`)) / 86400000)
    : null));
  f('TIMESTAMPDIFF', diferenca);
  f('TIMESTAMP', (d, t) => {
    if (d === null) return null;
    if (t === undefined || t === null) return String(d).length <= 10 ? `${d} 00:00:00` : String(d);
    return `${String(d).slice(0, 10)} ${t}`;
  }, { varargs: true });
  f('FIELD', (x, ...vs) => vs.findIndex((v) => v === x) + 1, { varargs: true });
  f('CONCAT', (...vs) => (vs.some((v) => v === null) ? null : vs.join('')), { varargs: true });
  f('CONCAT_WS', (sep, ...vs) => vs.filter((v) => v !== null).join(sep), { varargs: true });
  f('FIND_IN_SET', (s, lista) => (s === null || lista === null ? null : String(lista).split(',').indexOf(String(s)) + 1));
  f('LPAD', (s, n, p) => (s === null ? null : String(s).padStart(Number(n), p).slice(0, Number(n))));
  f('LEAST', (...vs) => (vs.some((v) => v === null) ? null : vs.reduce((a, b) => (a < b ? a : b))), { varargs: true });
  f('GREATEST', (...vs) => (vs.some((v) => v === null) ? null : vs.reduce((a, b) => (a > b ? a : b))), { varargs: true });
  f('POINT', (a, b) => (a === null || b === null ? null : `${a},${b}`));
  f('ST_Distance_Sphere', distancia);
  f('pc_intervalo', intervalo);
  f('regexp', (padrao, valor) => (valor === null ? null : (new RegExp(padrao, 'i').test(String(valor)) ? 1 : 0)));
}

/* ---------- separa os textos entre aspas do resto do SQL ---------- */
// Os textos viram marcadores \u0001N\u0002 enquanto o SQL é traduzido, para nenhuma
// troca mexer dentro deles (um "?" ou "INTERVAL" escrito numa mensagem, por exemplo).
const A = '\u0001';
const B = '\u0002';
const ESCAPES = { n: '\n', r: '\r', t: '\t', 0: '\0', Z: '\x1a', b: '\b' };
function mascarar(sql) {
  const textos = [];
  let saida = '';
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i];
    const d = sql[i + 1];
    if (c === '-' && d === '-' && (i + 2 >= n || /\s/.test(sql[i + 2]))) { while (i < n && sql[i] !== '\n') i++; saida += ' '; continue; }
    if (c === '#') { while (i < n && sql[i] !== '\n') i++; saida += ' '; continue; }
    if (c === '/' && d === '*') { const f = sql.indexOf('*/', i + 2); i = f === -1 ? n : f + 2; saida += ' '; continue; }
    if (c === "'" || c === '"') {
      let v = '';
      i++;
      for (;;) {
        if (i >= n) throw Object.assign(new Error('Texto SQL sem fechar aspas'), { code: 'ER_PARSE_ERROR' });
        const x = sql[i];
        if (x === '\\') { const y = sql[i + 1]; v += y in ESCAPES ? ESCAPES[y] : (y === '%' || y === '_' ? `\\${y}` : y); i += 2; continue; }
        if (x === c) { if (sql[i + 1] === c) { v += c; i += 2; continue; } i++; break; }
        v += x;
        i++;
      }
      textos.push(v);
      saida += `${A}${textos.length - 1}${B}`;
      continue;
    }
    if (c === '`') { const f = sql.indexOf('`', i + 1); saida += `"${sql.slice(i + 1, f)}"`; i = f + 1; continue; }
    saida += c;
    i++;
  }
  return { texto: saida, textos };
}
const literal = (v) => `'${String(v).replace(/'/g, "''")}'`;
const desmascarar = (texto, textos) => texto.replace(new RegExp(`${A}(\\d+)${B}`, 'g'), (_, k) => literal(textos[+k]));

function dividirTopo(s, sep = ',') { // divide só no nível de fora dos parênteses
  const partes = [];
  let nivel = 0;
  let atual = '';
  for (const c of s) {
    if (c === '(') nivel++;
    else if (c === ')') nivel--;
    if (c === sep && nivel === 0) { partes.push(atual); atual = ''; } else atual += c;
  }
  if (atual.trim()) partes.push(atual);
  return partes.map((p) => p.trim()).filter(Boolean);
}
function dentroDosParenteses(s) {
  const a = s.indexOf('(');
  let nivel = 0;
  for (let i = a; i < s.length; i++) {
    if (s[i] === '(') nivel++;
    else if (s[i] === ')' && --nivel === 0) return s.slice(a + 1, i);
  }
  return '';
}
const nomesDasColunas = (s) => dividirTopo(s).map((c) => c.replace(/"/g, '').replace(/\(\d+\)/, '').replace(/\s+(ASC|DESC)$/i, '').trim());

/* ---------- tradução do dialeto MySQL (fora dos textos) ---------- */
const UNIDADE = '(SECOND|MINUTE|HOUR|DAY|WEEK|MONTH|YEAR)';
const QUANTIDADE = '(\\?|\\d+|[A-Za-z_][\\w.]*)';
const BASE = `(\\b[A-Za-z_]\\w*\\s*\\([^()]*\\)|\\?|${A}\\d+${B}|"\\w+"(?:\\."\\w+")?|\\b[A-Za-z_][\\w.]*)`;
const RE_INTERVALO = new RegExp(`${BASE}\\s*([+-])\\s*INTERVAL\\s+${QUANTIDADE}\\s+${UNIDADE}\\b`, 'gi');
const RE_DATE_ADD = new RegExp(`\\bDATE_(ADD|SUB)\\s*\\(\\s*([^,]+?)\\s*,\\s*INTERVAL\\s+${QUANTIDADE}\\s+${UNIDADE}\\s*\\)`, 'gi');

function traduzir(s, textos) {
  const novoTexto = (v) => { textos.push(v); return `${A}${textos.length - 1}${B}`; };
  let t = s
    .replace(/\bINSERT\s+IGNORE\b/gi, 'INSERT OR IGNORE')
    .replace(/\bIF\s*\(/gi, 'IIF(')
    .replace(/\bCURRENT_DATE\b(\s*\(\s*\))?/gi, 'CURDATE()')
    .replace(/\bCURRENT_TIMESTAMP\b(\s*\(\s*\))?/gi, 'NOW()')
    .replace(/\bTIMESTAMPDIFF\s*\(\s*(\w+)\s*,/gi, (m, u) => `TIMESTAMPDIFF('${u.toUpperCase()}',`)
    .replace(RE_DATE_ADD, (m, op, base, n, u) => `pc_intervalo(${base}, '${op.toUpperCase() === 'SUB' ? '-' : '+'}', ${n}, '${u.toUpperCase()}')`)
    .replace(RE_INTERVALO, (m, base, sinal, n, u) => `pc_intervalo(${base}, '${sinal}', ${n}, '${u.toUpperCase()}')`)
    .replace(/\bGROUP_CONCAT\s*\(([^()]*?)\s+ORDER\s+BY\s+([^()]*?)(?:\s+SEPARATOR\s+(\S+))?\s*\)/gi,
      (m, e, o, sep) => `GROUP_CONCAT(${e}, ${sep || novoTexto(',')} ORDER BY ${o})`)
    .replace(/\bGROUP_CONCAT\s*\(([^()]*?)\s+SEPARATOR\s+(\S+)\s*\)/gi, 'GROUP_CONCAT($1, $2)')
    .replace(/\bFOR\s+UPDATE\b/gi, '')
    .replace(/\bLOCK\s+IN\s+SHARE\s+MODE\b/gi, '')
    .replace(/\bFROM\s+DUAL\b/gi, '')
    .replace(/<=>/g, ' IS ')
    .replace(/\bCHAR_LENGTH\s*\(/gi, 'LENGTH(')
    .replace(/\bLAST_INSERT_ID\s*\(\s*\)/gi, 'last_insert_rowid()')
    .replace(/\bAS\s+UNSIGNED\b/gi, 'AS INTEGER')
    .replace(/\bAS\s+SIGNED\b/gi, 'AS INTEGER');
  const dup = /\bON\s+DUPLICATE\s+KEY\s+UPDATE\b/i.exec(t);
  if (dup) {
    t = `${t.slice(0, dup.index)}ON CONFLICT DO UPDATE SET${t.slice(dup.index + dup[0].length).replace(/\bVALUES\s*\(\s*"?(\w+)"?\s*\)/gi, 'excluded.$1')}`;
  }
  return t;
}

/* ---------- CREATE TABLE ---------- */
const INTEIROS = new Set(['TINYINT', 'SMALLINT', 'MEDIUMINT', 'INT', 'INTEGER', 'BIGINT', 'BOOLEAN', 'BOOL', 'YEAR', 'BIT']);
const REAIS = new Set(['DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'REAL']);
const TEXTOS = new Set(['CHAR', 'VARCHAR', 'TINYTEXT', 'TEXT', 'MEDIUMTEXT', 'LONGTEXT', 'ENUM', 'SET']);

function traduzirTabela(s, textos, meta) {
  const m = /^CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?\s*\(([\s\S]*)\)[^)]*$/i.exec(s);
  if (!m) throw Object.assign(new Error(`CREATE TABLE não entendido: ${s.slice(0, 80)}`), { code: 'ER_PARSE_ERROR' });
  const tabela = m[2];
  const linhas = [];
  const indices = [];
  const chaves = [];
  const atualiza = [];
  let auto = null;
  for (const item of dividirTopo(m[3])) {
    if (/^PRIMARY\s+KEY/i.test(item)) {
      const cols = nomesDasColunas(dentroDosParenteses(item));
      if (!(cols.length === 1 && cols[0] === auto)) linhas.push(`PRIMARY KEY (${cols.map((c) => `"${c}"`).join(', ')})`);
      chaves.push({ nome: 'PRIMARY', colunas: cols });
    } else if (/^UNIQUE\b/i.test(item)) {
      const nome = (/^UNIQUE\s+(?:KEY\s+|INDEX\s+)?"?(\w+)"?\s*\(/i.exec(item) || [])[1];
      const cols = nomesDasColunas(dentroDosParenteses(item));
      linhas.push(`${nome ? `CONSTRAINT "${nome}" ` : ''}UNIQUE (${cols.map((c) => `"${c}"`).join(', ')})`);
      chaves.push({ nome: nome || cols[0], colunas: cols });
    } else if (/^(KEY|INDEX)\b/i.test(item)) {
      const nome = (/^(?:KEY|INDEX)\s+"?(\w+)"?/i.exec(item) || [])[1];
      const cols = nomesDasColunas(dentroDosParenteses(item));
      indices.push(`CREATE INDEX IF NOT EXISTS "${tabela}__${nome}" ON "${tabela}" (${cols.map((c) => `"${c}"`).join(', ')})`);
    } else if (/^(FULLTEXT|SPATIAL)\b/i.test(item)) {
      // sem equivalente no SQLite: as buscas funcionam sem esses índices
    } else if (/^(CONSTRAINT|FOREIGN\s+KEY|CHECK)\b/i.test(item)) {
      linhas.push(traduzir(item, textos));
    } else {
      const c = /^"?(\w+)"?\s+([A-Za-z]+)\s*(?:\(([^)]*)\))?\s*([\s\S]*)$/.exec(item);
      if (!c) throw Object.assign(new Error(`Coluna não entendida em ${tabela}: ${item}`), { code: 'ER_PARSE_ERROR' });
      const [, nome, tipoBruto, args] = c;
      const tipo = tipoBruto.toUpperCase();
      const binaria = /\bCOLLATE\s+\w*_bin\b|\bCHARACTER\s+SET\s+binary\b/i.test(c[4]);
      let resto = c[4]
        .replace(/\bUNSIGNED\b|\bZEROFILL\b/gi, '')
        .replace(new RegExp(`\\bCOMMENT\\s+${A}\\d+${B}`, 'gi'), '')
        .replace(/\bCHARACTER\s+SET\s+\w+|\bCOLLATE\s+\w+/gi, '');
      if (/\bON\s+UPDATE\s+CURRENT_TIMESTAMP/i.test(resto)) {
        atualiza.push(nome);
        resto = resto.replace(/\bON\s+UPDATE\s+CURRENT_TIMESTAMP(\s*\(\s*\))?/i, '');
      }
      resto = resto.replace(/\bDEFAULT\s+CURRENT_TIMESTAMP(\s*\(\s*\))?/i, "DEFAULT (datetime('now','localtime'))");
      if (/\bAUTO_INCREMENT\b/i.test(resto)) { auto = nome; linhas.push(`"${nome}" INTEGER PRIMARY KEY AUTOINCREMENT`); continue; }
      let tipoSqlite = 'TEXT';
      let conferir = '';
      if (INTEIROS.has(tipo)) tipoSqlite = 'INTEGER';
      else if (REAIS.has(tipo)) tipoSqlite = 'REAL';
      else if (/BLOB|BINARY/.test(tipo)) tipoSqlite = 'BLOB';
      // MySQL compara textos sem diferenciar maiúsculas (utf8mb4_unicode_ci): NOCASE faz o mesmo
      else if (TEXTOS.has(tipo) && !binaria) tipoSqlite = 'TEXT COLLATE NOCASE';
      // regras com nome: o erro do SQLite diz qual coluna e o tipo de problema
      if (tipo === 'ENUM') conferir = ` CONSTRAINT "pc_enum_${nome}" CHECK ("${nome}" IN (${args}))`;
      else if (tipo === 'VARCHAR' || tipo === 'CHAR') conferir = ` CONSTRAINT "pc_tamanho_${nome}" CHECK (length("${nome}") <= ${Number(args)})`;
      linhas.push(`"${nome}" ${tipoSqlite} ${traduzir(resto, textos).trim()}${conferir}`);
    }
  }
  meta.chaves[tabela] = chaves;
  meta.atualiza[tabela] = atualiza;
  return { tabela, sql: `CREATE TABLE ${m[1] ? 'IF NOT EXISTS ' : ''}"${tabela}" (\n  ${linhas.join(',\n  ')}\n)`, indices };
}

/* ---------- erros no formato do mysql2 (o servidor confere e.code) ---------- */
function erroMysql(e, sql, meta) {
  const msg = String(e.message || e);
  let code = 'ER_PARSE_ERROR';
  let errno = 1064;
  let texto = msg;
  let m;
  if ((m = /UNIQUE constraint failed: (.+)/.exec(msg))) {
    const cols = m[1].split(',').map((c) => c.trim());
    const tabela = cols[0].split('.')[0];
    const nomes = cols.map((c) => c.split('.')[1]);
    const chave = (meta.chaves[tabela] || []).find((k) => k.colunas.length === nomes.length && k.colunas.every((c) => nomes.includes(c)));
    code = 'ER_DUP_ENTRY'; errno = 1062; texto = `Duplicate entry for key '${tabela}.${chave ? chave.nome : 'PRIMARY'}'`;
  } else if ((m = /CHECK constraint failed: (.+)/.exec(msg))) {
    const regra = m[1].trim();
    if (regra.startsWith('pc_tamanho_')) { code = 'ER_DATA_TOO_LONG'; errno = 1406; texto = `Data too long for column '${regra.slice(11)}' at row 1`; }
    else if (regra.startsWith('pc_enum_')) { code = 'WARN_DATA_TRUNCATED'; errno = 1265; texto = `Data truncated for column '${regra.slice(8)}' at row 1`; }
    else { code = 'ER_CHECK_CONSTRAINT_VIOLATED'; errno = 3819; texto = `Check constraint '${regra}' is violated.`; }
  } else if ((m = /NOT NULL constraint failed: (.+)/.exec(msg))) { code = 'ER_BAD_NULL_ERROR'; errno = 1048; texto = `Column '${m[1]}' cannot be null`; }
  else if (/FOREIGN KEY constraint failed/.test(msg)) { code = 'ER_NO_REFERENCED_ROW_2'; errno = 1452; texto = 'Cannot add or update a child row: a foreign key constraint fails'; }
  else if ((m = /no such table: (.+)/.exec(msg))) { code = 'ER_NO_SUCH_TABLE'; errno = 1146; texto = `Table '${m[1]}' doesn't exist`; }
  else if ((m = /no such column: (.+)/.exec(msg))) { code = 'ER_BAD_FIELD_ERROR'; errno = 1054; texto = `Unknown column '${m[1]}'`; }
  else if (/database is locked|database table is locked/.test(msg)) { code = 'ER_LOCK_WAIT_TIMEOUT'; errno = 1205; texto = 'O arquivo do banco está ocupado por outro programa.'; }
  else if (/readonly database|unable to open|disk I\/O error/.test(msg)) { code = 'ER_BANCO_EMBUTIDO'; errno = 1030; texto = `Não foi possível gravar no arquivo do banco: ${msg}`; }
  return Object.assign(new Error(`${texto}\n  [sqlite] ${msg}\n  [sql] ${sql.replace(/\s+/g, ' ').slice(0, 400)}`), { code, errno, sqlMessage: texto, sql });
}

function valor(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'number') return Number.isInteger(v) ? BigInt(v) : v; // inteiro vai como inteiro (LIMIT, ids)
  if (v instanceof Date) return formatar(new Date(v.getTime() - v.getTimezoneOffset() * 60000), true);
  if (Buffer.isBuffer(v) || typeof v === 'bigint' || typeof v === 'string') return v;
  return JSON.stringify(v);
}
const RESULTADO_VAZIO = () => ({ affectedRows: 0, insertId: 0, warningStatus: 0 });

/* ---------- um arquivo de banco ---------- */
class Banco {
  constructor(arquivo) {
    this.arquivo = arquivo;
    this.db = null;
    this.meta = { chaves: {}, atualiza: {} };
    this.variaveis = {}; // SET @x = ... dos scripts
    this.dono = null; // conexão com transação aberta
    this.esperando = [];
  }

  abrir() {
    if (this.db) return this.db;
    const { DatabaseSync } = carregarSqlite();
    try {
      if (this.arquivo !== ':memory:') fs.mkdirSync(path.dirname(this.arquivo), { recursive: true });
      this.db = new DatabaseSync(this.arquivo);
    } catch (e) {
      throw Object.assign(new Error(`Não foi possível abrir o banco em ${this.arquivo}: ${e.message}`), { code: 'ER_BANCO_EMBUTIDO' });
    }
    this.db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    registrarFuncoes(this.db);
    this.db.exec('CREATE TABLE IF NOT EXISTS _meta_mysql (tipo TEXT, tabela TEXT, nome TEXT, colunas TEXT)');
    this.lerMeta();
    return this.db;
  }

  // Guarda o que o SQLite esquece do CREATE TABLE do MySQL: nomes das chaves únicas
  // (para o erro de duplicado dizer qual foi) e colunas "ON UPDATE CURRENT_TIMESTAMP".
  lerMeta() {
    this.meta = { chaves: {}, atualiza: {} };
    for (const l of this.db.prepare('SELECT * FROM _meta_mysql').all()) {
      if (l.tipo === 'chave') (this.meta.chaves[l.tabela] ||= []).push({ nome: l.nome, colunas: l.colunas.split(',') });
      else (this.meta.atualiza[l.tabela] ||= []).push(l.nome);
    }
  }

  gravarMeta(tabela) {
    this.db.prepare('DELETE FROM _meta_mysql WHERE tabela = ?').run(tabela);
    const grava = this.db.prepare('INSERT INTO _meta_mysql VALUES (?, ?, ?, ?)');
    for (const k of this.meta.chaves[tabela] || []) grava.run('chave', tabela, k.nome, k.colunas.join(','));
    for (const c of this.meta.atualiza[tabela] || []) grava.run('atualiza', tabela, c, '');
  }

  limpar() { // DROP DATABASE: apaga tudo e começa de novo
    this.db.exec('PRAGMA foreign_keys = OFF;');
    const objetos = this.db.prepare("SELECT type, name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND type IN ('trigger', 'view', 'table')").all();
    for (const o of objetos) this.db.exec(`DROP ${o.type.toUpperCase()} IF EXISTS "${o.name}"`);
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec('CREATE TABLE IF NOT EXISTS _meta_mysql (tipo TEXT, tabela TEXT, nome TEXT, colunas TEXT)');
    this.meta = { chaves: {}, atualiza: {} };
    this.variaveis = {};
  }

  // UPDATE numa tabela com "ON UPDATE CURRENT_TIMESTAMP": preenche a coluna como o MySQL faria
  comAtualizacao(texto) {
    const up = /^\s*UPDATE\s+"?(\w+)"?\s+SET\s+/i.exec(texto);
    if (!up || !(this.meta.atualiza[up[1]] || []).length) return texto;
    const corpo = texto.slice(up[0].length);
    const sets = corpo.split(/\bWHERE\b/i)[0];
    const faltam = this.meta.atualiza[up[1]].filter((c) => !new RegExp(`(^|,)\\s*"?${c}"?\\s*=`, 'i').test(sets));
    return faltam.length ? `${up[0]}${faltam.map((c) => `"${c}" = NOW()`).join(', ')}, ${corpo}` : texto;
  }

  executarUma(s, textos, params) {
    // "?" com lista vira (?, ?, ?): IN (?) e VALUES ?
    const usados = [];
    let texto = s.replace(/\?/g, () => {
      const v = params.shift();
      if (Array.isArray(v)) {
        if (v.length && Array.isArray(v[0])) {
          return v.map((linha) => { usados.push(...linha.map(valor)); return `(${linha.map(() => '?').join(', ')})`; }).join(', ');
        }
        usados.push(...v.map(valor));
        return v.map(() => '?').join(', ') || 'NULL';
      }
      usados.push(valor(v));
      return '?';
    });
    texto = texto.replace(/@([A-Za-z_]\w*)(?!\s*:?=)/g, (m0, nome) => {
      if (!(nome in this.variaveis)) return m0;
      const v = this.variaveis[nome];
      if (v === null) return 'NULL';
      if (typeof v === 'number') return String(v);
      textos.push(String(v));
      return `${A}${textos.length - 1}${B}`;
    });
    const inicio = texto.trim();
    const atribuicao = /^SET\s+@([A-Za-z_]\w*)\s*:?=\s*([\s\S]+)$/i.exec(inicio);
    if (atribuicao) {
      const [linha] = this.executarUma(`SELECT ${atribuicao[2]} AS v`, textos, usados.map((u) => (typeof u === 'bigint' ? Number(u) : u)));
      this.variaveis[atribuicao[1]] = linha ? linha.v : null;
      return RESULTADO_VAZIO();
    }
    const chavesEstrangeiras = /^SET\s+FOREIGN_KEY_CHECKS\s*=\s*(\d)/i.exec(inicio);
    if (chavesEstrangeiras) { this.db.exec(`PRAGMA foreign_keys = ${chavesEstrangeiras[1] === '0' ? 'OFF' : 'ON'};`); return RESULTADO_VAZIO(); }
    if (/^(SET|USE|CREATE\s+DATABASE|LOCK\s+TABLES|UNLOCK\s+TABLES)\b/i.test(inicio)) return RESULTADO_VAZIO();
    if (/^DROP\s+DATABASE\b/i.test(inicio)) { this.limpar(); return RESULTADO_VAZIO(); }
    if (/^START\s+TRANSACTION\b/i.test(inicio)) texto = 'BEGIN';
    if (/^TRUNCATE\s+(TABLE\s+)?/i.test(inicio)) texto = inicio.replace(/^TRUNCATE\s+(TABLE\s+)?/i, 'DELETE FROM ');

    const depois = [];
    if (/^CREATE\s+TABLE\b/i.test(inicio)) {
      const t = traduzirTabela(inicio, textos, this.meta);
      texto = t.sql;
      depois.push(...t.indices, () => this.gravarMeta(t.tabela));
    } else {
      texto = traduzir(texto, textos).trim();
      const gatilho = /^CREATE\s+TRIGGER\s+("?\w+"?)\s+(BEFORE|AFTER)\s+(INSERT|UPDATE|DELETE)\s+ON\s+("?\w+"?)\s+FOR\s+EACH\s+ROW\s+([\s\S]+)$/i.exec(texto);
      if (gatilho) {
        if (/^BEGIN\b/i.test(gatilho[5])) throw Object.assign(new Error('Gatilho com BEGIN...END: escreva com um comando só.'), { code: 'ER_PARSE_ERROR' });
        texto = `CREATE TRIGGER ${gatilho[1]} ${gatilho[2]} ${gatilho[3]} ON ${gatilho[4]} FOR EACH ROW BEGIN ${this.comAtualizacao(gatilho[5])}; END`;
      }
      texto = texto.replace(/^CREATE\s+OR\s+REPLACE\s+VIEW\s+("?\w+"?)/i, (m0, v) => { this.db.exec(`DROP VIEW IF EXISTS ${v}`); return `CREATE VIEW ${v}`; });
      texto = this.comAtualizacao(texto);
      const apagaTabela = /^DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([\s\S]+)$/i.exec(texto);
      if (apagaTabela) {
        for (const nome of apagaTabela[1].split(',').map((x) => x.replace(/"/g, '').trim())) {
          depois.push(() => { delete this.meta.chaves[nome]; delete this.meta.atualiza[nome]; this.gravarMeta(nome); });
        }
      }
    }
    const final = desmascarar(texto, textos);
    try {
      const comando = this.db.prepare(final);
      let r;
      if (/^\s*(SELECT|WITH|PRAGMA|EXPLAIN|VALUES)\b/i.test(final)) {
        r = comando.all(...usados).map((l) => ({ ...l }));
      } else {
        const x = comando.run(...usados);
        const inseriu = /^\s*(INSERT|REPLACE)\b/i.test(final) && x.changes > 0;
        r = { affectedRows: Number(x.changes), insertId: inseriu ? Number(x.lastInsertRowid) : 0, warningStatus: 0 };
      }
      for (const passo of depois) (typeof passo === 'function' ? passo() : this.db.exec(passo));
      return r;
    } catch (e) {
      if (e.code === 'ER_PARSE_ERROR' && e.sqlMessage) throw e;
      throw erroMysql(e, final, this.meta);
    }
  }

  executar(sql, parametros) {
    this.abrir();
    const { texto, textos } = mascarar(String(sql));
    const params = parametros === undefined ? [] : (Array.isArray(parametros) ? [...parametros] : [parametros]);
    const resultados = dividirTopo(texto, ';').map((c) => this.executarUma(c, textos, params));
    return resultados.length === 1 ? resultados[0] : resultados;
  }

  /* Uma conexão só para o arquivo inteiro: enquanto uma transação está aberta, os outros
     pedidos esperam a vez (no MySQL, cada um teria a sua conexão). */
  async vez(conexao) {
    while (this.dono && this.dono !== conexao) await new Promise((ok) => this.esperando.push(ok));
  }

  liberar(conexao) {
    if (this.dono !== conexao) return;
    this.dono = null;
    for (const ok of this.esperando.splice(0)) ok();
  }
}

const bancos = new Map();
function bancoDoArquivo(arquivo) {
  const caminho = arquivo === ':memory:' ? arquivo : path.resolve(arquivo || path.join(__dirname, '..', 'dados', 'patinhas.db'));
  if (!bancos.has(caminho)) bancos.set(caminho, new Banco(caminho));
  return bancos.get(caminho);
}

/* ---------- a mesma API do mysql2/promise ---------- */
class Conexao {
  constructor(banco) { this.banco = banco; }

  async query(sql, parametros) {
    await this.banco.vez(this);
    return [this.banco.executar(sql, parametros), []];
  }

  execute(sql, parametros) { return this.query(sql, parametros); }

  async beginTransaction() {
    await this.banco.vez(this);
    this.banco.abrir().exec('BEGIN');
    this.banco.dono = this;
  }

  async commit() {
    if (this.banco.dono !== this) return;
    try { this.banco.db.exec('COMMIT'); } finally { this.banco.liberar(this); }
  }

  async rollback() {
    if (this.banco.dono !== this) return;
    try { this.banco.db.exec('ROLLBACK'); } finally { this.banco.liberar(this); }
  }

  release() {
    if (this.banco.dono !== this) return;
    try { this.banco.db.exec('ROLLBACK'); } catch { /* já encerrada */ }
    this.banco.liberar(this);
  }

  async end() { this.release(); }

  on() { return this; }
}

function createPool(opcoes = {}) {
  const banco = bancoDoArquivo(opcoes.arquivo);
  const principal = new Conexao(banco);
  return {
    arquivo: banco.arquivo,
    query: (sql, parametros) => principal.query(sql, parametros),
    execute: (sql, parametros) => principal.query(sql, parametros),
    async getConnection() { return new Conexao(banco); },
    async end() {},
    on() { return this; },
  };
}

async function createConnection(opcoes = {}) {
  return new Conexao(bancoDoArquivo(opcoes.arquivo));
}

/** Fecha o arquivo (usado antes de apagar o banco para recriar). */
function fechar(arquivo) {
  const banco = bancoDoArquivo(arquivo);
  if (banco.db) { banco.db.close(); banco.db = null; }
}

module.exports = { createPool, createConnection, fechar, traduzir, mascarar, desmascarar };
