/**
 * @file middlewares/logRequisicoes.js
 * @description Middleware personalizado de registro (log) de requisições HTTP.
 * Pertence à camada de middlewares. Cumprindo exigência de middleware prórprio. Calcula a  
 * latência e formata o log no console.
*/

/**
 * Middleware que intercepta cada requisição HTTP e calcula o tempo total de resposta.

 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
*/

function logRequisicoes(req, res, next) {
  const inicio = process.hrtime();

  // Executa após a conclusão da resposta HTTP
  res.on('finish', () => {
    const diferenca = process.hrtime(inicio);
    const duracaoMs = ((diferenca[0] * 1e9 + diferenca[1]) / 1e6).toFixed(2);
    const dataHora = new Date().toISOString().replace('T', ' ').slice(0, 19);

    console.log(`[${dataHora}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duracaoMs}ms`);
  });

  next();
}

module.exports = logRequisicoes;
