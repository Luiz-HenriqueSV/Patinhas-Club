// Fotos e documentos enviados pelos formulários.
// Públicas (fotos de animais, logos, capas): Servidor/uploads, servidas em /uploads.
// Privadas (documentos da ONG, provas de denúncia): Servidor/privado, nunca servidas.
const fs = require('node:fs');
const crypto = require('node:crypto');
const multer = require('multer');
const config = require('../config');
const { ErroValidacao } = require('../util/validacao');

fs.mkdirSync(config.pastas.uploads, { recursive: true });
fs.mkdirSync(config.pastas.privado, { recursive: true });

const EXTENSOES = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif',
  'image/heic': '.heic', 'image/heif': '.heif', 'application/pdf': '.pdf',
  'video/mp4': '.mp4', 'video/quicktime': '.mov', 'video/webm': '.webm',
};
const CAMPOS = new Set(['foto', 'fotos', 'logo', 'capa', 'doc_identificacao', 'doc_atuacao']);
const DOCUMENTOS = new Set(['doc_identificacao', 'doc_atuacao']);

const privado = (req, campo) => Boolean(req.uploadPrivado) || DOCUMENTOS.has(campo);

const receber = multer({
  storage: multer.diskStorage({
    destination: (req, arquivo, pronto) => pronto(null, privado(req, arquivo.fieldname) ? config.pastas.privado : config.pastas.uploads),
    filename: (req, arquivo, pronto) => pronto(null, `${Date.now().toString(36)}-${crypto.randomBytes(8).toString('hex')}${EXTENSOES[arquivo.mimetype]}`),
  }),
  limits: { fileSize: 20 * 1024 * 1024, files: 10, fields: 100 },
  fileFilter: (req, arquivo, pronto) => {
    const tipo = arquivo.mimetype;
    const aceito = CAMPOS.has(arquivo.fieldname) && EXTENSOES[tipo] && (
      tipo.startsWith('image/')
      || (tipo === 'application/pdf' && DOCUMENTOS.has(arquivo.fieldname))
      || (tipo.startsWith('video/') && req.uploadPrivado)
    );
    if (aceito) return pronto(null, true);
    return pronto(new ErroValidacao({ [arquivo.fieldname]: 'Formato de arquivo não aceito. Envie uma imagem (JPG, PNG ou WEBP).' }));
  },
}).any();

const arquivos = (req, campo) => (req.files || []).filter((a) => a.fieldname === campo);
const arquivo = (req, campo) => arquivos(req, campo)[0] || null;

/** Caminho gravado no banco: "/uploads/arquivo.jpg" (público) ou "privado/arquivo.pdf". */
const caminho = (a) => (a.destination === config.pastas.privado ? `privado/${a.filename}` : `/uploads/${a.filename}`);

/** Se a validação falhar depois do upload, os arquivos não ficam largados no disco. */
function descartar(req) {
  for (const a of req.files || []) fs.unlink(a.path, () => {});
}

module.exports = { receber, arquivos, arquivo, caminho, descartar };
