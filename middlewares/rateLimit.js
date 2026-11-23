/**
 * @file middlewares/rateLimit.js
 * @description Configuração de defesas contra ataques de força bruta e DoS com Rate Limiting.
 * Pertence à camada de segurança/middlewares. Para proteção de rotas sensíveis.
*/

const rateLimit = require('express-rate-limit');

/**
 * Limitador rigoroso para a rota de login (/api/auth/login).

 * DECISÃO DE SEGURANÇA:
 * Mitiga ataques de força bruta e preenchimento de credenciais, limitando cada endereço IP a * no máximo 10 tentativas a cada 15 minutos.
*/

const limiterLogin = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // max de 10 tentativas por IP
  standardHeaders: true, // Retorna contagem de limite nos cabeçalhos `RateLimit-*`
  legacyHeaders: false, // Desabilita cabeçalhos legados `X-RateLimit-*`
  message: {
    erro: 'Muitas tentativas de autenticação a partir deste endereço IP. Aguarde 15 minutos antes de tentar novamente.'
  }
});

/**
 * Limitador geral para todas as rotas públicas e da API.
 * Proteção moderada contra sobrecarga de requisições por cliente.
*/
const limiterGeral = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // até 300 requisições por janela
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    erro: 'Limite de requisições excedido. Por favor, tente novamente mais tarde.'
  }
});

module.exports = {
  limiterLogin,
  limiterGeral
};
