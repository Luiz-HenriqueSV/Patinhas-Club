# 🐾 Patinhas Club
Macacos nao me mordam!
macacos me mordam

Macacos me mordam

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

### 👤 Um perfil para cada papel

Cadastro e autenticação com perfis próprios para **adotantes** e para **ONGs/protetores**.

---

## 👥 Perfis de usuário

| Perfil               | O que pode fazer                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| **Adotante / Tutor** | Buscar animais com filtros, publicar anúncios de pets perdidos ou encontrados e acompanhar campanhas |
| **ONG / Protetor**   | Cadastrar animais para adoção, criar campanhas e ganhar visibilidade                                 |

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
| Front-end             | HTML5 e CSS3 (nesta etapa, sem JavaScript) |
| Back-end              | _a definir_                                |
| Banco de dados        | MySQL                                      |
| Design / Prototipação | Figma, INkscape, Photopea                  |

---

## ▶️ Como executar

1. Baixe ou clone o repositório.
2. Abra a pasta `Web` e dê dois cliques em `index.html` (ou use a extensão **Live Server** do VS Code).
3. Com internet, o site carrega as fontes do Google Fonts (Poppins e Delius Swash Caps) e as fotos do Unsplash. Sem internet ele continua funcionando, só que com as fontes do sistema.

Não precisa instalar nada: não tem build, framework nem JavaScript.

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

Os dados (animais, ONGs, pedidos e campanhas) são **exemplos** para demonstrar o protótipo.

---

## 🎤 Roteiro para a apresentação

1. **Escolha de perfil:** na página inicial, passe o mouse pelas duas "portas" (adotante e ONG).
2. **Lado da ONG:** "Cadastrar minha ONG" → preencha o formulário (as etapas da lateral ganham um visto) → "Enviar cadastro para análise" → "Conhecer o painel da ONG".
3. **Painel:** abra "Ver respostas" de um pedido e clique em "Convidar para visita"; depois "Cadastrar animal" → "Publicar animal" volta para o painel com aviso de sucesso.
4. **Lado do adotante:** na adoção, use os filtros (a contagem muda na hora) → "Quero adotar" abre o formulário dentro do cartão → envie e veja o aviso.
5. **Conta:** "Criar conta de adotante" → "Criar minha conta" leva para a área "Minha conta" com mensagem de boas-vindas.

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

**Formulários no protótipo:** como ainda não existe back-end, os formulários usam `method="get"` e levam para a próxima tela (por exemplo, `painel-ong.html#animal-publicado`). Os campos de senha ficam sem `name` de propósito, para a senha não aparecer na barra de endereço. Quando a API existir, basta trocar o `action` pela rota do servidor, usar `method="post"` e colocar `name="senha"`.

---

## 🎨 Identidade visual no site

O site segue o `Design Digital/MIV_Patinhas_Club.pdf`:

- **Cores:** Bege `#FAE3B0` (fundos), Marrom `#7B4A2E` (textos de apoio e botões escuros), Turquesa `#00C8DA` (destaques, linhas e ícones), Laranja `#E48C0A` (chamadas e botões principais) e Amarelo Ouro `#FFCC00` (detalhes).
- **Fontes:** Delius Swash Caps nos títulos de destaque e Poppins no restante.
- **Logo:** versão principal no cabeçalho e no rodapé, sempre sobre fundo claro e com pelo menos 150 px de largura.
- Os tons mais escuros de turquesa e marrom usados nos textos existem para manter o contraste mínimo de acessibilidade (WCAG AA).

Toda a estilização fica em `Web/styles/styles.css`, organizada por seções com índice no topo do arquivo. Os ícones estão em `Web/img/icones/`.


---

## ▶️ Como executar

1. Baixe ou clone o repositório.
2. Abra a pasta `Web` e dê dois cliques em `index.html` (ou use a extensão **Live Server** do VS Code).
3. Com internet, o site carrega as fontes do Google Fonts (Poppins e Delius Swash Caps) e as fotos do Unsplash. Sem internet ele continua funcionando, só que com as fontes do sistema.

Não precisa instalar nada: não tem build, framework nem JavaScript.

---

## 🗺️ Páginas do site

| Página | Para quem | O que faz |
|---|---|---|
| `index.html` | Todos | Página inicial com a **escolha de perfil**: "Quero adotar" ou "Sou ONG ou protetor" |
| `adocao.html` | Adotante | Vitrine de animais com **filtros que funcionam** e formulário de pedido em cada cartão |
| `lista_de_espera.html` | Adotante | Aviso quando chegar um animal com o perfil procurado |
| `cadastro-adotante.html` | Adotante | Criação de conta de adotante |
| `minha-conta.html` | Adotante | Área do adotante: pedidos com andamento, favoritos, alertas e anúncios |
| `cadastro-ong.html` | ONG | Cadastro de ONG, abrigo ou protetor independente, em 5 etapas |
| `cadastro-ong-enviado.html` | ONG | Confirmação do cadastro e próximos passos da verificação |
| `entrar.html` | Todos | Login com abas "Sou adotante" e "Sou ONG" (`entrar.html#ong` já abre a aba da ONG) |
| `painel-ong.html` | ONG | Painel: números, pedidos de adoção, animais, campanhas e perfil |
| `cadastrar-animal.html` | ONG | Publicação de animal para adoção (com opção de salvar rascunho) |
| `nova-campanha.html` | ONG | Criação de campanha: arrecadação, vaquinha, evento, voluntários ou saúde |
| `ongs.html` | Todos | Diretório das ONGs verificadas, com filtro por espécie e serviço |
| `campanhas.html` | Todos | Campanhas abertas, com filtro por tipo e progresso da meta |
| `animais-perdidos.html` | Todos | Mural de perdidos e achados, com filtro e aviso "encontrei este animal" |
| `reportar-desaparecimento.html` | Todos | Anúncio de animal perdido |
| `denuncia.html` | Todos | Denúncia de maus-tratos, que pode ser anônima |
| `sobre.html` | Todos | O projeto, valores, objetivos e equipe |
| `termos.html` | Todos | Termos de uso, regras para ONGs, adoção responsável e privacidade (LGPD) |

Os dados (animais, ONGs, pedidos e campanhas) são **exemplos** para demonstrar o protótipo.

---

## 🎤 Roteiro para a apresentação

1. **Escolha de perfil:** na página inicial, passe o mouse pelas duas "portas" (adotante e ONG).
2. **Lado da ONG:** "Cadastrar minha ONG" → preencha o formulário (as etapas da lateral ganham um visto) → "Enviar cadastro para análise" → "Conhecer o painel da ONG".
3. **Painel:** abra "Ver respostas" de um pedido e clique em "Convidar para visita"; depois "Cadastrar animal" → "Publicar animal" volta para o painel com aviso de sucesso.
4. **Lado do adotante:** na adoção, use os filtros (a contagem muda na hora) → "Quero adotar" abre o formulário dentro do cartão → envie e veja o aviso.
5. **Conta:** "Criar conta de adotante" → "Criar minha conta" leva para a área "Minha conta" com mensagem de boas-vindas.

---

## 🧩 Como o site funciona sem JavaScript

A turma usa só HTML e CSS nesta etapa, então todas as interações foram feitas com recursos nativos:

| Interação | Como foi feita |
|---|---|
| Filtros da adoção, perdidos, ONGs e campanhas | `input type="radio"`/`checkbox` + seletor `:has()` no CSS, que esconde os cartões que não combinam |
| Contagem "Mostrando X de Y" | Contador do CSS (`counter-increment`), que só conta os cartões visíveis |
| Abas do "Como funciona" | `radio` + `:has()` |
| Abas do login e avisos de sucesso | Pseudo-classe `:target` (o endereço termina com `#ong`, `#pedido-enviado`...) |
| Formulários que abrem dentro dos cartões e perguntas frequentes | Elemento `<details>` |
| Etapas do cadastro que ganham visto | `:has(:invalid)` e `:focus-within` |
| Mensagens de erro nos campos | `:user-invalid` + atributos `required`, `pattern`, `min`, `max` |
| Movimento dos botões e cartões | `transition`, `transform` e `@keyframes` (desligados para quem pede menos movimento no sistema) |

**Formulários no protótipo:** como ainda não existe back-end, os formulários usam `method="get"` e levam para a próxima tela (por exemplo, `painel-ong.html#animal-publicado`). Os campos de senha ficam sem `name` de propósito, para a senha não aparecer na barra de endereço. Quando a API existir, basta trocar o `action` pela rota do servidor, usar `method="post"` e colocar `name="senha"`.

---

## 🎨 Identidade visual no site

O site segue o `Design Digital/MIV_Patinhas_Club.pdf`:

- **Cores:** Bege `#FAE3B0` (fundos), Marrom `#7B4A2E` (textos de apoio e botões escuros), Turquesa `#00C8DA` (destaques, linhas e ícones), Laranja `#E48C0A` (chamadas e botões principais) e Amarelo Ouro `#FFCC00` (detalhes).
- **Fontes:** Delius Swash Caps nos títulos de destaque e Poppins no restante.
- **Logo:** versão principal no cabeçalho e no rodapé, sempre sobre fundo claro e com pelo menos 150 px de largura.
- Os tons mais escuros de turquesa e marrom usados nos textos existem para manter o contraste mínimo de acessibilidade (WCAG AA).

Toda a estilização fica em `Web/styles/styles.css`, organizada por seções com índice no topo do arquivo. Os ícones estão em `Web/img/icones/`.

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





















Linha 352 XD --- teste