-- =============================================================================
--  Patinhas Club — dados iniciais
--  Rode depois do 01-esquema.sql.
--
--  Catálogos (estados, espécies, serviços...) + dados de demonstração iguais
--  aos do protótipo. As datas são relativas a hoje, então a demonstração nunca
--  fica com campanha vencida.
--
--  Contas de teste (senha de todas: patinhas123)
--    adotante@patinhasclub.test  -> Juliana Mendes (adotante)
--    ong@patinhasclub.test       -> ONG Amigos de Patas
--    lar@, ana@, miau@, focinho@, resgate@, rafael@patinhasclub.test
-- =============================================================================

SET NAMES utf8mb4;
USE patinhas;

-- -----------------------------------------------------------------------------
-- Catálogos
-- -----------------------------------------------------------------------------

INSERT INTO estados (sigla, nome, codigo_ibge) VALUES
  ('RO', 'Rondônia', 11), ('AC', 'Acre', 12), ('AM', 'Amazonas', 13), ('RR', 'Roraima', 14),
  ('PA', 'Pará', 15), ('AP', 'Amapá', 16), ('TO', 'Tocantins', 17), ('MA', 'Maranhão', 21),
  ('PI', 'Piauí', 22), ('CE', 'Ceará', 23), ('RN', 'Rio Grande do Norte', 24), ('PB', 'Paraíba', 25),
  ('PE', 'Pernambuco', 26), ('AL', 'Alagoas', 27), ('SE', 'Sergipe', 28), ('BA', 'Bahia', 29),
  ('MG', 'Minas Gerais', 31), ('ES', 'Espírito Santo', 32), ('RJ', 'Rio de Janeiro', 33), ('SP', 'São Paulo', 35),
  ('PR', 'Paraná', 41), ('SC', 'Santa Catarina', 42), ('RS', 'Rio Grande do Sul', 43), ('MS', 'Mato Grosso do Sul', 50),
  ('MT', 'Mato Grosso', 51), ('GO', 'Goiás', 52), ('DF', 'Distrito Federal', 53);

SET @sp = (SELECT id FROM estados WHERE sigla = 'SP');

-- Grande ABC e capital (as outras cidades entram sozinhas pelo CEP ou GPS)
INSERT INTO cidades (id, estado_id, nome, codigo_ibge, latitude, longitude) VALUES
  (1, @sp, 'Diadema',               3513801, -23.686100, -46.622800),
  (2, @sp, 'São Bernardo do Campo', 3548708, -23.691400, -46.564600),
  (3, @sp, 'Santo André',           3547809, -23.663900, -46.538300),
  (4, @sp, 'São Caetano do Sul',    3548807, -23.622900, -46.554800),
  (5, @sp, 'Mauá',                  3529401, -23.667700, -46.461300),
  (6, @sp, 'Ribeirão Pires',        3543303, -23.706700, -46.405800),
  (7, @sp, 'Rio Grande da Serra',   3544103, -23.743700, -46.397100),
  (8, @sp, 'São Paulo',             3550308, -23.550500, -46.633300);

INSERT INTO especies (id, codigo, nome) VALUES (1, 'cao', 'Cão'), (2, 'gato', 'Gato'), (3, 'outro', 'Outro');

INSERT INTO racas (especie_id, nome) VALUES
  (1, 'SRD (vira-lata)'), (1, 'Labrador'), (1, 'Poodle'), (1, 'Shih Tzu'), (1, 'Pinscher'),
  (1, 'Pit Bull'), (1, 'Golden Retriever'), (1, 'Border Collie'), (1, 'Dachshund'), (1, 'Beagle'),
  (2, 'SRD (vira-lata)'), (2, 'Siamês'), (2, 'Persa'), (2, 'Maine Coon'), (2, 'Angorá');

INSERT INTO necessidades_especiais (id, nome, descricao) VALUES
  (1, 'Medicação contínua', 'Precisa tomar remédio todos os dias'),
  (2, 'Deficiência visual', NULL),
  (3, 'Deficiência auditiva', NULL),
  (4, 'Mobilidade reduzida', 'Amputação, paralisia ou artrose'),
  (5, 'FIV ou FeLV positivo', 'Gatos que precisam de acompanhamento veterinário'),
  (6, 'Dieta especial', NULL);

INSERT INTO servicos (id, codigo, nome) VALUES
  (1, 'adocao', 'Adoção'), (2, 'resgate', 'Resgate'), (3, 'lar-temporario', 'Lar temporário'),
  (4, 'castracao', 'Castração'), (5, 'veterinario', 'Veterinário');


-- -----------------------------------------------------------------------------
-- Demonstração: endereços
-- -----------------------------------------------------------------------------

INSERT INTO enderecos (id, cidade_id, logradouro, numero, bairro, referencia, latitude, longitude, precisao_m, origem) VALUES
  -- ONGs
  (1, 1, 'Rua das Acácias', '120', 'Centro', NULL, -23.684900, -46.620300, 12, 'gps'),
  (2, 2, 'Rua dos Ipês', '455', 'Rudge Ramos', NULL, -23.668700, -46.567200, 15, 'gps'),
  (3, 1, 'Rua das Hortênsias', '38', 'Jardim Canhema', NULL, -23.674200, -46.613900, 20, 'mapa'),
  (4, 3, 'Rua das Figueiras', '1020', 'Jardim', NULL, -23.657800, -46.531500, 10, 'gps'),
  (5, 5, 'Rua dos Girassóis', '77', 'Centro', NULL, -23.667400, -46.462700, NULL, 'cep'),
  (6, 4, 'Rua das Magnólias', '210', 'Santa Paula', NULL, -23.623600, -46.551300, 18, 'gps'),
  -- Adotantes (o cadastro pede só cidade e estado)
  (7, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'digitado'),
  (8, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'digitado'),
  -- Mural de perdidos
  (9,  1, 'Rua Manoel da Nóbrega', '123', 'Centro', NULL, -23.688600, -46.618900, 12, 'gps'),
  (10, 1, 'Avenida Alda', '456', 'Centro', NULL, -23.690700, -46.621500, 18, 'gps'),
  (11, 1, NULL, NULL, 'Centro', 'Praça da Moça', -23.686300, -46.623400, NULL, 'mapa'),
  (12, 1, 'Rua das Palmeiras', '80', 'Serraria', NULL, -23.679800, -46.626100, 9, 'gps');


-- -----------------------------------------------------------------------------
-- Demonstração: contas (senha: patinhas123)
-- -----------------------------------------------------------------------------

INSERT INTO usuarios (id, tipo, email, senha_hash) VALUES
  (1, 'ong',      'ong@patinhasclub.test',      'scrypt$16384$8$1$76RhVzcCe2HESB8cJpoMhQ==$bXknu4LKi5AELe4DBRdKJll3xzQsoRxt/4CM6zgEr3/d7QRq+KX5m8Km4Rlztma8b4dwaKTtmYuOyxshIFGM0g=='),
  (2, 'ong',      'lar@patinhasclub.test',      'scrypt$16384$8$1$EXSgkW2s04a0Dhi03TkpYA==$c39nq+tezHO+l1aFDYzYdsJSXZCHILNHqEHoSiYBjsIJauQAN4EOTq+HoqZH2OW+z0r7R9uLhloE7EK4Mwq0Kg=='),
  (3, 'ong',      'ana@patinhasclub.test',      'scrypt$16384$8$1$2vJpmmukFTHA62oHhvbgdw==$obpupyupnJ93LmaWwIK+81Ko9xIsrEhP5tB3JQyD4jfrhGmaO2BPmg4467Z439pp+mrm4tQ+pbsBgFYRHB0SBA=='),
  (4, 'ong',      'miau@patinhasclub.test',     'scrypt$16384$8$1$3HeCZJFulDy/sBkaOBpygA==$fidg4Zo4UQL8bj7SnKkvw9qrOTG62ieuk675vTLFIu/5RTVIjJJ2UVvQWc2Whz0CvZYFYXyaEZbMtIDFvL39xA=='),
  (5, 'ong',      'focinho@patinhasclub.test',  'scrypt$16384$8$1$L44CUOBmwPpjtRsf2aR05A==$PiITfhWP8ocvBp8N06oQTgdA/FUYoO5RtahDaWbwD29drGGzth1XTbNLaCb7I9wkimKkmXBpaMjLDxzt7rzS8Q=='),
  (6, 'ong',      'resgate@patinhasclub.test',  'scrypt$16384$8$1$VcXqa1J795dYKkouQPGfvw==$UZe/YMyqS5TQg7QmCTn6aVus1qZSuPcqsTDoJRQjeJZxJogsBQhJDCRhnYiWZe3s/pfdYnT+96VOBdmXb8RJKg=='),
  (7, 'adotante', 'adotante@patinhasclub.test', 'scrypt$16384$8$1$XEJfgMlA6oC0+aiFfYl0+Q==$ZhBklzTxM2gZy0i8/qtCj488VfDtFoGYG7q1uuXDFQUWBiW6ADCzfKtAue52kxQ+BMnxYNNUWWq/QhwEvrNRkA=='),
  (8, 'adotante', 'rafael@patinhasclub.test',   'scrypt$16384$8$1$RlqxJc81QFN7YcmLu7M0BA==$LsRAVYamWQ1Kydt7lqMaVwlOUMdOs/8U8UL0wOZMYQFgzA76gao+1RwHh/PgpVjsQXM8jC3MH7EW56zT+B1pyw==');

INSERT INTO ongs (usuario_id, tipo, nome, documento, ano_fundacao, apresentacao, responsavel, cargo, telefone,
                  rede_social, endereco_id, ocultar_endereco, quantidade_animais, status_verificacao, verificada_em, recebe_novidades) VALUES
  (1, 'ong', 'ONG Amigos de Patas', '52601815000120', 2014,
   'Resgata cães e gatos na região central de Diadema e mantém um programa de castração a preço popular.',
   'Carla Nogueira', 'Presidente', '11940001001', '@amigosdepatas', 1, FALSE, '31-100', 'verificada', NOW() - INTERVAL 300 DAY, TRUE),
  (2, 'abrigo', 'Lar Patinhas Felizes', '90830166000128', 2011,
   'Abrigo dedicado a cães idosos e com necessidades especiais. Hoje cuida de 38 animais.',
   'Roberto Dias', 'Coordenador', '11940001002', '@larpatinhasfelizes', 2, FALSE, '31-100', 'verificada', NOW() - INTERVAL 280 DAY, FALSE),
  (3, 'protetor', 'Protetora Ana Souza', '94821993597', 2019,
   'Cuida de colônias de gatos de rua: castra, trata e encaminha para adoção os que se dão bem dentro de casa.',
   'Ana Souza', NULL, '11940001003', '@anasouza.gatos', 3, TRUE, '11-30', 'verificada', NOW() - INTERVAL 200 DAY, TRUE),
  (4, 'ong', 'Projeto Miau Seguro', '13186091000143', 2017,
   'Foco em filhotes de gato: lares temporários, vacinação e adoção responsável com acompanhamento.',
   'Beatriz Ramos', 'Fundadora', '11940001004', '@miauseguro', 4, FALSE, '11-30', 'verificada', NOW() - INTERVAL 150 DAY, FALSE),
  (5, 'ong', 'Instituto Focinho Amigo', '39099603000128', 2016,
   'Mutirões de castração e atendimento veterinário para animais de famílias de baixa renda.',
   'Paulo Henrique', 'Diretor', '11940001005', NULL, 5, FALSE, 'ate-10', 'verificada', NOW() - INTERVAL 120 DAY, FALSE),
  (6, 'ong', 'Grupo Resgate ABC', '08246281000179', 2020,
   'Voluntários que resgatam cães atropelados ou feridos e cuidam da recuperação até a adoção.',
   'Tiago Alves', 'Voluntário', '11940001006', '@resgateabc', 6, FALSE, '11-30', 'verificada', NOW() - INTERVAL 90 DAY, TRUE);

INSERT INTO ong_especie (ong_id, especie_id) VALUES (1, 1), (1, 2), (2, 1), (3, 2), (4, 2), (5, 1), (5, 2), (6, 1);
INSERT INTO ong_servico (ong_id, servico_id) VALUES
  (1, 1), (1, 4), (2, 1), (2, 3), (3, 1), (3, 4), (3, 3), (4, 1), (4, 3), (5, 4), (5, 5), (6, 1), (6, 2), (6, 3);
INSERT INTO ong_areas_atendimento (ong_id, cidade_id) VALUES (1, 1), (2, 2), (3, 1), (4, 3), (5, 5), (6, 4), (6, 2), (6, 3);

INSERT INTO adotantes (usuario_id, nome, cpf, telefone, data_nascimento, endereco_id, moradia, tem_animais, tem_criancas, procura, recebe_alertas) VALUES
  (7, 'Juliana Mendes', '18190937863', '11987650007', '1994-03-12', 7, 'casa-quintal', 'gato', FALSE, 'cao,gato', TRUE),
  (8, 'Rafael Lima', NULL, '11987650008', '1990-07-25', 8, 'apartamento', NULL, FALSE, 'cao', FALSE);

INSERT INTO termos_aceite (usuario_id, tipo, versao) VALUES
  (7, 'termos_uso', '2026-10'), (7, 'privacidade', '2026-10'), (8, 'termos_uso', '2026-10'), (8, 'privacidade', '2026-10');


-- -----------------------------------------------------------------------------
-- Demonstração: animais para adoção
-- -----------------------------------------------------------------------------

INSERT INTO animais (id, ong_id, especie_id, raca_id, nome, sexo, porte, faixa_etaria, idade_aproximada, cor, historia,
                     saude, jeito, convive, necessidades_especiais, cuidados, taxa, requisitos, status, criado_em) VALUES
  (1, 1, 1, 1, 'Churros', 'macho', 'pequeno', 'adulto', '3 anos', 'caramelo',
   'Brincalhão e dengoso, adora colo e passeio curto.',
   'vacinado,castrado', 'brincalhao,carinhoso', 'criancas', FALSE, NULL, 'gratuita', 'termo', 'disponivel', NOW() - INTERVAL 20 DAY),
  (2, 2, 1, 1, 'Brutus', 'macho', 'medio', 'idoso', '10 anos', 'preto e branco',
   'Calmão e carinhoso, ama sol e soneca. Toma remédio para as articulações.',
   'vacinado,castrado', 'calmo,carinhoso', 'caes', TRUE, 'Remédio para as articulações uma vez ao dia, junto com a ração.', 'voluntaria', 'termo,visita', 'disponivel', NOW() - INTERVAL 40 DAY),
  (3, 3, 2, 11, 'Mel', 'femea', 'pequeno', 'adulto', '2 anos', 'laranja',
   'Tranquila e curiosa, perfeita para apartamento. Usa caixinha de areia.',
   'vacinado,castrado', 'calmo,independente', 'criancas,gatos', FALSE, NULL, 'gratuita', 'telas,termo', 'disponivel', NOW() - INTERVAL 15 DAY),
  (4, 1, 1, 1, 'Thor', 'macho', 'grande', 'filhote', '5 meses', 'branco e marrom',
   'Cheio de energia, aprende rápido e precisa de espaço para correr.',
   'vacinado,vermifugado', 'brincalhao,agitado', 'criancas,caes', FALSE, NULL, 'gratuita', 'quintal,termo', 'disponivel', NOW() - INTERVAL 8 DAY),
  (5, 1, 2, 11, 'Pretinha', 'femea', 'pequeno', 'filhote', '3 meses', 'preta',
   'Resgatada na semana passada, ainda está tomando as vacinas.',
   'vermifugado', 'timido', NULL, FALSE, NULL, 'gratuita', 'telas,termo', 'rascunho', NOW() - INTERVAL 2 DAY);

INSERT INTO animal_fotos (animal_id, url, principal, enquadramento) VALUES
  (1, 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=85', TRUE, 'centro'),
  (2, 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=800&q=85', TRUE, 'centro'),
  (3, 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=85', TRUE, 'centro'),
  (4, 'https://images.unsplash.com/photo-1721781010133-8eb0e9b23daf?auto=format&fit=crop&w=800&q=85', TRUE, 'topo');

INSERT INTO animal_necessidade (animal_id, necessidade_id) VALUES (2, 1);

INSERT INTO animal_vacinas (animal_id, nome, data_aplicacao, proxima_dose) VALUES
  (1, 'V10', CURDATE() - INTERVAL 60 DAY, CURDATE() + INTERVAL 305 DAY),
  (1, 'Antirrábica', CURDATE() - INTERVAL 60 DAY, CURDATE() + INTERVAL 305 DAY),
  (4, 'V10 (2ª dose)', CURDATE() - INTERVAL 10 DAY, CURDATE() + INTERVAL 11 DAY);


-- -----------------------------------------------------------------------------
-- Demonstração: pedidos de adoção (o gatilho grava a etapa atual no histórico)
-- -----------------------------------------------------------------------------

INSERT INTO pedidos_adocao (id, animal_id, adotante_id, nome, telefone, email, moradia, outros_animais, mensagem, status_atual, criado_em) VALUES
  (1, 3, 7, 'Juliana Mendes', '11987650007', 'adotante@patinhasclub.test', 'casa-quintal', TRUE,
   'Trabalho de casa e já convivo com uma gata castrada de 4 anos.', 'visita_agendada', NOW() - INTERVAL 6 DAY),
  (2, 1, 7, 'Juliana Mendes', '11987650007', 'adotante@patinhasclub.test', 'casa-quintal', TRUE,
   'Trabalho de casa e o Churros parece perfeito para fazer companhia.', 'enviado', NOW() - INTERVAL 1 DAY),
  (3, 4, 8, 'Rafael Lima', '11987650008', 'rafael@patinhasclub.test', 'apartamento', FALSE,
   'Moro perto de um parque e corro todos os dias de manhã.', 'em_analise', NOW() - INTERVAL 3 DAY),
  (4, 1, NULL, 'Marina Costa', '11987650099', NULL, 'apartamento', FALSE,
   'Sempre quis um cachorro pequeno e companheiro.', 'enviado', NOW() - INTERVAL 2 HOUR);

-- Etapas anteriores do histórico
INSERT INTO pedido_andamento (pedido_id, status, observacao, criado_em) VALUES
  (1, 'enviado', NULL, NOW() - INTERVAL 6 DAY),
  (1, 'em_analise', 'Conversa pelo WhatsApp', NOW() - INTERVAL 5 DAY),
  (3, 'enviado', NULL, NOW() - INTERVAL 3 DAY);

INSERT INTO visitas (pedido_id, data_hora, local_visita, status) VALUES
  (1, TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '15:00:00'), 'Na casa da protetora, em Diadema', 'agendada');

INSERT INTO favoritos (adotante_id, animal_id) VALUES (7, 2), (7, 4);

INSERT INTO alertas_lista_espera (adotante_id, nome, email, telefone, especie_id, portes, idades, sexo, cidade_id, avisar_por) VALUES
  (7, 'Juliana Mendes', 'adotante@patinhasclub.test', '11987650007', 1, 'pequeno,medio', 'adulto', NULL, 1, 'email,whatsapp');


-- -----------------------------------------------------------------------------
-- Demonstração: mural de perdidos
-- -----------------------------------------------------------------------------

INSERT INTO anuncios_perdidos_achados (id, usuario_id, tipo, especie_id, endereco_id, nome_animal, raca, porte, faixa_etaria, sexo, cor,
       caracteristicas, tem_identificacao, data_ocorrencia, hora_ocorrencia, circunstancias, contato_nome, contato_telefone,
       status, desfecho, resolvido_em, criado_em) VALUES
  (1, NULL, 'perdido', 1, 9, 'Caramelo', 'SRD (vira-lata)', 'medio', 'adulto', 'macho', 'caramelo',
   'Pelagem caramelo, coleira azul e uma mancha branca no peito.', TRUE, CURDATE() - INTERVAL 4 DAY, '18:00:00',
   'Fugiu pelo portão aberto.', 'Marcos Pereira', '11995449612', 'aberto', NULL, NULL, NOW() - INTERVAL 4 DAY),
  (2, NULL, 'perdido', 2, 10, 'Cinzinha', NULL, 'pequeno', 'filhote', 'femea', 'tigrada cinza',
   'Pelo tigrado cinza, olhos verdes, sem coleira.', FALSE, CURDATE() - INTERVAL 2 DAY, '07:00:00',
   'Saiu pela janela da cozinha.', 'Bianca Rocha', '11987765432', 'aberto', NULL, NULL, NOW() - INTERVAL 2 DAY),
  (3, NULL, 'perdido', 1, 11, 'Ruby', NULL, 'grande', 'idoso', 'femea', 'preta',
   'Pelagem preta, focinho grisalho, anda devagar.', TRUE, CURDATE() - INTERVAL 7 DAY, '20:00:00',
   'Se assustou com fogos.', 'Sérgio Martins', '11963456789', 'aberto', NULL, NULL, NOW() - INTERVAL 7 DAY),
  (4, NULL, 'perdido', 1, 12, 'Bob', NULL, 'medio', 'adulto', 'macho', 'marrom',
   'Pelo curto marrom e orelhas caídas.', TRUE, CURDATE() - INTERVAL 3 DAY, '10:00:00',
   NULL, 'Fernanda Alves', '11981112233', 'resolvido',
   'Uma vizinha viu o anúncio e encontrou o Bob a duas quadras de casa, dois dias depois do sumiço. Obrigado, vizinhança!',
   NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 3 DAY);

INSERT INTO anuncio_fotos (anuncio_id, url) VALUES
  (1, 'img/animalex1.jpg'), (2, 'img/animalex2.jpg'), (3, 'img/animalex3.jpg'),
  (4, 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=800&q=85');

INSERT INTO avisos_encontrei (anuncio_id, local_descricao, latitude, longitude, precisao_m, visto_em, estado_animal, observacoes, contato) VALUES
  (1, 'Praça da Moça, perto do coreto – Centro, Diadema/SP', -23.686200, -46.623300, 9, NOW() - INTERVAL 1 DAY,
   'assustado', 'Estava sem a coleira e correu quando chamei.', '(11) 91234-5678');


-- -----------------------------------------------------------------------------
-- Demonstração: campanhas
-- -----------------------------------------------------------------------------

INSERT INTO campanhas (id, ong_id, tipo, titulo, descricao, meta_texto, meta_valor, meta_unidade, arrecadado, data_inicio, data_fim, local_texto, como_ajudar, status) VALUES
  (1, 1, 'arrecadacao', 'Ração para o inverno',
   'No frio, os resgatados comem mais. A meta garante ração para os 40 animais da ONG até o fim da estação.',
   '500 kg de ração', 500, 'kg', 310, CURDATE() - INTERVAL 30 DAY, CURDATE() + INTERVAL 25 DAY, 'Coleta no Centro de Diadema',
   'Ração seca para cães ou gatos adultos, em pacotes fechados.\nEntrega na sede de segunda a sábado, das 9h às 17h.\nPrefere doar em dinheiro? O Pix está no perfil verificado da ONG.', 'aberta'),
  (2, 2, 'evento', 'Feira de adoção na praça',
   'Mais de 20 cães e gatos vacinados e castrados para conhecer de pertinho. Leve um documento com foto.',
   NULL, NULL, NULL, 0, CURDATE() + INTERVAL 9 DAY, CURDATE() + INTERVAL 9 DAY, 'Praça da Moça, Centro de Diadema',
   'Não precisa se inscrever: é só aparecer.\nQuer adotar no dia? Crie sua conta antes para agilizar.\nVoluntários para montar as tendas: chegar às 8h30.', 'aberta'),
  (3, 5, 'saude', 'Mutirão de castração',
   'Castração a preço popular para cães e gatos de famílias de baixa renda, com consulta antes da cirurgia.',
   '120 vagas', 120, 'vagas', 87, CURDATE() - INTERVAL 10 DAY, CURDATE() + INTERVAL 14 DAY, 'Mauá, SP',
   'Inscrição presencial na sede do instituto, com comprovante de residência.\nO animal precisa estar em jejum de 8 horas no dia.', 'aberta'),
  (4, 4, 'voluntariado', 'Lar temporário para filhotes',
   'Filhotes de gato precisam de uma casa por 30 a 60 dias até a adoção. A ONG fornece ração, areia e veterinário.',
   '8 lares temporários', 8, 'lares', 3, CURDATE() - INTERVAL 5 DAY, CURDATE() + INTERVAL 20 DAY, 'Santo André e região',
   'Ter um cômodo seguro e telas nas janelas.\nMandar fotos dos filhotes uma vez por semana.\nLevar às consultas marcadas pela ONG.', 'aberta'),
  (5, 3, 'arrecadacao', 'Cobertores e caminhas',
   'Para os gatos das colônias passarem o inverno aquecidos. Servem cobertores usados, limpos e sem rasgos.',
   '60 cobertores e caminhas', 60, 'itens', 42, CURDATE() - INTERVAL 12 DAY, CURDATE() + INTERVAL 30 DAY, 'Coleta em Diadema',
   'Combine a entrega pela mensagem do perfil da protetora.\nCaminhas de tecido grosso e caixas de transporte também ajudam.', 'aberta'),
  (6, 6, 'voluntariado', 'Passeio solidário com os cães',
   'Uma manhã para levar os cães em recuperação para passear. Ótimo para conhecer um futuro companheiro.',
   NULL, NULL, NULL, 0, CURDATE() + INTERVAL 4 DAY, CURDATE() + INTERVAL 4 DAY, 'São Caetano do Sul, SP',
   'Vagas para 15 voluntários a partir de 16 anos.\nUse tênis e roupa confortável. A guia fica por conta do grupo.', 'aberta'),
  (7, 1, 'evento', 'Bazar beneficente',
   'Bazar de roupas e objetos doados, com toda a renda revertida para os resgatados.',
   NULL, NULL, 'R$', 2380, CURDATE() - INTERVAL 50 DAY, CURDATE() - INTERVAL 50 DAY, 'Sede da ONG, Diadema',
   'Doe roupas e objetos em bom estado.', 'encerrada');


-- -----------------------------------------------------------------------------
-- Demonstração: equipe do Patinhas Club, ONG aguardando validação e denúncias
-- -----------------------------------------------------------------------------

INSERT INTO usuarios (id, tipo, email, senha_hash) VALUES
  (9,  'admin', 'admin@patinhasclub.test',   'scrypt$16384$8$1$8QouoNokiD5q0czQb+B4kg==$IAvQD1AQI2BkQvNhHPpKBVc6xWEPVN0xXveZ+XNAH7aosR5SjGHbmpGwO04DtX1UoQWNY0OqmW2bYIvmyALLRQ=='),
  (10, 'ong',   'recanto@patinhasclub.test', NULL);

INSERT INTO administradores (usuario_id, nome) VALUES (9, 'Equipe Patinhas Club');

INSERT INTO enderecos (id, cidade_id, logradouro, numero, bairro, referencia, latitude, longitude, precisao_m, origem) VALUES
  (13, 6, 'Rua das Hortênsias', '48', 'Centro', NULL, -23.711200, -46.413600, NULL, 'cep'),
  (14, 1, 'Rua Oriente Monti', '300', 'Centro', 'Perto do ponto de ônibus', -23.686900, -46.620400, 15, 'gps'),
  (15, 2, NULL, NULL, 'Rudge Ramos', 'Terreno ao lado do mercado', -23.655900, -46.573300, NULL, 'mapa');

-- Cadastro ainda sem senha: a equipe aprova no painel e o link para criar a senha vai por e-mail
INSERT INTO ongs (usuario_id, tipo, nome, documento, ano_fundacao, apresentacao, responsavel, cargo, telefone,
                  rede_social, endereco_id, ocultar_endereco, quantidade_animais, status_verificacao, verificada_em, recebe_novidades) VALUES
  (10, 'abrigo', 'Recanto dos Bigodes', '11444777000161', 2021,
   'Abrigo de gatos resgatados em Ribeirão Pires. Cuidamos de cerca de 25 animais com a ajuda de voluntários.',
   'Paulo Henrique Souza', 'Fundador', '11940001010', '@recantodosbigodes', 13, FALSE, '11-30', 'pendente', NULL, TRUE);

INSERT INTO ong_documentos (ong_id, tipo, arquivo) VALUES
  (10, 'identificacao', 'privado/exemplo-identificacao.pdf'), (10, 'atuacao', 'privado/exemplo-atuacao.pdf');
INSERT INTO ong_especie (ong_id, especie_id) VALUES (10, 2);

INSERT INTO denuncias (usuario_id, endereco_id, tipo_ocorrencia, quantidade_animais, ainda_no_local, situacao_animal, especie_id, porte,
                       caracteristicas, data_ocorrencia, hora_ocorrencia, denunciante_nome, denunciante_telefone, denunciante_email,
                       receber_andamento, status, criado_em) VALUES
  (NULL, 14, 'maus-tratos', 1, 'sim', 'Cachorro preso em corrente curta no quintal, sem água e sem abrigo do sol. Late o dia inteiro.',
   1, 'medio', 'Caramelo, com coleira vermelha', CURDATE() - INTERVAL 1 DAY, '14:30:00', NULL, NULL, NULL, FALSE, 'recebida', NOW() - INTERVAL 20 HOUR),
  (7, 15, 'abandono', 3, 'nao-sei', 'Três filhotes deixados em uma caixa de papelão no terreno. Estavam magros e com frio.',
   2, 'pequeno', 'Dois rajados e um preto', CURDATE() - INTERVAL 4 DAY, NULL, 'Juliana Mendes', '11987650007', 'adotante@patinhasclub.test',
   TRUE, 'em_analise', NOW() - INTERVAL 90 HOUR);


-- -----------------------------------------------------------------------------
-- Demonstração: conversas entre adotantes e ONGs
-- O gatilho atualiza a data e o "leu até" da conversa a cada mensagem.
-- -----------------------------------------------------------------------------

INSERT INTO conversas (id, adotante_id, ong_id, animal_id, criado_em) VALUES
  (1, 7, 3, 3, NOW() - INTERVAL 144 HOUR),
  (2, 7, 1, 1, NOW() - INTERVAL 24 HOUR),
  (3, 8, 1, 4, NOW() - INTERVAL 72 HOUR);

INSERT INTO mensagens (id, conversa_id, autor, tipo, texto, enviada_em) VALUES
  (1,  1, 'adotante', 'aviso', 'Pedido de adoção da Mel enviado.', NOW() - INTERVAL 144 HOUR),
  (2,  1, 'ong',      'texto', 'Oi, Juliana! Obrigada pelo interesse na Mel. Ela é carinhosa e se dá bem com outros gatos. Como é a sua casa?', NOW() - INTERVAL 120 HOUR),
  (3,  1, 'adotante', 'texto', 'Oi, Ana! Moro em casa com quintal telado e já tenho uma gata castrada de 4 anos.', NOW() - INTERVAL 119 HOUR),
  (4,  1, 'ong',      'texto', 'Perfeito! Podemos marcar uma visita para vocês se conhecerem?', NOW() - INTERVAL 96 HOUR),
  (5,  1, 'adotante', 'texto', 'Claro! Posso no sábado à tarde.', NOW() - INTERVAL 95 HOUR),
  (6,  1, 'ong',      'aviso', 'Visita marcada para conhecer a Mel.', NOW() - INTERVAL 94 HOUR),
  (7,  1, 'adotante', 'texto', 'Combinado, até lá!', NOW() - INTERVAL 93 HOUR),
  (8,  2, 'adotante', 'aviso', 'Pedido de adoção do Churros enviado.', NOW() - INTERVAL 24 HOUR),
  (9,  2, 'adotante', 'texto', 'Olá! O Churros convive bem com gatos?', NOW() - INTERVAL 23 HOUR),
  (10, 2, 'ong',      'texto', 'Oi, Juliana! Convive sim: ele divide o lar temporário com duas gatas. Quer conhecer o Churros no sábado?', NOW() - INTERVAL 2 HOUR),
  (11, 3, 'adotante', 'aviso', 'Pedido de adoção do Thor enviado.', NOW() - INTERVAL 72 HOUR),
  (12, 3, 'ong',      'texto', 'Olá, Rafael! Estamos analisando o seu pedido. O Thor tem bastante energia: você costuma passear todos os dias?', NOW() - INTERVAL 48 HOUR),
  (13, 3, 'adotante', 'texto', 'Passeio sim! Corro no parque toda manhã e ele pode ir comigo.', NOW() - INTERVAL 3 HOUR);


-- -----------------------------------------------------------------------------
-- Demonstração: chamados de suporte (o gatilho ajusta a situação a cada resposta)
-- -----------------------------------------------------------------------------

INSERT INTO chamados_suporte (id, protocolo, usuario_id, nome, email, categoria, assunto, criado_em) VALUES
  (1, 'SUP-7K2M9QXA', 7,    'Juliana Mendes', 'adotante@patinhasclub.test', 'adocao', 'Posso remarcar a visita?', NOW() - INTERVAL 50 HOUR),
  (2, 'SUP-3F8T6WPL', NULL, 'Carlos Pereira', 'carlos@exemplo.test',        'conta',  'Não recebi o e-mail para criar a senha', NOW() - INTERVAL 5 HOUR),
  (3, 'SUP-9B4H2RDN', 1,    'Carla Nogueira', 'ong@patinhasclub.test',      'ong',    'Como destacar uma campanha?', NOW() - INTERVAL 200 HOUR);

INSERT INTO chamado_mensagens (chamado_id, autor, admin_id, texto, enviada_em) VALUES
  (1, 'solicitante', NULL, 'Marquei uma visita para conhecer a Mel, mas vou precisar mudar o dia. Como faço?', NOW() - INTERVAL 50 HOUR),
  (1, 'equipe',      9,    'Oi, Juliana! É só combinar o novo dia com a protetora pelo chat, em Mensagens. Ela atualiza a visita no painel dela.', NOW() - INTERVAL 44 HOUR),
  (2, 'solicitante', NULL, 'Cadastrei meu abrigo há três dias e ainda não recebi o link para criar a senha.', NOW() - INTERVAL 5 HOUR),
  (3, 'solicitante', NULL, 'Queria que a campanha de ração aparecesse em destaque na página de campanhas.', NOW() - INTERVAL 200 HOUR),
  (3, 'equipe',      9,    'Oi, Carla! O destaque fica com a campanha aberta que termina primeiro. Vale revisar a data final da sua.', NOW() - INTERVAL 190 HOUR);

UPDATE chamados_suporte SET status = 'resolvido' WHERE id = 3;
