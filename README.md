# 🐾 Patinhas Club

### Adotar, resgatar e reencontrar num só lugar.

O **Patinhas Club** conecta ONGs, protetores independentes e adotantes em um único app, com filtros de adoção e anúncios geolocalizados de animais perdidos e encontrados perto de você.

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)
![Projeto](https://img.shields.io/badge/projeto-integrador-2d6a2d)
![Equipe](https://img.shields.io/badge/equipe-6%20estudantes-8b5a3c)

---

## 📑 Sumário

- [Sobre o projeto](#-sobre-o-projeto)
- [O problema](#-o-problema)
- [Contexto](#-contexto)
- [Objetivos](#-objetivos)
- [Funcionalidades](#-funcionalidades)
- [Perfis de usuário](#-perfis-de-usuário)
- [Partes interessadas](#-partes-interessadas)
- [Análise de similares](#-análise-de-similares)
- [Tecnologias](#-tecnologias)
- [Como executar](#-como-executar)
- [Páginas do site](#-páginas-do-site)
- [Roteiro para a apresentação](#-roteiro-para-a-apresentação)
- [Como o site funciona sem JavaScript](#-como-o-site-funciona-sem-javascript)
- [Identidade visual no site](#-identidade-visual-no-site)
- [Localização em tempo real](#-localização-em-tempo-real)
- [Chat entre adotante e ONG](#-chat-entre-adotante-e-ong)
- [Central de ajuda e administração](#-central-de-ajuda-e-administração)
- [Banco de dados](#-banco-de-dados)
- [Servidor e API](#-servidor-e-api)
- [Equipe](#-equipe)
- [Contribuição](#-contribuição)

---

## 💚 Sobre o projeto

O Patinhas Club nasceu como **Projeto Integrador** de um grupo de seis estudantes, com uma proposta simples: usar tecnologia em uma questão sensível, a **adoção e o cuidado de animais em situação de abandono**.

Hoje, ajudar um animal dá trabalho. Há animais demais nas ruas, ONGs com pouca visibilidade e um processo de adoção espalhado e burocrático. O Patinhas Club reúne tudo isso em um só lugar, de forma acessível e intuitiva, para que quem quer ajudar encontre quem precisa de ajuda (e vice-versa).

---

## ⚠️ O problema

O cenário atual é marcado por:

- **Superpopulação** de animais de rua;
- **Alto índice de abandono**;
- **Perda frequente** de animais de estimação;
- **ONGs e protetores independentes** com recursos limitados e baixa visibilidade;
- **Adotantes** que enfrentam processos descentralizados, sem padronização e burocráticos.

## 🌎 Contexto

No Brasil, o processo de adoção, resgate e acolhimento de animais é **fragmentado e informal**. As informações ficam muito espalhadas, sem centralização, e as consequências aparecem em três frentes: superpopulação urbana, altos índices de abandono e longa permanência dos animais em abrigos.

---

## 🎯 Objetivos

1. Levantar e documentar os requisitos funcionais e não funcionais junto a ONGs parceiras e tutores.
2. Projetar a interface de usuário (UI/UX) do aplicativo, com foco em acessibilidade e navegação intuitiva.
3. Implementar cadastro e autenticação de usuários com perfis distintos (adotante e ONG/protetor).
4. Desenvolver o módulo de centralização de adoções com filtros avançados (porte, idade, localização e necessidades especiais).
5. Implementar o sistema de anúncios geolocalizados para animais perdidos e encontrados.
6. Integrar ferramentas de apoio e divulgação de campanhas para as ONGs cadastradas no hub.
7. Realizar testes de usabilidade, integração e aceitação com usuários reais e documentar os resultados.

---

## ✨ Funcionalidades

### 🐶 Adoção centralizada

Vitrine única de animais disponíveis para adoção, com filtros para encontrar o pet certo para a sua casa:

| Filtro                     | Descrição                                                 |
| -------------------------- | --------------------------------------------------------- |
| **Espécie**                | Cães e gatos                                              |
| **Porte**                  | Pequeno, médio ou grande                                  |
| **Idade**                  | Filhote, adulto ou idoso                                  |
| **Localização**            | Distância entre você e o animal (ex.: _a 1,2 km de você_) |
| **Necessidades especiais** | Animais que precisam de cuidados específicos              |

### 📍 Perdidos e achados perto de você

Anúncios de animais perdidos e encontrados exibidos no **mapa da sua região**, para facilitar o reencontro entre pets e tutores.

### 📣 Campanhas para ONGs

Espaço para divulgar arrecadações, feiras de adoção e pedidos de ajuda, dando mais visibilidade a quem faz o trabalho de resgate.

### 💬 Chat entre adotante e ONG

Conversa em **tempo real** dentro do site: o adotante fala com a ONG pelo anúncio do animal ou pelo pedido, e a ONG responde pelo painel. O andamento da adoção (pedido enviado, visita marcada, adoção aprovada) entra sozinho na conversa.

### 🆘 Central de ajuda e suporte

Perguntas frequentes com busca e **chamados com protocolo**: qualquer pessoa, com ou sem conta, escreve para a equipe e acompanha a resposta pela página.

### 🛡️ Administração

Área da equipe para **validar ONGs** antes de aparecerem no site, analisar **denúncias** e responder o **suporte**.

### 👤 Um perfil para cada papel

Cadastro e autenticação com perfis próprios para **adotantes**, **ONGs/protetores** e a **equipe** do Patinhas Club.

---

## 👥 Perfis de usuário

| Perfil               | O que pode fazer                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| **Adotante / Tutor** | Buscar animais com filtros, publicar anúncios de pets perdidos ou encontrados e acompanhar campanhas |
| **ONG / Protetor**   | Cadastrar animais para adoção, criar campanhas, conversar com os adotantes e ganhar visibilidade     |
| **Equipe (admin)**   | Validar ONGs, analisar denúncias e responder os chamados de suporte                                  |

---

## 🤝 Partes interessadas

| Parte interessada                           | Impacto            |
| ------------------------------------------- | ------------------ |
| ONGs e protetores independentes             | Afetados diretos   |
| Adotantes e tutores                         | Afetados diretos   |
| Clínicas veterinárias e pet shops parceiros | Afetados indiretos |
| Comunidade e sociedade                      | Afetados indiretos |

---

## 🔍 Análise de similares

| Solução             | Foco                                                                                               | Diferença para o Patinhas Club                                   |
| ------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Pedigree Adotar** | Conscientização e vitrine de adoção em grande escala                                               | Baixa integração comunitária para pets perdidos localmente       |
| **Adote Petz**      | Aproximar interessados em adotar e ONGs, além de promover a cultura de adoção e o bem-estar animal | Não reúne adoção, perdidos e achados e campanhas em um único hub |
| **StayPet**         | Cuidado animal: creche, hospedagem e treinamento comportamental                                    | Serviço de cuidado, sem foco em adoção e resgate                 |

**Nosso diferencial:** unir, em um só app, **adoção com filtros avançados**, **anúncios geolocalizados de perdidos e achados** e **ferramentas de divulgação para ONGs**.

---

## 🛠️ Tecnologias

| Camada                | Tecnologia                                 |
| --------------------- | ------------------------------------------ |
| Front-end             | HTML5 e CSS3; JavaScript na localização, no chat e no envio dos formulários |
| Back-end              | Node.js 22+ com Express 5                  |
| Tempo real            | Server-Sent Events (SSE), sem biblioteca extra |
| Banco de dados        | Scripts em MySQL. Roda no banco embutido (SQLite do próprio Node, sem instalar nada) ou no MySQL 8/MariaDB do XAMPP; as sessões de login também ficam no banco |
| Mapas e endereços     | Leaflet + OpenStreetMap, Nominatim e ViaCEP |
| Design / Prototipação | Figma, Inkscape, Photopea                  |

---

## ▶️ Como executar

**Só o visual (protótipo):** abra `Web/index.html` com a extensão **Live Server** do VS Code. Os formulários seguem o fluxo do protótipo (nada é salvo) e o localizador funciona, falando direto com o OpenStreetMap e a ViaCEP.

**Completo, com banco de dados — sem instalar nada:**

1. Dê dois cliques em **`iniciar.bat`** (no Linux ou macOS, `./iniciar.sh`).
2. Pronto: o navegador abre sozinho em http://localhost:3000.

Na primeira vez ele precisa de internet e faz três coisas sozinho: baixa um **Node.js portátil só para a pasta do projeto** (pasta `.node`, cerca de 30 MB, só se o computador não tiver o Node 22.13 ou mais novo; nada é instalado no Windows), instala as bibliotecas do servidor e **cria o banco** com os dados de demonstração. Das outras vezes liga em segundos, até sem internet.

**Pelo VS Code:** abra a pasta do projeto e aperte **Ctrl+Shift+B** (tarefa *Iniciar Patinhas Club*), ou **F5** para ligar com o depurador (pontos de parada no código do `Servidor` funcionam). Para voltar o banco aos dados de exemplo: *Terminal > Executar Tarefa > Recriar banco de dados e iniciar* (ou `iniciar.bat banco`). A extensão recomendada **SQLite Viewer** abre o arquivo `Servidor/dados/patinhas.db` e mostra as tabelas.

**O banco embutido:** é o SQLite que já vem dentro do Node, guardado no arquivo `Servidor/dados/patinhas.db`. Os scripts continuam em MySQL (`Banco de dados/01-esquema.sql` e `02-dados-iniciais.sql`) e o servidor traduz na hora o que muda (`AUTO_INCREMENT`, `ENUM`, `INSERT IGNORE`, `INTERVAL`, `ON DUPLICATE KEY UPDATE`...), então o mesmo SQL roda nos dois. Se alguém da equipe mudar os scripts, o servidor avisa ao ligar e basta rodar `iniciar.bat banco`.

**Com o MySQL do XAMPP (opcional):** ligue o MySQL no XAMPP, coloque `BANCO=mysql` no arquivo `Servidor/.env` (usuário e senha do MySQL também ficam lá) e use o `iniciar.bat` normalmente. O banco `patinhas` é criado sozinho na primeira vez.

**Pelo terminal (com Node 22.13+ instalado):** na pasta `Servidor`:

```bash
npm install
npm start         # abre em http://localhost:3000 e cria o banco se ele não existir
npm run banco     # recria o banco do zero (apaga o que foi salvo)
```

Contas de teste (senha `patinhas123`):

| Conta | Entra em |
| --- | --- |
| `adotante@patinhasclub.test` | Minha conta (pedidos, favoritos, mensagens) |
| `ong@patinhasclub.test` | Painel da ONG (pedidos, animais, campanhas, mensagens) |
| `admin@patinhasclub.test` | Administração (validar ONGs, denúncias e suporte) |

Para conferir a conexão com o banco, abra http://localhost:3000/api/saude (`"banco": "conectado"`).

No MySQL, se preferir rodar o SQL na mão (Workbench, phpMyAdmin), execute `Banco de dados/01-esquema.sql` e depois `02-dados-iniciais.sql`.

**No celular:** a localização do navegador só funciona em endereço seguro (`https://` ou `localhost`). Para testar o GPS de verdade no celular, publique o site com HTTPS ou use um túnel como `npx localtunnel --port 3000`.

---

## 🗺️ Páginas do site

| Página                          | Para quem | O que faz                                                                              |
| ------------------------------- | --------- | -------------------------------------------------------------------------------------- |
| `index.html`                    | Todos     | Página inicial com a **escolha de perfil**: "Quero adotar" ou "Sou ONG ou protetor"    |
| `adocao.html`                   | Adotante  | Vitrine de animais com **filtros que funcionam** e formulário de pedido em cada cartão |
| `lista_de_espera.html`          | Adotante  | Aviso quando chegar um animal com o perfil procurado                                   |
| `cadastro-adotante.html`        | Adotante  | Criação de conta de adotante                                                           |
| `minha-conta.html`              | Adotante  | Área do adotante: pedidos com andamento, favoritos, alertas e anúncios                 |
| `cadastro-ong.html`             | ONG       | Cadastro de ONG, abrigo ou protetor independente, em 5 etapas                          |
| `cadastro-ong-enviado.html`     | ONG       | Confirmação do cadastro e próximos passos da verificação                               |
| `entrar.html`                   | Todos     | Login com abas "Sou adotante" e "Sou ONG" (`entrar.html#ong` já abre a aba da ONG)     |
| `painel-ong.html`               | ONG       | Painel: números, pedidos de adoção, animais, campanhas e perfil                        |
| `cadastrar-animal.html`         | ONG       | Publicação de animal para adoção (com opção de salvar rascunho)                        |
| `nova-campanha.html`            | ONG       | Criação de campanha: arrecadação, vaquinha, evento, voluntários ou saúde               |
| `ongs.html`                     | Todos     | Diretório das ONGs verificadas, com filtro por espécie e serviço                       |
| `campanhas.html`                | Todos     | Campanhas abertas, com filtro por tipo e progresso da meta                             |
| `animais-perdidos.html`         | Todos     | Mural de perdidos e achados, com filtro e aviso "encontrei este animal"                |
| `reportar-desaparecimento.html` | Todos     | Anúncio de animal perdido                                                              |
| `denuncia.html`                 | Todos     | Denúncia de maus-tratos, que pode ser anônima                                          |
| `sobre.html`                    | Todos     | O projeto, valores, objetivos e equipe                                                 |
| `termos.html`                   | Todos     | Termos de uso, regras para ONGs, adoção responsável e privacidade (LGPD)               |
| `mensagens.html`                | Adotante e ONG | Chat em tempo real entre adotante e ONG, com lista de conversas e "Visto"         |
| `ajuda.html`                    | Todos     | Central de ajuda: perguntas frequentes com busca e chamados de suporte com protocolo   |
| `admin.html`                    | Equipe    | Administração: validar ONGs, analisar denúncias e responder o suporte                  |

Os dados (animais, ONGs, pedidos e campanhas) são **exemplos** para demonstrar o protótipo.

---

## 🎤 Roteiro para a apresentação

1. **Escolha de perfil:** na página inicial, passe o mouse pelas duas "portas" (adotante e ONG).
2. **Lado da ONG:** "Cadastrar minha ONG" → preencha o formulário (as etapas da lateral ganham um visto) → "Enviar cadastro para análise" → "Conhecer o painel da ONG".
3. **Painel:** abra "Ver respostas" de um pedido e clique em "Convidar para visita"; depois "Cadastrar animal" → "Publicar animal" volta para o painel com aviso de sucesso.
4. **Lado do adotante:** na adoção, use os filtros (a contagem muda na hora) → "Quero adotar" abre o formulário dentro do cartão → envie e veja o aviso.
5. **Conta:** "Criar conta de adotante" → "Criar minha conta" leva para a área "Minha conta" com mensagem de boas-vindas.

**Com o servidor ligado (dados reais):**

6. **Chat ao vivo:** abra o site em uma janela normal (entre com `adotante@patinhasclub.test`) e em uma janela anônima (entre com `ong@patinhasclub.test`). Nas duas, abra **Mensagens**: o que um escreve aparece na hora para o outro, e o "Visto" surge quando a outra pessoa lê.
7. **Adoção de ponta a ponta:** como adotante, peça um animal e favorite outro pelo coração. No painel da ONG, marque a visita: o andamento aparece no pedido e na conversa.
8. **Suporte:** em **Ajuda**, busque "senha" nas perguntas e abra um chamado. Entre com `admin@patinhasclub.test`, responda em **Chamados** e veja a resposta na página do chamado.
9. **Validação de ONG:** na administração, aprove o "Recanto dos Bigodes": ele passa a aparecer em **ONGs** (o link para criar a senha aparece no terminal).

---

## 🧩 Como o site funciona sem JavaScript

A turma usa só HTML e CSS nesta etapa, então todas as interações foram feitas com recursos nativos:

| Interação                                                       | Como foi feita                                                                                     |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Filtros da adoção, perdidos, ONGs e campanhas                   | `input type="radio"`/`checkbox` + seletor `:has()` no CSS, que esconde os cartões que não combinam |
| Contagem "Mostrando X de Y"                                     | Contador do CSS (`counter-increment`), que só conta os cartões visíveis                            |
| Abas do "Como funciona"                                         | `radio` + `:has()`                                                                                 |
| Abas do login e avisos de sucesso                               | Pseudo-classe `:target` (o endereço termina com `#ong`, `#pedido-enviado`...)                      |
| Formulários que abrem dentro dos cartões e perguntas frequentes | Elemento `<details>`                                                                               |
| Etapas do cadastro que ganham visto                             | `:has(:invalid)` e `:focus-within`                                                                 |
| Mensagens de erro nos campos                                    | `:user-invalid` + atributos `required`, `pattern`, `min`, `max`                                    |
| Movimento dos botões e cartões                                  | `transition`, `transform` e `@keyframes` (desligados para quem pede menos movimento no sistema)    |

**Formulários:** todos enviam com `method="post"` para uma rota do servidor (`/api/...`). O servidor grava no banco e responde com um redirecionamento para o aviso de sucesso que já existia (por exemplo, `painel-ong.html#animal-publicado`), então eles funcionam mesmo sem JavaScript. Com JavaScript, o `scripts/app.js` envia sem recarregar, mostra os erros do servidor ao lado de cada campo e preenche nome, telefone e e-mail de quem já entrou. Sem o servidor ligado, o atributo `data-prototipo` mantém o fluxo antigo do protótipo.

**Onde o JavaScript é indispensável:** a localização do aparelho só existe pela API de geolocalização do navegador. Por isso o localizador aparece só quando há JavaScript (`hidden` no HTML); sem ele, a pessoa preenche o endereço normalmente.

---

## 🎨 Identidade visual no site

O site segue o `Design Digital/MIV_Patinhas_Club.pdf`:

- **Cores:** Bege `#FAE3B0` (fundos), Marrom `#7B4A2E` (textos de apoio e botões escuros), Turquesa `#00C8DA` (destaques, linhas e ícones), Laranja `#E48C0A` (chamadas e botões principais) e Amarelo Ouro `#FFCC00` (detalhes).
- **Fontes:** Delius Swash Caps nos títulos de destaque e Poppins no restante.
- **Logo:** versão principal no cabeçalho e no rodapé, sempre sobre fundo claro e com pelo menos 150 px de largura.
- Os tons mais escuros de turquesa e marrom usados nos textos existem para manter o contraste mínimo de acessibilidade (WCAG AA).
- **Fundos e caixas:** o bege forte (`#FAE3B0`) fica para as faixas de destaque. Listas, formulários e painéis usam um bege mais claro (`--canvas`) com caixas brancas de contorno e sombra visíveis, para a caixa nunca se confundir com o fundo. Os campos têm contorno com contraste 3:1.
- **Logo:** sempre sobre branco, como pede o manual (a patinha é bege e some em fundo bege): cabeçalho e rodapé brancos e, na página Sobre, a logo grande dentro de um cartão branco.
- **Ícones das abas:** cada aba do menu, dos menus da conta e da ONG e da tela de entrar tem um ícone próprio, desenhado para o projeto (sem emojis) em `Web/img/icones/abas/`: 24×24, traço de 1,75 e cantos redondos, a mesma família dos outros ícones do site. O CSS usa os ícones como máscara, então eles pegam a cor do texto (turquesa na aba atual) e funcionam até com o HTML aberto direto do computador.
- **Botões:** laranja para a ação principal, marrom para a ação dentro de cartões, branco com contorno marrom para a secundária. Rótulos curtos, de até três palavras; quando se repetem (como "Quero adotar"), o nome do animal fica no texto para leitores de tela.

Toda a estilização fica em `Web/styles/styles.css`, organizada por seções com índice no topo do arquivo. Os ícones estão em `Web/img/icones/`.


---

## 📍 Localização em tempo real

Quem reporta um animal perdido, faz uma denúncia ou avisa "encontrei este animal" não precisa digitar o endereço: um toque em **Usar minha localização atual** e o formulário se preenche sozinho.

| Etapa | Como funciona |
| --- | --- |
| GPS ao vivo | `navigator.geolocation.watchPosition` com alta precisão. A posição e o raio de incerteza (±m) atualizam a cada leitura; leituras piores sem a pessoa ter se mexido são descartadas |
| Ponto exato | O pino aparece num mapa (Leaflet + OpenStreetMap). Se o GPS estiver impreciso, é só arrastar o pino ou tocar no lugar certo, e o endereço acompanha |
| Endereço | As coordenadas viram rua, número, bairro, cidade e estado pelo Nominatim (OpenStreetMap). O CEP, o bairro e o nome oficial da rua são conferidos na ViaCEP (Correios), escolhendo o CEP certo até em ruas com um CEP por trecho |
| CEP | Digitou o CEP? Rua, bairro, cidade e estado entram sozinhos e o pino vai para a rua, para a pessoa marcar o ponto |
| Sem GPS | Quem digita o endereço também ganha coordenadas: o servidor calcula depois de salvar, para o anúncio aparecer na busca por distância |
| Banco | Cada endereço guarda `latitude`, `longitude`, `precisao_m` (raio do GPS) e `origem` (`gps`, `mapa`, `cep` ou `digitado`) |
| Perto de mim | Na adoção e no mural, o botão **Perto de mim** ordena a lista pela distância, calculada pelo banco com `ST_Distance_Sphere` |

**Sobre a exatidão:** a precisão depende do aparelho. Celular com GPS ao ar livre fica em poucos metros; computador usa Wi-Fi e pode errar centenas de metros. Por isso o site mostra o raio de precisão, avisa quando o ponto é aproximado e deixa ajustar o pino: o endereço salvo é sempre o que a pessoa confirmou.

**Cuidados:** o GPS para sozinho depois de 2 minutos ou quando a aba fica em segundo plano (bateria). Do adotante, o site guarda só a cidade. As buscas respeitam a política de uso do OpenStreetMap (no máximo 1 por segundo, com identificação e cache) e o mapa mostra a atribuição exigida.

---

## 💬 Chat entre adotante e ONG

- **Onde fica:** `mensagens.html` (botão de balão no cabeçalho, com o número de mensagens não lidas). Abre pelo cartão do animal ("Conversar com a ONG"), pelo pedido em "Minha conta" ou pelo botão "Conversar" no painel da ONG.
- **Uma conversa por adotante e ONG**, como uma lista de contatos: o animal em pauta aparece no topo, com a situação do pedido.
- **Tempo real com SSE:** o navegador mantém uma conexão aberta (`EventSource`) e o servidor empurra as mensagens novas, o "Visto" e o número de não lidas. Se a conexão cair, a página consulta o servidor a cada 5 segundos até ela voltar; sem JavaScript, o formulário envia e a página recarrega.
- **Andamento da adoção na conversa:** "Pedido enviado", "Visita marcada" e "Adoção aprovada" entram como registros automáticos.
- **Segurança:** só os dois participantes leem a conversa; a ONG só inicia conversa com quem pediu um animal dela; o texto é sempre mostrado como texto (nunca vira HTML); limite de 40 mensagens por minuto.

## 🆘 Central de ajuda e administração

- **Ajuda (`ajuda.html`):** perguntas frequentes por tema, com busca enquanto a pessoa digita, e formulário de suporte. Cada chamado recebe um protocolo (ex.: `SUP-7K2M9QXA`); quem abriu sem conta acompanha com o protocolo e o e-mail.
- **Administração (`admin.html`, conta da equipe):** aprova ou recusa ONGs (a aprovação envia o link para criar a senha), muda a situação das denúncias com anotação e responde os chamados. Cada resposta avisa a pessoa por e-mail e nos avisos da conta.
- **Avisos da conta:** os avisos gravados no banco (pedido novo, resposta do suporte, ONG aprovada) aparecem na visão geral de "Minha conta", do painel da ONG e da administração.

## 🗄️ Banco de dados

Arquivos na pasta `Banco de dados`:

- `01-esquema.sql`: 40 tabelas, 3 views e 5 gatilhos, com comentários explicando as decisões.
- `02-dados-iniciais.sql`: estados (com código IBGE), cidades do Grande ABC, espécies, serviços e a demonstração igual ao protótipo (6 ONGs, animais, pedidos, mural e campanhas). As datas são relativas a hoje, então a demonstração não envelhece.

O que mudou em relação ao primeiro modelo:

| Antes | Agora | Por quê |
| --- | --- | --- |
| Script começava com `USE patinhas; SELECT * FROM` e tinha `--Diretório` sem espaço | Cria o banco com `utf8mb4` e roda do começo ao fim | O `SELECT` incompleto e o comentário sem espaço quebravam a execução |
| Tabela `bairros` + coluna `bairro` no endereço | Só a coluna `bairro` | Correios e mapa escrevem o mesmo bairro de jeitos diferentes; a tabela acumularia duplicatas |
| `latitude`/`longitude` obrigatórias | Opcionais, com `precisao_m` e `origem` | Nem todo endereço vem do GPS; o servidor completa depois |
| `senha_hash` obrigatória | Opcional | A ONG só cria a senha quando o cadastro é aprovado |
| `cpf` obrigatório | Opcional e único | O formulário de adotante não exige CPF |
| Enums diferentes do site (`protetor_independente`, `voluntarios`, categorias de denúncia) | Iguais aos `value` dos formulários | Evita tradução e erro na hora de gravar |
| Pedido de adoção, lista de espera e anúncio exigiam conta | Podem ser feitos sem conta (o contato fica no registro) | É assim que o site funciona; quem tem conta acompanha tudo em "Minha conta" |
| Faltavam campos dos formulários | Animais (saúde, jeito, convivência, requisitos...), ONGs (responsável, documentos, área), campanhas (meta, local, como ajudar), denúncias (quantidade, fotos privadas) | Todo campo do site tem onde ser guardado |

Tabelas novas desta versão:

| Tabela | Para quê |
| --- | --- |
| `conversas` e `mensagens` | Chat: uma conversa por adotante e ONG; `leu_ate` de cada lado guarda até onde a pessoa já leu (é assim que o site conta as não lidas e mostra o "Visto") |
| `chamados_suporte` e `chamado_mensagens` | Central de ajuda: protocolo único, situação (aberto, respondido, resolvido) e o histórico das mensagens |
| `administradores` | Contas da equipe que validam ONGs, analisam denúncias e respondem o suporte |
| `sessoes` | Logins guardados no banco: continuam valendo depois de reiniciar o servidor |

Além disso: `ongs.motivo_recusa`, `denuncias.parecer` e a view `vw_conversas` (lista de conversas com a última mensagem e as não lidas de cada lado).

Regras garantidas pelo próprio banco: chaves estrangeiras, `CHECK` (coordenadas válidas, datas da campanha, rascunho incompleto não pode ser publicado) e gatilhos que gravam o histórico dos pedidos, mudam a situação do animal quando a visita é marcada ou a adoção aprovada, atualizam a conversa a cada mensagem e mudam a situação do chamado a cada resposta.

---

## 🔌 Servidor e API

O servidor (`Servidor/`, Node.js + Express) entrega as páginas da pasta `Web` trocando os cartões de exemplo pelos dados do banco. As páginas marcam esses trechos com `<!-- dados:nome -->`, então quem edita o HTML continua vendo o protótipo.

| Rota | O que faz |
| --- | --- |
| `GET /api/localizacao/reverso?lat=&lon=` | Coordenadas → endereço (Nominatim + ViaCEP) |
| `GET /api/localizacao/cep/:cep` | CEP → endereço e coordenadas (com cache na tabela `ceps`) |
| `GET /api/localizacao/buscar?logradouro=&numero=&bairro=&cidade=&uf=` | Endereço → coordenadas |
| `POST /api/anuncios` · `POST /api/anuncios/:id/avisos` · `POST /api/anuncios/:id/resolver` | Animal perdido, "encontrei este animal" e "ele voltou para casa" |
| `POST /api/denuncias` | Denúncia (fotos e vídeos ficam em pasta privada) |
| `POST /api/animais/:id/pedidos` · `POST /api/lista-de-espera` · `POST /api/alertas/:id/pausar` | Adoção |
| `POST /api/adotantes` · `POST /api/ongs` · `POST /api/entrar` · `GET /sair` · `GET /api/sessao` | Contas e login |
| `POST /api/senha/recuperar` · `GET /redefinir-senha` · `POST /api/senha/redefinir` | Senha (sem servidor de e-mail configurado, o link aparece no terminal) |
| `POST /api/ong/animais` · `POST /api/ong/animais/:id/publicar` · `POST /api/ong/campanhas` · `POST /api/ong/pedidos/:id/status` · `POST /api/ong/perfil` | Área da ONG (exige login de ONG) |
| `POST /api/conta/dados` · `POST /api/conta/senha` · `POST /api/favoritos/:id` | Minha conta: dados, troca de senha e favoritos |
| `POST /api/conversas` · `GET /api/conversas/eventos` (SSE) · `GET /api/conversas/nao-lidas` · `GET` e `POST /api/conversas/:id/mensagens` · `POST /api/conversas/:id/lida` | Chat entre adotante e ONG |
| `POST /api/suporte/chamados` · `POST /api/suporte/acompanhar` · `POST /api/suporte/chamados/:protocolo/mensagens` · `POST /api/suporte/chamados/:protocolo/resolver` | Central de ajuda |
| `POST /api/admin/ongs/:id/aprovar` · `POST /api/admin/ongs/:id/recusar` · `POST /api/admin/denuncias/:id` · `POST /api/admin/chamados/:id/mensagens` · `GET /api/admin/documentos/:id` | Administração (exige conta da equipe) |
| `GET /api/saude` | Diz se o banco está conectado |

Segurança: senhas com `scrypt`, sessão guardada no banco com cookie `httpOnly` e `SameSite`, cada área liberada só para o tipo de conta certo, limite de tentativas no login, consultas sempre com parâmetros (`?`), todo texto do banco escapado no HTML e documentos enviados fora da pasta pública.

Testes: `npm test` (unidade, inclusive a tradução do SQL para o banco embutido) e `npm run teste:fluxos` (ponta a ponta: cadastros com fotos e documentos, anúncios, denúncias, animais, campanhas, lista de espera, chat, suporte, administração e todas as páginas; precisa do servidor ligado e do banco recém-criado com `npm run banco`).

---

## 🧑‍💻 Equipe

Projeto desenvolvido por seis estudantes como Projeto Integrador:

| Integrante                   | Responsabilidades                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| **Daniel S. Esteves**        | QA (testes e análise do sistema) e design do sistema                                       |
| **Gabriel Elias da Silva**   | Líder do Projeto Integrador e levantamento de requisitos                                   |
| **Gabriel M. Silva**         | Desenvolvimento back-end, design do logotipo e wireframe                                   |
| **Gabriel S. Costa**         | Levantamento de requisitos, desenvolvimento full-stack e arquitetura de software           |
| **Luiz Henrique S. Ventura** | Desenvolvimento front-end, modelagem e estrutura do banco de dados e design digital        |
| **Willian B. A. de Sousa**   | Desenvolvimento back-end, wireframe, Scrum Master, modelagem e estrutura do banco de dados |

Regras da equipe

• Ninguém faz commit direto na main.

• Cada tarefa é uma branch: feature/nome-da-tarefa.

• Todo PR precisa de revisão de pelo menos 1 colega antes do merge.

• Mensagens de commit no imperativo (Adiciona, Corrige…).

• Rodar git pull antes de começar a trabalhar.

---

## 🤲 Contribuição

Sugestões e melhorias são bem-vindas! Para contribuir:

1. Faça um fork do projeto;
2. Crie uma branch para a sua alteração (`git checkout -b feature/minha-melhoria`);
3. Faça o commit (`git commit -m "Adiciona minha melhoria"`);
4. Envie para a sua branch (`git push origin feature/minha-melhoria`);
5. Abra um Pull Request.

---
**Feito com 💚 para quem ama os bichinhos.**

🐾 _Patinhas Club: adotar, resgatar e reencontrar._
