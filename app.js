/**
 * @file app.js
 * @description Ponto de entrada e configuração central da aplicação Express da Clínica Médica.
 * Camada principal responsável por orquestrar middlewares de segurança (Helmet, CORS, Rate Limit),
 * log de requisições, montagem das rotas REST da API, entrega de arquivos estáticos e tratamento de erros.
*/

require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');

const logRequisicoes = require('./middlewares/logRequisicoes');
const { limiterGeral } = require('./middlewares/rateLimit');
const tratarErros = require('./middlewares/tratarErros');

const authRotas = require('./rotas/authRotas');
const medicosRotas = require('./rotas/medicosRotas');
const consultasRotas = require('./rotas/consultasRotas');

const app = express();
const PORT = process.env.PORT || 3000;


// 1. Middlewares globais de segurança e infraestrutura

// Helmet: configura cabeçalhos HTTP defensivos (HSTS, X-Content-Type-Options)
app.use(helmet({
  contentSecurityPolicy: false // mantém permissão para scripts e estilos locais do front-end
}));

// CORS: controle de acesso e origem cruzada
app.use(cors());

// Log personalizado de cada requisição (middleware próprio
app.use(logRequisicoes);

// Parser para requisições com corpo no formato JSON
app.use(express.json());

// Servindo a pasta publico como estática
app.use(express.static(path.join(__dirname, 'publico')));


// 2. Rotas da API REST

// Limitador geral de tráfego para os endpoints da API
app.use('/api', limiterGeral);

// Rota de Health Check da API
app.get('/api/status', (req, res) => {
  res.status(200).json({
    status: 'ok',
    servico: 'API Clínica Médica - Agendamento de consultas',
    versao: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Montagem dos submódulos de rotas por recurso
app.use('/api/auth', authRotas);
app.use('/api/medicos', medicosRotas);
app.use('/api/consultas', consultasRotas);


// 3. Rota 404 para endpoints da API não encontrados

app.use('/api', (req, res) => {
  res.status(404).json({
    erro: `A rota [${req.method}] ${req.originalUrl} não foi encontrada na API.`
  });
});


// 4. Middleware centralizado de tratamento de erros

app.use(tratarErros);

// Inicialização do servidor se executado diretamente
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Servidor] Aplicação executando na porta ${PORT}`);
    console.log(`[Servidor] Acesse: http://localhost:${PORT}`);
  });
}

module.exports = app;
