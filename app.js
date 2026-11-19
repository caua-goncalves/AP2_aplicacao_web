/**
 * 
 * @file app.js
 * @description Ponto de entrada da aplicação Express da Clínica Médica.
 * Camada principal responsável por configurar os middlewares globais de segurança,
 * parser de corpo de requisição, servir arquivos estáticos do front-end e inicializar o servidor HTTP.

 */

require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// middleware para processamento de JSON no corpo das requisições
app.use(express.json());

// servindo arquivos estáticos da pasta público (HTML, CSS, JS do front-end)
app.use(express.static(path.join(__dirname, 'publico')));

// rota básica de verificação de integridade
app.get('/api/status', (req, res) => {
  res.status(200).json({
    status: 'ok',
    servico: 'API Clínica Médica - Agendamento de Consultas',
    timestamp: new Date().toISOString()
  });
});

// inicialização do servidor(se executado diretamente)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Servidor] Aplicação executando na porta ${PORT}`);
    console.log(`[Servidor] Acesse: http://localhost:${PORT}`);
  });
}

module.exports = app;
