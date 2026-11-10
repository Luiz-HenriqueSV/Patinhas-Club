-- =============================================================================
--  Patinhas Club — esquema do banco de dados
--  Funciona no MySQL 8.0+ e no MariaDB 10.4+ (o do XAMPP).
--
--  Ordem: 01-esquema.sql (este arquivo) -> 02-dados-iniciais.sql
--  Pelo terminal:  mysql -u root -p < "Banco de dados/01-esquema.sql"
--  Ou pelo servidor: npm run banco  (roda os dois arquivos)
--
--  ATENÇÃO: este script APAGA e recria o banco "patinhas".
-- =============================================================================

SET NAMES utf8mb4;

DROP DATABASE IF EXISTS patinhas;
CREATE DATABASE patinhas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE patinhas;


-- -----------------------------------------------------------------------------
-- 1. LOCALIZAÇÃO
-- Estados e cidades são tabelas (filtros, área de atendimento, código IBGE).
-- O bairro é texto no endereço: Correios e mapa escrevem o mesmo bairro de
-- jeitos diferentes e uma tabela própria só acumularia duplicatas.
-- Cidades novas entram sozinhas quando alguém usa o CEP ou o GPS.
-- -----------------------------------------------------------------------------

CREATE TABLE estados (
  id          TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sigla       CHAR(2)          NOT NULL,
  nome        VARCHAR(50)      NOT NULL,
  codigo_ibge TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_estados_sigla (sigla),
  UNIQUE KEY uq_estados_ibge (codigo_ibge)
) ENGINE=InnoDB;

CREATE TABLE cidades (
  id          INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  estado_id   TINYINT UNSIGNED NOT NULL,
  nome        VARCHAR(100)     NOT NULL,
  codigo_ibge INT UNSIGNED     NULL,
  latitude    DECIMAL(9,6)     NULL COMMENT 'Centro da cidade',
  longitude   DECIMAL(9,6)     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cidades_estado_nome (estado_id, nome),
  UNIQUE KEY uq_cidades_ibge (codigo_ibge),
  CONSTRAINT fk_cidades_estado_id FOREIGN KEY (estado_id) REFERENCES estados (id)
) ENGINE=InnoDB;

CREATE TABLE enderecos (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  cidade_id   INT UNSIGNED  NOT NULL,
  cep         CHAR(8)       NULL COMMENT 'Só números',
  logradouro  VARCHAR(150)  NULL,
  numero      VARCHAR(10)   NULL,
  complemento VARCHAR(60)   NULL,
  bairro      VARCHAR(80)   NULL,
  referencia  VARCHAR(150)  NULL COMMENT 'Ponto de referência: "perto da padaria"',
  latitude    DECIMAL(9,6)  NULL,
  longitude   DECIMAL(9,6)  NULL,
  precisao_m  SMALLINT UNSIGNED NULL COMMENT 'Raio de incerteza do GPS, em metros',
  origem      ENUM('gps','mapa','cep','digitado') NOT NULL DEFAULT 'digitado'
              COMMENT 'gps = aparelho; mapa = pino ajustado; cep/digitado = calculado pelo endereço',
  criado_em   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_enderecos_coordenadas (latitude, longitude),
  CONSTRAINT fk_enderecos_cidade_id FOREIGN KEY (cidade_id) REFERENCES cidades (id),
  CONSTRAINT ck_enderecos_coordenadas CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))
) ENGINE=InnoDB;

CREATE TABLE ceps (
  cep           CHAR(8)      NOT NULL,
  cidade_id     INT UNSIGNED NOT NULL,
  logradouro    VARCHAR(150) NULL,
  complemento   VARCHAR(100) NULL,
  bairro        VARCHAR(80)  NULL,
  latitude      DECIMAL(9,6) NULL,
  longitude     DECIMAL(9,6) NULL,
  atualizado_em DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (cep),
  CONSTRAINT fk_ceps_cidade_id FOREIGN KEY (cidade_id) REFERENCES cidades (id)
) ENGINE=InnoDB COMMENT='Cache das consultas à ViaCEP (evita repetir a mesma busca)';


-- -----------------------------------------------------------------------------
-- 2. CATÁLOGOS (listas fixas usadas pelos formulários)
-- O campo "codigo" é o mesmo value dos formulários do site.
-- -----------------------------------------------------------------------------

CREATE TABLE especies (
  id     TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(20)      NOT NULL,
  nome   VARCHAR(30)      NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_especies_codigo (codigo)
) ENGINE=InnoDB;

CREATE TABLE racas (
  id         SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  especie_id TINYINT UNSIGNED  NOT NULL,
  nome       VARCHAR(60)       NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_racas_especie_nome (especie_id, nome),
  CONSTRAINT fk_racas_especie_id FOREIGN KEY (especie_id) REFERENCES especies (id)
) ENGINE=InnoDB;

CREATE TABLE necessidades_especiais (
  id        SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome      VARCHAR(80)       NOT NULL,
  descricao VARCHAR(255)      NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_necessidades_nome (nome)
) ENGINE=InnoDB;

CREATE TABLE servicos (
  id     SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(30)       NOT NULL,
  nome   VARCHAR(80)       NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_servicos_codigo (codigo)
) ENGINE=InnoDB;


-- -----------------------------------------------------------------------------
-- 3. USUÁRIOS E ACESSO
-- -----------------------------------------------------------------------------

CREATE TABLE usuarios (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tipo          ENUM('adotante','ong','admin') NOT NULL,
  email         VARCHAR(150) NOT NULL,
  senha_hash    VARCHAR(255) NULL COMMENT 'scrypt. NULL até a ONG aprovada criar a senha',
  ativo         BOOLEAN      NOT NULL DEFAULT TRUE,
  ultimo_acesso DATETIME     NULL,
  criado_em     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email)
) ENGINE=InnoDB;

CREATE TABLE adotantes (
  usuario_id      INT UNSIGNED NOT NULL,
  nome            VARCHAR(120) NOT NULL,
  cpf             CHAR(11)     NULL COMMENT 'Opcional no cadastro; único quando informado',
  telefone        VARCHAR(11)  NOT NULL COMMENT 'Só números, com DDD',
  data_nascimento DATE         NOT NULL,
  endereco_id     INT UNSIGNED NULL,
  moradia         ENUM('casa','casa-quintal','apartamento') NOT NULL,
  tem_animais     SET('cao','gato','outros') NULL,
  tem_criancas    BOOLEAN      NULL,
  procura         SET('cao','gato','ainda-nao-sei') NULL,
  recebe_alertas  BOOLEAN      NOT NULL DEFAULT FALSE,
  PRIMARY KEY (usuario_id),
  UNIQUE KEY uq_adotantes_cpf (cpf),
  CONSTRAINT fk_adotantes_usuario_id  FOREIGN KEY (usuario_id)  REFERENCES usuarios (id)  ON DELETE CASCADE,
  CONSTRAINT fk_adotantes_endereco_id FOREIGN KEY (endereco_id) REFERENCES enderecos (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE ongs (
  usuario_id         INT UNSIGNED      NOT NULL,
  tipo               ENUM('ong','protetor','abrigo') NOT NULL,
  nome               VARCHAR(150)      NOT NULL,
  documento          VARCHAR(14)       NOT NULL COMMENT 'CNPJ (ONG e abrigo) ou CPF (protetor), só números',
  ano_fundacao       SMALLINT UNSIGNED NULL,
  apresentacao       TEXT              NOT NULL,
  logo_url           VARCHAR(255)      NULL,
  responsavel        VARCHAR(120)      NOT NULL,
  cargo              VARCHAR(60)       NULL,
  telefone           VARCHAR(11)       NOT NULL,
  rede_social        VARCHAR(150)      NULL,
  endereco_id        INT UNSIGNED      NOT NULL,
  ocultar_endereco   BOOLEAN           NOT NULL DEFAULT FALSE COMMENT 'Mostra só bairro e cidade no site',
  quantidade_animais ENUM('ate-10','11-30','31-100','mais-100') NULL,
  status_verificacao ENUM('pendente','verificada','recusada') NOT NULL DEFAULT 'pendente',
  verificada_em      DATETIME          NULL,
  motivo_recusa      VARCHAR(255)      NULL COMMENT 'Preenchido quando a equipe recusa o cadastro',
  recebe_novidades   BOOLEAN           NOT NULL DEFAULT FALSE,
  PRIMARY KEY (usuario_id),
  UNIQUE KEY uq_ongs_documento (documento),
  KEY idx_ongs_status (status_verificacao),
  CONSTRAINT fk_ongs_usuario_id  FOREIGN KEY (usuario_id)  REFERENCES usuarios (id) ON DELETE CASCADE,
  CONSTRAINT fk_ongs_endereco_id FOREIGN KEY (endereco_id) REFERENCES enderecos (id),
  CONSTRAINT ck_ongs_ano CHECK (ano_fundacao IS NULL OR ano_fundacao BETWEEN 1900 AND 2100)
) ENGINE=InnoDB;

-- Equipe do Patinhas Club: valida ONGs, analisa denúncias e atende o suporte
CREATE TABLE administradores (
  usuario_id INT UNSIGNED NOT NULL,
  nome       VARCHAR(120) NOT NULL,
  PRIMARY KEY (usuario_id),
  CONSTRAINT fk_administradores_usuario_id FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE ong_documentos (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ong_id     INT UNSIGNED NOT NULL,
  tipo       ENUM('identificacao','atuacao') NOT NULL,
  arquivo    VARCHAR(255) NOT NULL COMMENT 'Pasta privada: nunca é servido pelo site',
  status     ENUM('pendente','aprovado','recusado') NOT NULL DEFAULT 'pendente',
  enviado_em DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_ong_documentos_ong_id FOREIGN KEY (ong_id) REFERENCES ongs (usuario_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE ong_areas_atendimento (
  ong_id    INT UNSIGNED NOT NULL,
  cidade_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (ong_id, cidade_id),
  CONSTRAINT fk_ong_areas_atendimento_ong_id    FOREIGN KEY (ong_id)    REFERENCES ongs (usuario_id) ON DELETE CASCADE,
  CONSTRAINT fk_ong_areas_atendimento_cidade_id FOREIGN KEY (cidade_id) REFERENCES cidades (id)      ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE ong_especie (
  ong_id     INT UNSIGNED     NOT NULL,
  especie_id TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (ong_id, especie_id),
  CONSTRAINT fk_ong_especie_ong_id     FOREIGN KEY (ong_id)     REFERENCES ongs (usuario_id) ON DELETE CASCADE,
  CONSTRAINT fk_ong_especie_especie_id FOREIGN KEY (especie_id) REFERENCES especies (id)
) ENGINE=InnoDB;

CREATE TABLE ong_servico (
  ong_id     INT UNSIGNED      NOT NULL,
  servico_id SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (ong_id, servico_id),
  CONSTRAINT fk_ong_servico_ong_id     FOREIGN KEY (ong_id)     REFERENCES ongs (usuario_id) ON DELETE CASCADE,
  CONSTRAINT fk_ong_servico_servico_id FOREIGN KEY (servico_id) REFERENCES servicos (id)
) ENGINE=InnoDB;

CREATE TABLE notificacoes (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  tipo       ENUM('pedido_adocao','campanha','anuncio','sistema') NOT NULL,
  titulo     VARCHAR(120) NOT NULL,
  mensagem   VARCHAR(255) NOT NULL,
  link       VARCHAR(255) NULL,
  lida       BOOLEAN      NOT NULL DEFAULT FALSE,
  criado_em  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notificacoes_usuario (usuario_id, lida),
  CONSTRAINT fk_notificacoes_usuario_id FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE termos_aceite (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  tipo       ENUM('termos_uso','privacidade','declaracao_veracidade') NOT NULL,
  versao     VARCHAR(20)  NOT NULL,
  aceito_em  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip         VARCHAR(45)  NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_termos_aceite_usuario_id FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE recuperacao_senha (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64)     NOT NULL COMMENT 'SHA-256 do token; o token mesmo só vai no link',
  expira_em  DATETIME     NOT NULL,
  usado_em   DATETIME     NULL,
  criado_em  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_recuperacao_token (token_hash),
  CONSTRAINT fk_recuperacao_senha_usuario_id FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB;


-- -----------------------------------------------------------------------------
-- 4. ANIMAIS PARA ADOÇÃO
-- SET guarda as marcações de lista fixa dos formulários (saúde, jeito...);
-- tabelas associativas ficam para o que é entidade (necessidades, serviços).
-- -----------------------------------------------------------------------------

CREATE TABLE animais (
  id                     INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  ong_id                 INT UNSIGNED      NOT NULL,
  especie_id             TINYINT UNSIGNED  NOT NULL,
  raca_id                SMALLINT UNSIGNED NULL,
  endereco_id            INT UNSIGNED      NULL COMMENT 'NULL = o animal está no endereço da ONG',
  nome                   VARCHAR(80)       NOT NULL,
  sexo                   ENUM('macho','femea') NULL,
  porte                  ENUM('pequeno','medio','grande') NULL,
  faixa_etaria           ENUM('filhote','adulto','idoso') NULL,
  idade_aproximada       VARCHAR(30)       NULL COMMENT 'Ex.: "3 anos", "5 meses"',
  cor                    VARCHAR(80)       NULL,
  historia               TEXT              NULL,
  saude                  SET('vacinado','vermifugado','castrado','microchip','fiv-felv') NULL,
  jeito                  SET('brincalhao','calmo','carinhoso','timido','independente','agitado') NULL,
  convive                SET('criancas','caes','gatos') NULL,
  necessidades_especiais BOOLEAN           NOT NULL DEFAULT FALSE,
  cuidados               TEXT              NULL,
  taxa                   ENUM('gratuita','voluntaria') NOT NULL DEFAULT 'gratuita',
  requisitos             SET('telas','quintal','visita','termo') NULL,
  observacoes            TEXT              NULL,
  status                 ENUM('rascunho','disponivel','em_processo','adotado') NOT NULL DEFAULT 'rascunho',
  criado_em              DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em          DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_animais_filtros (status, especie_id, porte, faixa_etaria),
  CONSTRAINT fk_animais_ong_id      FOREIGN KEY (ong_id)      REFERENCES ongs (usuario_id),
  CONSTRAINT fk_animais_especie_id  FOREIGN KEY (especie_id)  REFERENCES especies (id),
  CONSTRAINT fk_animais_raca_id     FOREIGN KEY (raca_id)     REFERENCES racas (id)     ON DELETE SET NULL,
  CONSTRAINT fk_animais_endereco_id FOREIGN KEY (endereco_id) REFERENCES enderecos (id) ON DELETE SET NULL,
  -- Rascunho pode ficar incompleto; para publicar, os dados do cartão são obrigatórios
  CONSTRAINT ck_animais_publicavel CHECK (status = 'rascunho' OR (sexo IS NOT NULL AND porte IS NOT NULL
    AND faixa_etaria IS NOT NULL AND historia IS NOT NULL))
) ENGINE=InnoDB;

CREATE TABLE animal_fotos (
  id            INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  animal_id     INT UNSIGNED     NOT NULL,
  url           VARCHAR(255)     NOT NULL,
  principal     BOOLEAN          NOT NULL DEFAULT FALSE,
  ordem         TINYINT UNSIGNED NOT NULL DEFAULT 0,
  enquadramento ENUM('centro','topo') NOT NULL DEFAULT 'centro' COMMENT 'topo = rosto no alto da foto',
  PRIMARY KEY (id),
  KEY idx_animal_fotos_animal (animal_id, principal, ordem),
  CONSTRAINT fk_animal_fotos_animal_id FOREIGN KEY (animal_id) REFERENCES animais (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE animal_necessidade (
  animal_id      INT UNSIGNED      NOT NULL,
  necessidade_id SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (animal_id, necessidade_id),
  CONSTRAINT fk_animal_necessidade_animal_id      FOREIGN KEY (animal_id)      REFERENCES animais (id) ON DELETE CASCADE,
  CONSTRAINT fk_animal_necessidade_necessidade_id FOREIGN KEY (necessidade_id) REFERENCES necessidades_especiais (id)
) ENGINE=InnoDB;

CREATE TABLE animal_vacinas (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  animal_id      INT UNSIGNED NOT NULL,
  nome           VARCHAR(80)  NOT NULL,
  data_aplicacao DATE         NOT NULL,
  proxima_dose   DATE         NULL,
  observacao     VARCHAR(255) NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_animal_vacinas_animal_id FOREIGN KEY (animal_id) REFERENCES animais (id) ON DELETE CASCADE,
  CONSTRAINT ck_animal_vacinas_datas CHECK (proxima_dose IS NULL OR proxima_dose >= data_aplicacao)
) ENGINE=InnoDB;


-- -----------------------------------------------------------------------------
-- 5. ADOÇÃO
-- O pedido pode ser feito sem conta (nome e contato ficam no pedido).
-- Quem tem conta tem o pedido ligado ao perfil e acompanha em "Minha conta".
-- -----------------------------------------------------------------------------

CREATE TABLE pedidos_adocao (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  animal_id      INT UNSIGNED NOT NULL,
  adotante_id    INT UNSIGNED NULL COMMENT 'NULL quando o pedido foi feito sem conta',
  nome           VARCHAR(120) NOT NULL,
  telefone       VARCHAR(11)  NOT NULL,
  email          VARCHAR(150) NULL,
  moradia        ENUM('casa','casa-quintal','apartamento') NOT NULL,
  outros_animais BOOLEAN      NOT NULL DEFAULT FALSE,
  mensagem       VARCHAR(500) NULL,
  status_atual   ENUM('enviado','em_analise','visita_agendada','aprovado','recusado','cancelado') NOT NULL DEFAULT 'enviado',
  criado_em      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pedidos_animal_status (animal_id, status_atual),
  KEY idx_pedidos_adotante (adotante_id),
  CONSTRAINT fk_pedidos_adocao_animal_id   FOREIGN KEY (animal_id)   REFERENCES animais (id)               ON DELETE CASCADE,
  CONSTRAINT fk_pedidos_adocao_adotante_id FOREIGN KEY (adotante_id) REFERENCES adotantes (usuario_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE pedido_andamento (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_id  INT UNSIGNED NOT NULL,
  status     ENUM('enviado','em_analise','visita_agendada','aprovado','recusado','cancelado') NOT NULL,
  observacao VARCHAR(255) NULL,
  criado_em  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_andamento_pedido (pedido_id, criado_em),
  CONSTRAINT fk_pedido_andamento_pedido_id FOREIGN KEY (pedido_id) REFERENCES pedidos_adocao (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE visitas (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_id    INT UNSIGNED NOT NULL,
  data_hora    DATETIME     NOT NULL,
  local_visita VARCHAR(150) NULL,
  status       ENUM('agendada','realizada','cancelada') NOT NULL DEFAULT 'agendada',
  PRIMARY KEY (id),
  CONSTRAINT fk_visitas_pedido_id FOREIGN KEY (pedido_id) REFERENCES pedidos_adocao (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE favoritos (
  adotante_id INT UNSIGNED NOT NULL,
  animal_id   INT UNSIGNED NOT NULL,
  criado_em   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (adotante_id, animal_id),
  CONSTRAINT fk_favoritos_adotante_id FOREIGN KEY (adotante_id) REFERENCES adotantes (usuario_id) ON DELETE CASCADE,
  CONSTRAINT fk_favoritos_animal_id   FOREIGN KEY (animal_id)   REFERENCES animais (id)           ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE alertas_lista_espera (
  id               INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  adotante_id      INT UNSIGNED     NULL COMMENT 'NULL quando a inscrição foi feita sem conta',
  nome             VARCHAR(120)     NOT NULL,
  email            VARCHAR(150)     NOT NULL,
  telefone         VARCHAR(11)      NULL,
  especie_id       TINYINT UNSIGNED NOT NULL,
  portes           SET('pequeno','medio','grande') NULL COMMENT 'Vazio = qualquer porte',
  idades           SET('filhote','adulto','idoso') NULL COMMENT 'Vazio = qualquer idade',
  sexo             ENUM('macho','femea') NULL COMMENT 'NULL = tanto faz',
  cidade_id        INT UNSIGNED     NULL,
  aceita_especiais BOOLEAN          NOT NULL DEFAULT FALSE,
  avisar_por       SET('email','whatsapp') NOT NULL DEFAULT 'email',
  ativo            BOOLEAN          NOT NULL DEFAULT TRUE,
  criado_em        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_alertas_busca (ativo, especie_id),
  CONSTRAINT fk_alertas_lista_espera_adotante_id FOREIGN KEY (adotante_id) REFERENCES adotantes (usuario_id) ON DELETE CASCADE,
  CONSTRAINT fk_alertas_lista_espera_especie_id  FOREIGN KEY (especie_id)  REFERENCES especies (id),
  CONSTRAINT fk_alertas_lista_espera_cidade_id   FOREIGN KEY (cidade_id)   REFERENCES cidades (id)            ON DELETE SET NULL
) ENGINE=InnoDB;


-- -----------------------------------------------------------------------------
-- 6. PERDIDOS E ACHADOS
-- -----------------------------------------------------------------------------

CREATE TABLE anuncios_perdidos_achados (
  id                INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  usuario_id        INT UNSIGNED     NULL COMMENT 'NULL quando publicado sem conta',
  tipo              ENUM('perdido','encontrado') NOT NULL DEFAULT 'perdido',
  especie_id        TINYINT UNSIGNED NOT NULL,
  endereco_id       INT UNSIGNED     NOT NULL COMMENT 'Onde foi visto pela última vez',
  nome_animal       VARCHAR(80)      NULL,
  raca              VARCHAR(60)      NULL,
  porte             ENUM('pequeno','medio','grande') NOT NULL,
  faixa_etaria      ENUM('filhote','adulto','idoso') NOT NULL,
  sexo              ENUM('desconhecido','macho','femea') NOT NULL DEFAULT 'desconhecido',
  cor               VARCHAR(80)      NOT NULL,
  caracteristicas   TEXT             NULL,
  tem_identificacao BOOLEAN          NOT NULL DEFAULT FALSE,
  data_ocorrencia   DATE             NOT NULL,
  hora_ocorrencia   TIME             NULL,
  circunstancias    TEXT             NULL,
  contato_nome      VARCHAR(120)     NOT NULL,
  contato_telefone  VARCHAR(11)      NOT NULL,
  contato_email     VARCHAR(150)     NULL,
  status            ENUM('aberto','resolvido') NOT NULL DEFAULT 'aberto',
  desfecho          VARCHAR(255)     NULL COMMENT 'Como terminou, mostrado no mural',
  resolvido_em      DATETIME         NULL,
  criado_em         DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_anuncios_status_tipo (status, tipo, criado_em),
  CONSTRAINT fk_anuncios_perdidos_achados_usuario_id  FOREIGN KEY (usuario_id)  REFERENCES usuarios (id)  ON DELETE SET NULL,
  CONSTRAINT fk_anuncios_perdidos_achados_especie_id  FOREIGN KEY (especie_id)  REFERENCES especies (id),
  CONSTRAINT fk_anuncios_perdidos_achados_endereco_id FOREIGN KEY (endereco_id) REFERENCES enderecos (id)
) ENGINE=InnoDB;

CREATE TABLE anuncio_fotos (
  id         INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  anuncio_id INT UNSIGNED     NOT NULL,
  url        VARCHAR(255)     NOT NULL,
  ordem      TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT fk_anuncio_fotos_anuncio_id FOREIGN KEY (anuncio_id) REFERENCES anuncios_perdidos_achados (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE avisos_encontrei (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  anuncio_id      INT UNSIGNED  NOT NULL,
  usuario_id      INT UNSIGNED  NULL,
  local_descricao VARCHAR(200)  NOT NULL COMMENT 'O "Onde você viu?" do formulário',
  latitude        DECIMAL(9,6)  NULL,
  longitude       DECIMAL(9,6)  NULL,
  precisao_m      SMALLINT UNSIGNED NULL,
  visto_em        DATETIME      NOT NULL,
  estado_animal   ENUM('bem','assustado','ferido','desnutrido') NOT NULL,
  observacoes     TEXT          NULL,
  foto_url        VARCHAR(255)  NULL,
  contato         VARCHAR(150)  NOT NULL,
  lido            BOOLEAN       NOT NULL DEFAULT FALSE,
  criado_em       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_avisos_anuncio (anuncio_id, criado_em),
  CONSTRAINT fk_avisos_encontrei_anuncio_id FOREIGN KEY (anuncio_id) REFERENCES anuncios_perdidos_achados (id) ON DELETE CASCADE,
  CONSTRAINT fk_avisos_encontrei_usuario_id FOREIGN KEY (usuario_id) REFERENCES usuarios (id)                  ON DELETE SET NULL,
  CONSTRAINT ck_avisos_coordenadas CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))
) ENGINE=InnoDB;


-- -----------------------------------------------------------------------------
-- 7. CAMPANHAS
-- -----------------------------------------------------------------------------

CREATE TABLE campanhas (
  id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  ong_id       INT UNSIGNED  NOT NULL,
  tipo         ENUM('arrecadacao','vaquinha','evento','voluntariado','saude') NOT NULL,
  titulo       VARCHAR(150)  NOT NULL,
  descricao    TEXT          NOT NULL,
  capa_url     VARCHAR(255)  NULL,
  meta_texto   VARCHAR(100)  NULL COMMENT 'A meta como a ONG escreveu: "500 kg de ração"',
  meta_valor   DECIMAL(10,2) NULL,
  meta_unidade VARCHAR(30)   NULL COMMENT 'R$, kg, vagas, lares, itens...',
  arrecadado   DECIMAL(10,2) NOT NULL DEFAULT 0,
  data_inicio  DATE          NOT NULL,
  data_fim     DATE          NOT NULL,
  local_texto  VARCHAR(150)  NULL,
  como_ajudar  TEXT          NOT NULL COMMENT 'Um passo por linha',
  contato      VARCHAR(150)  NULL,
  status       ENUM('rascunho','aberta','encerrada') NOT NULL DEFAULT 'aberta',
  criado_em    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_campanhas_status (status, data_fim),
  CONSTRAINT fk_campanhas_ong_id FOREIGN KEY (ong_id) REFERENCES ongs (usuario_id) ON DELETE CASCADE,
  CONSTRAINT ck_campanhas_datas CHECK (data_fim >= data_inicio),
  CONSTRAINT ck_campanhas_valores CHECK (arrecadado >= 0 AND (meta_valor IS NULL OR meta_valor > 0))
) ENGINE=InnoDB;

CREATE TABLE campanha_voluntarios (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  campanha_id INT UNSIGNED NOT NULL,
  usuario_id  INT UNSIGNED NOT NULL,
  mensagem    VARCHAR(255) NULL,
  criado_em   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_campanha_usuario (campanha_id, usuario_id),
  CONSTRAINT fk_campanha_voluntarios_campanha_id FOREIGN KEY (campanha_id) REFERENCES campanhas (id) ON DELETE CASCADE,
  CONSTRAINT fk_campanha_voluntarios_usuario_id  FOREIGN KEY (usuario_id)  REFERENCES usuarios (id)  ON DELETE CASCADE
) ENGINE=InnoDB;


-- -----------------------------------------------------------------------------
-- 8. DENÚNCIAS
-- Podem ser anônimas. As fotos e vídeos ficam numa pasta privada.
-- -----------------------------------------------------------------------------

CREATE TABLE denuncias (
  id                   INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  usuario_id           INT UNSIGNED      NULL,
  endereco_id          INT UNSIGNED      NOT NULL,
  tipo_ocorrencia      ENUM('abandono','maus-tratos','risco','adocao-irregular','outro') NOT NULL,
  quantidade_animais   SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  ainda_no_local       ENUM('sim','nao','nao-sei') NULL,
  situacao_animal      TEXT              NOT NULL COMMENT 'O que a pessoa viu',
  especie_id           TINYINT UNSIGNED  NULL,
  porte                ENUM('pequeno','medio','grande') NULL,
  caracteristicas      VARCHAR(255)      NULL,
  tem_identificacao    BOOLEAN           NOT NULL DEFAULT FALSE,
  data_ocorrencia      DATE              NOT NULL,
  hora_ocorrencia      TIME              NULL,
  denunciante_nome     VARCHAR(120)      NULL,
  denunciante_telefone VARCHAR(11)       NULL,
  denunciante_email    VARCHAR(150)      NULL,
  receber_andamento    BOOLEAN           NOT NULL DEFAULT FALSE,
  status               ENUM('recebida','em_analise','encaminhada','arquivada') NOT NULL DEFAULT 'recebida',
  parecer              VARCHAR(500)      NULL COMMENT 'Anotação da equipe ao analisar',
  criado_em            DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_denuncias_status (status, criado_em),
  CONSTRAINT fk_denuncias_usuario_id  FOREIGN KEY (usuario_id)  REFERENCES usuarios (id)  ON DELETE SET NULL,
  CONSTRAINT fk_denuncias_endereco_id FOREIGN KEY (endereco_id) REFERENCES enderecos (id),
  CONSTRAINT fk_denuncias_especie_id  FOREIGN KEY (especie_id)  REFERENCES especies (id)  ON DELETE SET NULL,
  CONSTRAINT ck_denuncias_quantidade CHECK (quantidade_animais >= 1)
) ENGINE=InnoDB;

CREATE TABLE denuncia_midias (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  denuncia_id INT UNSIGNED NOT NULL,
  arquivo     VARCHAR(255) NOT NULL COMMENT 'Pasta privada: só a equipe tem acesso',
  tipo        ENUM('foto','video') NOT NULL DEFAULT 'foto',
  PRIMARY KEY (id),
  CONSTRAINT fk_denuncia_midias_denuncia_id FOREIGN KEY (denuncia_id) REFERENCES denuncias (id) ON DELETE CASCADE
) ENGINE=InnoDB;


-- -----------------------------------------------------------------------------
-- 9. CONVERSAS (chat entre adotante e ONG)
-- Uma conversa por par adotante + ONG, como numa lista de contatos: o animal
-- em pauta pode mudar, mas o histórico fica num lugar só.
-- "leu_ate" guarda o id da última mensagem que cada lado já viu. O que o outro
-- lado escreveu depois disso conta como não lido.
-- -----------------------------------------------------------------------------

CREATE TABLE conversas (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  adotante_id        INT UNSIGNED NOT NULL,
  ong_id             INT UNSIGNED NOT NULL,
  animal_id          INT UNSIGNED NULL COMMENT 'Animal mais recente sobre o qual estão falando',
  adotante_leu_ate   INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'id da última mensagem vista pelo adotante',
  ong_leu_ate        INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'id da última mensagem vista pela ONG',
  ultima_mensagem_em DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  criado_em          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_conversas_par (adotante_id, ong_id),
  KEY idx_conversas_ong (ong_id, ultima_mensagem_em),
  KEY idx_conversas_adotante (adotante_id, ultima_mensagem_em),
  CONSTRAINT fk_conversas_adotante_id FOREIGN KEY (adotante_id) REFERENCES adotantes (usuario_id) ON DELETE CASCADE,
  CONSTRAINT fk_conversas_ong_id      FOREIGN KEY (ong_id)      REFERENCES ongs (usuario_id)      ON DELETE CASCADE,
  CONSTRAINT fk_conversas_animal_id   FOREIGN KEY (animal_id)   REFERENCES animais (id)           ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE mensagens (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  conversa_id INT UNSIGNED  NOT NULL,
  autor       ENUM('adotante','ong') NOT NULL,
  tipo        ENUM('texto','aviso')  NOT NULL DEFAULT 'texto' COMMENT 'aviso = registro automático (pedido enviado, visita marcada...)',
  texto       VARCHAR(1000) NOT NULL,
  enviada_em  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_mensagens_conversa (conversa_id, id),
  CONSTRAINT fk_mensagens_conversa_id FOREIGN KEY (conversa_id) REFERENCES conversas (id) ON DELETE CASCADE,
  CONSTRAINT ck_mensagens_texto CHECK (CHAR_LENGTH(TRIM(texto)) > 0)
) ENGINE=InnoDB;


-- -----------------------------------------------------------------------------
-- 10. SUPORTE (central de ajuda)
-- Qualquer pessoa abre um chamado, com ou sem conta, e acompanha pelo protocolo.
-- -----------------------------------------------------------------------------

CREATE TABLE chamados_suporte (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  protocolo     CHAR(12)     NOT NULL COMMENT 'Código de acompanhamento, ex.: SUP-7K2M9QXA',
  usuario_id    INT UNSIGNED NULL COMMENT 'NULL quando aberto sem login',
  nome          VARCHAR(120) NOT NULL,
  email         VARCHAR(150) NOT NULL,
  categoria     ENUM('conta','adocao','ong','anuncio','denuncia','sugestao','outro') NOT NULL,
  assunto       VARCHAR(150) NOT NULL,
  status        ENUM('aberto','respondido','resolvido') NOT NULL DEFAULT 'aberto',
  criado_em     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_chamados_protocolo (protocolo),
  KEY idx_chamados_status (status, atualizado_em),
  KEY idx_chamados_usuario (usuario_id),
  CONSTRAINT fk_chamados_suporte_usuario_id FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE chamado_mensagens (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  chamado_id INT UNSIGNED  NOT NULL,
  autor      ENUM('solicitante','equipe') NOT NULL,
  admin_id   INT UNSIGNED  NULL COMMENT 'Quem da equipe respondeu',
  texto      VARCHAR(2000) NOT NULL,
  enviada_em DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chamado_mensagens_chamado (chamado_id, id),
  CONSTRAINT fk_chamado_mensagens_chamado_id FOREIGN KEY (chamado_id) REFERENCES chamados_suporte (id)       ON DELETE CASCADE,
  CONSTRAINT fk_chamado_mensagens_admin_id   FOREIGN KEY (admin_id)   REFERENCES administradores (usuario_id) ON DELETE SET NULL,
  CONSTRAINT ck_chamado_mensagens_texto CHECK (CHAR_LENGTH(TRIM(texto)) > 0)
) ENGINE=InnoDB;


-- Sessões de login (o servidor guarda aqui em vez da memória)
CREATE TABLE sessoes (
  id        VARCHAR(128) NOT NULL COMMENT 'Identificador do cookie patinhas.sid',
  dados     TEXT         NOT NULL COMMENT 'Conteúdo da sessão em JSON (quem entrou, protocolos de suporte)',
  expira_em DATETIME     NOT NULL,
  PRIMARY KEY (id),
  KEY idx_sessoes_expira (expira_em)
) ENGINE=InnoDB;


-- -----------------------------------------------------------------------------
-- 11. VIEWS (consultas prontas usadas pelo site)
-- -----------------------------------------------------------------------------

-- Animais com espécie, ONG, cidade e coordenadas (do animal ou, se não tiver, da ONG)
CREATE VIEW vw_animais_vitrine AS
SELECT a.id, a.ong_id, a.nome, a.sexo, a.porte, a.faixa_etaria, a.idade_aproximada,
       a.historia, a.saude, a.convive, a.jeito, a.necessidades_especiais, a.status, a.criado_em,
       es.codigo AS especie, es.nome AS especie_nome,
       o.nome AS ong_nome, o.tipo AS ong_tipo, o.status_verificacao AS ong_status,
       COALESCE(ea.latitude, eo.latitude)   AS latitude,
       COALESCE(ea.longitude, eo.longitude) AS longitude,
       c.nome AS cidade, est.sigla AS uf,
       (SELECT f.url FROM animal_fotos f WHERE f.animal_id = a.id
         ORDER BY f.principal DESC, f.ordem, f.id LIMIT 1) AS foto_url,
       (SELECT f.enquadramento FROM animal_fotos f WHERE f.animal_id = a.id
         ORDER BY f.principal DESC, f.ordem, f.id LIMIT 1) AS foto_enquadramento
  FROM animais a
  JOIN especies es      ON es.id = a.especie_id
  JOIN ongs o           ON o.usuario_id = a.ong_id
  JOIN enderecos eo     ON eo.id = o.endereco_id
  LEFT JOIN enderecos ea ON ea.id = a.endereco_id
  JOIN cidades c        ON c.id = COALESCE(ea.cidade_id, eo.cidade_id)
  JOIN estados est      ON est.id = c.estado_id;

-- Anúncios do mural com espécie, local e primeira foto
CREATE VIEW vw_anuncios_mural AS
SELECT an.id, an.usuario_id, an.tipo, an.nome_animal, an.raca, an.porte, an.faixa_etaria, an.sexo,
       an.cor, an.caracteristicas, an.tem_identificacao, an.data_ocorrencia, an.hora_ocorrencia,
       an.contato_nome, an.contato_telefone, an.status, an.desfecho, an.resolvido_em, an.criado_em,
       es.codigo AS especie, es.nome AS especie_nome,
       e.logradouro, e.numero, e.bairro, e.referencia, e.latitude, e.longitude,
       c.nome AS cidade, est.sigla AS uf,
       (SELECT f.url FROM anuncio_fotos f WHERE f.anuncio_id = an.id ORDER BY f.ordem, f.id LIMIT 1) AS foto_url
  FROM anuncios_perdidos_achados an
  JOIN especies es ON es.id = an.especie_id
  JOIN enderecos e ON e.id = an.endereco_id
  JOIN cidades c   ON c.id = e.cidade_id
  JOIN estados est ON est.id = c.estado_id;

-- Lista de conversas com os nomes, a última mensagem e as não lidas de cada lado
CREATE VIEW vw_conversas AS
SELECT c.id, c.adotante_id, c.ong_id, c.animal_id, c.adotante_leu_ate, c.ong_leu_ate, c.ultima_mensagem_em,
       ad.nome AS adotante_nome, o.nome AS ong_nome, o.tipo AS ong_tipo, a.nome AS animal_nome, a.sexo AS animal_sexo,
       (SELECT m.texto FROM mensagens m WHERE m.conversa_id = c.id ORDER BY m.id DESC LIMIT 1) AS ultima_texto,
       (SELECT m.autor FROM mensagens m WHERE m.conversa_id = c.id ORDER BY m.id DESC LIMIT 1) AS ultima_autor,
       (SELECT COUNT(*) FROM mensagens m
         WHERE m.conversa_id = c.id AND m.autor = 'ong' AND m.id > c.adotante_leu_ate) AS nao_lidas_adotante,
       (SELECT COUNT(*) FROM mensagens m
         WHERE m.conversa_id = c.id AND m.autor = 'adotante' AND m.id > c.ong_leu_ate) AS nao_lidas_ong
  FROM conversas c
  JOIN adotantes ad   ON ad.usuario_id = c.adotante_id
  JOIN ongs o         ON o.usuario_id = c.ong_id
  LEFT JOIN animais a ON a.id = c.animal_id;


-- -----------------------------------------------------------------------------
-- 12. GATILHOS (regras que o próprio banco garante)
-- Escritos com um comando só, sem DELIMITER, para rodar em qualquer cliente.
-- -----------------------------------------------------------------------------

-- Todo pedido novo já nasce com a primeira etapa no histórico
CREATE TRIGGER trg_pedidos_adocao_historico_novo
AFTER INSERT ON pedidos_adocao
FOR EACH ROW
  INSERT INTO pedido_andamento (pedido_id, status) VALUES (NEW.id, NEW.status_atual);

-- Cada mudança de situação vira uma linha no histórico
CREATE TRIGGER trg_pedidos_adocao_historico
AFTER UPDATE ON pedidos_adocao
FOR EACH ROW
  INSERT INTO pedido_andamento (pedido_id, status)
  SELECT NEW.id, NEW.status_atual FROM DUAL WHERE NEW.status_atual <> OLD.status_atual;

-- Visita marcada deixa o animal "em processo"; pedido aprovado deixa "adotado"
CREATE TRIGGER trg_pedidos_adocao_animal
AFTER UPDATE ON pedidos_adocao
FOR EACH ROW
  UPDATE animais
     SET status = IF(NEW.status_atual = 'aprovado', 'adotado', 'em_processo')
   WHERE id = NEW.animal_id
     AND NEW.status_atual <> OLD.status_atual
     AND (NEW.status_atual = 'aprovado'
          OR (NEW.status_atual = 'visita_agendada' AND status = 'disponivel'));

-- Mensagem nova: sobe a conversa na lista e já conta como lida para quem escreveu
CREATE TRIGGER trg_mensagens_conversa
AFTER INSERT ON mensagens
FOR EACH ROW
  UPDATE conversas
     SET ultima_mensagem_em = NEW.enviada_em,
         adotante_leu_ate   = IF(NEW.autor = 'adotante', NEW.id, adotante_leu_ate),
         ong_leu_ate        = IF(NEW.autor = 'ong', NEW.id, ong_leu_ate)
   WHERE id = NEW.conversa_id;

-- Resposta da equipe deixa o chamado "respondido"; resposta de quem abriu reabre o chamado
CREATE TRIGGER trg_chamado_mensagens_status
AFTER INSERT ON chamado_mensagens
FOR EACH ROW
  UPDATE chamados_suporte
     SET status        = IF(NEW.autor = 'equipe', 'respondido', 'aberto'),
         atualizado_em = NEW.enviada_em
   WHERE id = NEW.chamado_id;
