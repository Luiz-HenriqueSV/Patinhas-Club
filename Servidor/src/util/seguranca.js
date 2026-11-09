// Senhas com scrypt (nativo do Node, sem dependência extra) e tokens de uso único.
const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);
const PARAMETROS = { N: 16384, r: 8, p: 1 };
const TAMANHO = 64;

/** Formato guardado no banco: scrypt$N$r$p$sal$hash (base64). */
async function gerarHashSenha(senha) {
  const sal = crypto.randomBytes(16);
  const hash = await scrypt(senha, sal, TAMANHO, PARAMETROS);
  return ['scrypt', PARAMETROS.N, PARAMETROS.r, PARAMETROS.p, sal.toString('base64'), hash.toString('base64')].join('$');
}

async function conferirSenha(senha, guardado) {
  if (!senha || !guardado) return false;
  const [algoritmo, N, r, p, sal, hash] = String(guardado).split('$');
  if (algoritmo !== 'scrypt' || !sal || !hash) return false;
  const esperado = Buffer.from(hash, 'base64');
  const calculado = await scrypt(senha, Buffer.from(sal, 'base64'), esperado.length, { N: Number(N), r: Number(r), p: Number(p) });
  return crypto.timingSafeEqual(esperado, calculado);
}

/** Token que vai no link (só o hash fica no banco). */
const gerarToken = () => crypto.randomBytes(32).toString('base64url');
const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

module.exports = { gerarHashSenha, conferirSenha, gerarToken, hashToken };
