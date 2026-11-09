// Configuração lida do arquivo Servidor/.env (copie de .env.exemplo).
const path = require('node:path');

const raiz = path.join(__dirname, '..');
try {
  process.loadEnvFile(path.join(raiz, '.env'));
} catch {
  // sem .env: usa os valores padrão de desenvolvimento
}

const producao = process.env.NODE_ENV === 'production';
const segredo = process.env.SESSAO_SEGREDO;
if (producao && (!segredo || segredo.length < 32)) {
  throw new Error('Defina SESSAO_SEGREDO no .env com pelo menos 32 caracteres antes de rodar em produção.');
}

module.exports = {
  porta: Number(process.env.PORTA) || 3000,
  producao,
  segredoSessao: segredo || 'patinhas-segredo-so-para-desenvolvimento',
  banco: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORTA) || 3306,
    user: process.env.DB_USUARIO || 'root',
    password: process.env.DB_SENHA || '',
    database: process.env.DB_NOME || 'patinhas',
  },
  pastas: {
    web: path.join(raiz, '..', 'Web'),
    banco: path.join(raiz, '..', 'Banco de dados'),
    uploads: path.join(raiz, 'uploads'),
    privado: path.join(raiz, 'privado'), // fora de uploads: nunca é servido pelo site
  },
  // Contato enviado ao OpenStreetMap junto com as buscas (pedido da política de uso do Nominatim)
  contato: process.env.CONTATO_EMAIL || '',
  // Endereço público do site, usado nos links enviados por e-mail
  urlPublica: (process.env.URL_PUBLICA || '').replace(/\/$/, ''),
  versaoTermos: '2026-10',
};
