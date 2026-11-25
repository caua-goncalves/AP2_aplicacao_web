# AP2 - Linguagens e Tecnologias para Desenvolvimento Web

# Sistema de Clínica Médica



## 1. Descrição do Sistema e Regra Principal

O sistema é uma aplicação web para gerenciamento e agendamento de consultas médicas em uma clínica privada, permitindo que pacientes se cadastrem, consultem profissionais disponíveis por especialidade e agendem seus atendimentos, enquanto médicos acompanham suas agendas diárias, concluem atendimentos e analisam relatórios financeiros de produtividade.

> **Regra Principal do Domínio:**  
> **"Um médico não pode ter duas consultas agendadas no mesmo horário."**  

> Garantida preventivamente na camada de serviços com validação de disponibilidade e blindada fisicamente no banco de dados através da restrição `UNIQUE(medico_id, data_hora)` contra race conditions.

---

## 2. Atores e Principais Casos de Uso

| Ator (Papel) | Principais Casos de Uso |
| :--- | :--- |
| **Paciente** (`paciente`) | • Realizar auto-cadastro no sistema.<br>• Realizar login e obter token de autenticação JWT.<br>• Consultar médicos disponíveis e preços por especialidade.<br>• Agendar consulta em horário vago comercial com antecedência mínima de 2 horas.<br>• Visualizar o histórico de suas próprias consultas (**Defesa Anti-IDOR**).<br>• Remarcar ou cancelar consultas em aberto de sua titularidade. |
| **Médico** (`medico`) | • Realizar login com credenciais profissionais.<br>• Visualizar a agenda de consultas sob sua responsabilidade.<br>• Registrar a conclusão de atendimentos realizados (**Controle RBAC**).<br>• Visualizar relatórios e estatísticas agregadas (faturamento total, volume de consultas por especialidade com `COUNT`, `SUM` e `GROUP BY`). |

---

## 3. Como Instalar e Rodar

O projeto foi construído para inicialização rápida e idempotente em menos de 5 minutos:

### 3.1 Pré-requisitos
- **Node.js** (versão 18 ou superior)
- **NPM** (gerenciador de pacotes)

### 3.2 Passo a Passo

1. **Clonar o repositório:**
   ```bash
   git clone https://github.com/caua-goncalves/AP2_aplicacao_web.git
   cd AP2_aplicacao_web
   ```

2. **Configurar as variáveis de ambiente:**
   Crie o arquivo `.env` na raiz a partir do `.env.example`:
   ```bash
   cp .env.example .env
   ```
   *(No Windows PowerShell: `Copy-Item .env.example .env`)*

3. **Instalar as dependências:**
   ```bash
   npm install
   ```

4. **Criar e popular o banco de dados (Seed):**
   ```bash
   npm run seed
   ```
   *(Cria o esquema relacional no SQLite com as restrições e insere usuários e agendamentos de demonstração com senhas criptografadas).*

5. **Iniciar o servidor:**
   ```bash
   npm start
   ```
   *(Ou `npm run dev` para desenvolvimento com reload automático).*

6. **Verificar funcionamento:**
   Acesse no navegador ou cliente HTTP: `http://localhost:3000/api/status`

---

## 4. Variáveis de Ambiente Necessárias

As variáveis devem ser configuradas no arquivo `.env` (que nunca é versionado no Git):

| Variável | Descrição | Exemplo Padrão |
| :--- | :--- | :--- |
| `PORT` | Porta em que o servidor HTTP Express escutará. | `3000` |
| `JWT_SECRET` | Chave secreta usada para assinar e validar os tokens JWT. | `super_secret_jwt_clinica_chave_segura_ap2_2026` |
| `JWT_EXPIRES_IN` | Tempo de vida útil do token JWT emitido no login. | `8h` |
| `DB_PATH` | Caminho local para o arquivo de banco de dados SQLite. | `./clinica.db` |
| `NODE_ENV` | Modo de execução da aplicação (`development` ou `production`). | `development` |

---

## 5. Usuários de Teste

O script de povoamento `seed.js` cadastra previamente as seguintes contas de demonstração. Todas utilizam a senha padronizada: **`senha123`** (armazenada em hash bcrypt com salt 10, nunca em texto puro):

| Papel | Nome | E-mail | Senha | Detalhes Profissionais |
| :--- | :--- | :--- | :--- | :--- |
| **Paciente** | Carlos Eduardo Paciente | `paciente@clinica.com` | `senha123` | Paciente com consultas agendadas e histórico |
| **Paciente** | Maria Souza | `maria@clinica.com` | `senha123` | Paciente secundária para testes de concorrência e IDOR |
| **Médico** | Dr. Roberto Silva | `medico@clinica.com` | `senha123` | CRM-CE 12345 — Cardiologia (R$ 250,00) |
| **Médico** | Dra. Ana Costa | `dra.ana@clinica.com` | `senha123` | CRM-CE 67890 — Dermatologia (R$ 220,00) |

---

## 6. Contrato da API REST

A API segue rigorosamente as boas práticas REST, utilizando **Express Router** modularizado, status HTTP semânticos e controle de acesso baseado em papéis (RBAC):

| Método | Rota | Descrição | Status HTTP | Papel Exigido |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/status` | Health check da API e integridade do serviço. | `200` | Público |
| `POST` | `/api/auth/cadastro` | Cadastro de um novo paciente. | `201`, `400`, `409` | Público |
| `POST` | `/api/auth/login` | Autenticação com rate limiting e emissão de JWT. | `200`, `400`, `401` | Público |
| `GET` | `/api/medicos` | Catálogo de médicos (filtros por `especialidade` e `busca`). | `200` | Público |
| `GET` | `/api/medicos/:id` | Detalhes de um médico específico por ID. | `200`, `400`, `404` | Público |
| `GET` | `/api/consultas` | Listagem de consultas (filtrada por usuário autenticado). | `200`, `400`, `401` | Autenticado |
| `GET` | `/api/consultas/relatorios` | Relatórios com agregações (`COUNT`, `SUM`, `GROUP BY`). | `200`, `401`, `403` | medico |
| `GET` | `/api/consultas/:id` | Busca detalhada de consulta com validação anti-IDOR. | `200`, `400`, `401`, `403`, `404` | Autenticado |
| `POST` | `/api/consultas` | Agendamento de consulta com verificação de conflito. | `201`, `400`, `401`, `404`, `409` | paciente |
| `PUT` | `/api/consultas/:id` | Remarcação de data e horário de consulta existente. | `200`, `400`, `401`, `403`, `404`, `409` | Autenticado |
| `PATCH` | `/api/consultas/:id/cancelar`| Cancelamento de consulta em aberto. | `200`, `400`, `401`, `403`, `404`, `409` | Autenticado |
| `PATCH` | `/api/consultas/:id/concluir`| Conclusão do atendimento médico realizado. | `200`, `400`, `401`, `403`, `404`, `409` | medico |
| `DELETE`| `/api/consultas/:id` | Exclusão de consulta previamente cancelada. | `204`, `400`, `401`, `403`, `404`, `409` | Autenticado |


> **Decisões de projeto em códigos de status HTTP:**
> - **`409 Conflict` no `POST /api/consultas` e `PUT /api/consultas/:id`:** Disparado quando já existe consulta agendada para o médico no horário solicitado.
> - **`409 Conflict` no `DELETE /api/consultas/:id`:** Uma consulta agendada ou concluída não pode ser apagada do histórico; para exclusão física, deve estar previamente com status `'cancelada'`.
> - **`403 Forbidden` no `GET /api/consultas/:id`:** Prevenção anti-IDOR quando um paciente tenta acessar consulta de outro paciente.

---

## 7. Modelo de Dados

O banco de dados relacional (SQLite) foi modelado com chaves primárias autoincrementais em todas as tabelas, chaves estrangeiras com integridade referencial ativa (`PRAGMA foreign_keys = ON`) e restrições (`UNIQUE` e `CHECK`) que garantem as regras de negócio no nível de persistência:

### Tabelas, Relações e Restrições de Integridade

1. **`usuarios`** :
   - `id`: Chave primária (`INTEGER PRIMARY KEY AUTOINCREMENT`).
   - `nome`: Nome completo do usuário (`TEXT NOT NULL`).
   - `email`: Endereço de e-mail único (`TEXT UNIQUE NOT NULL`).
   - `senha_hash`: Senha criptografada com algoritmo bcrypt (`TEXT NOT NULL`).
   - `papel`: Perfil de acesso (`TEXT NOT NULL CHECK (papel IN ('paciente', 'medico'))`).
   - `criado_em`: Data e hora de criação do registro (`TEXT DEFAULT CURRENT_TIMESTAMP`).

2. **`medicos`** :
   - `id`: Chave primária (`INTEGER PRIMARY KEY AUTOINCREMENT`).
   - `usuario_id`: Chave estrangeira que referencia `usuarios(id)` com `ON DELETE CASCADE` e restrição `UNIQUE` (relação 1:1 obrigatória).
   - `crm`: Registro no Conselho Regional de Medicina (`TEXT UNIQUE NOT NULL`).
   - `especialidade`: Área de atuação do médico (`TEXT NOT NULL`).
   - `preco_consulta`: Valor monetário do atendimento (`NUMERIC NOT NULL CHECK (preco_consulta >= 0)`).

3. **`consultas`** :
   - `id`: Chave primária (`INTEGER PRIMARY KEY AUTOINCREMENT`).
   - `paciente_id`: Chave estrangeira que referencia `usuarios(id)` com `ON DELETE RESTRICT` (relação N:1).
   - `medico_id`: Chave estrangeira que referencia `medicos(id)` com `ON DELETE RESTRICT` (relação N:1).
   - `data_hora`: Data e horário da consulta no padrão ISO `YYYY-MM-DD HH:MM:00` (`TEXT NOT NULL`).
   - `status`: Situação da consulta (`TEXT NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada', 'concluida', 'cancelada'))`).
   - `observacoes`: Anotações ou queixa clínica principal (`TEXT`).
   - `criado_em`: Data e hora de agendamento (`TEXT DEFAULT CURRENT_TIMESTAMP`).

   - **Restrição de Integridade (Regra Principal no Banco):**
     `CONSTRAINT uq_medico_data_hora UNIQUE (medico_id, data_hora)`  
     Garante a nível físico no motor do SQLite que nenhum médico terá duas consultas no mesmo horário, blindando o sistema contra race conditions, caso ocorram requisições simultâneas.

---

## 8. Regras de Negócio e Onde Estão Implementadas

As regras de negócio são obrigatoriamente garantidas no **servidor**:

| Regra de Negócio | Descrição | Onde está Implementada |
| :--- | :--- | :--- |
| **1. Conflito de Horário do Médico (Principal)** | Impede que um médico receba duas consultas no mesmo horário. Retorna status `409 Conflict`. | [`servicos/consultasServico.js`](servicos/consultasServico.js) (verificação prévia) e [`esquema.sql`](esquema.sql) (`UNIQUE(medico_id, data_hora)`). |
| **2. Antecedência Mínima e Horário Comercial** | Agendamentos permitidos apenas em dias úteis (segunda a sexta), entre 08:00 e 18:00, em blocos de 30 minutos e com antecedência mínima de 2 horas. Retorna `400 Bad Request`. | [`servicos/validacoes.js`](servicos/validacoes.js) (`validarDataHoraConsulta`). |
| **3. Defesa Anti-IDOR (Privacidade de Dados)** | Pacientes só acessam, remarcam ou cancelam consultas de sua própria titularidade. Tentativas de acessar registros alheios retornam `403 Forbidden`. | [`servicos/consultasServico.js`](servicos/consultasServico.js) e [`middlewares/autenticar.js`](middlewares/autenticar.js). |
| **4. Imutabilidade de Consulta Concluída** | Consultas já finalizadas com status `'concluida'` não podem ser canceladas. Retorna `409 Conflict`. | [`servicos/consultasServico.js`](servicos/consultasServico.js) (`cancelarConsulta`). |
| **5. Exclusão Restrita a Canceladas** | Não é permitido excluir consultas ativas ou concluídas do banco (apenas previamente canceladas). Retorna `409 Conflict`. | [`servicos/consultasServico.js`](servicos/consultasServico.js) (`excluirConsulta`). |
| **6. Exclusividade de Conclusão por Médico** | Apenas profissionais médicos autenticados podem marcar uma consulta como concluída. Retorna `403 Forbidden`. | [`middlewares/autorizar.js`](middlewares/autorizar.js) e [`servicos/consultasServico.js`](servicos/consultasServico.js). |

---

## 9. Medidas de Segurança Adotadas


1. **Armazenamento Seguro de Senhas:** Senhas criptografadas com `bcrypt` (10 rounds de salt com chave lenta), nunca gravadas em texto puro ([`servicos/authServico.js`](servicos/authServico.js)).
2. **Autenticação Stateless com JWT:** Emissão e verificação de JSON Web Token com tempo de expiração (`JWT_EXPIRES_IN`) transmitido via cabeçalho `Authorization: Bearer <token>` ([`middlewares/autenticar.js`](middlewares/autenticar.js)).
3. **Controle de Acesso Baseado em Papéis (RBAC):** Middleware customizado que bloqueia acessos a operações restritas com HTTP 403 ([`middlewares/autorizar.js`](middlewares/autorizar.js)).
4. **Proteção Contra SQL Injection:** 100% das consultas ao banco utilizam consultas preparadas e parametrizadas com placeholders `?`, sem concatenação de strings ([`dados/usuariosDados.js`](dados/usuariosDados.js), [`dados/medicosDados.js`](dados/medicosDados.js), [`dados/consultasDados.js`](dados/consultasDados.js)).
5. **Mitigação de Ataques de Força Bruta (Rate Limiting):** Limitador de requisições rigoroso no endpoint de login (máximo de 10 tentativas a cada 15 minutos por IP) e limitador geral para a API ([`middlewares/rateLimit.js`](middlewares/rateLimit.js)).
6. **Proteção de Cabeçalhos HTTP com Helmet:** Ativação do middleware `helmet` para configurar defesas de cabeçalho como HSTS, X-Content-Type-Options e mitigação de clickjacking ([`app.js`](app.js)).
7. **Política de CORS Configurada:** Bloqueio e controle explícito de requisições de origens cruzadas ([`app.js`](app.js)).
8. **Prevenção contra Enumeração de Usuários:** Mensagem unificada e genérica no login para falhas de e-mail ou senha ([`servicos/authServico.js`](servicos/authServico.js)).
9. **Tratamento Centralizado e Ocultação de Stack Traces:** Erros não tratados (500) não expõem detalhes de código ou dados da infraestrutura para o cliente ([`middlewares/tratarErros.js`](middlewares/tratarErros.js)).
10. **Blindagem contra Vazamento de Segredos no Git:** Arquivo `.gitignore` configurado para impedir o envio de `.env`, `node_modules/` e arquivos de banco `*.db` ([`.gitignore`](.gitignore)).

---

## 10. Estrutura do Repositório

```text
AP2_aplicacao_web/
├── .env.example              # Modelo de variáveis de ambiente sem credenciais
├── .gitignore                # Regras de exclusão do Git (node_modules, .env, *.db)
├── app.js                    # Ponto de entrada do Express e orquestração de middlewares
├── package-lock.json         # Dependências do npm
├── package.json              # Dependências e scripts de execução
├── esquema.sql               # Instruções DDL com tabelas, PKs, FKs e restrições UNIQUE
├── esquema.js                # Script de execução da criação do banco
├── seed.js                   # Script de povoamento com dados e usuários de demonstração
├── dados/                    # CAMADA DE DADOS (SQL Parametrizado, JOIN, Agregações)
├── servicos/                 # CAMADA DE SERVIÇOS (Regras de Negócio e Validações)
├── middlewares/              # MIDDLEWARES DO EXPRESS (RBAC,JWT, Middleware próprio, tratamento de erros, Proteção contra força bruta)
└── publico/                  # FRONT-END (HTML, CSS e JS Vanilla servidos pelo Express)
```

---
