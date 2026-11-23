/**
 * @file middlewares/autenticar.js
 * @description Middleware de autenticação JWT para o Express.
 * Pertence à camada de segurança/middlewares. Valida o cabeçalho Authorization,
 * decodifica a assinatura do token e anexa a identidade do usuário na requisição.
*/

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../servicos/authServico');

/**
 * Middleware que protege endpoints exigindo um token JWT válido no cabeçalho Authorization.

 * DECISÃO DE SEGURANÇA:
 * O token deve ser transmitido no formato 'Bearer <token>'.
 * Os dados decodificados são anexados em `req.usuario`, tornando o ID e papel
 * seguros e imutáveis durante todo o ciclo de vida da requisição, inviabilizando IDOR.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
*/

function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      erro: 'Não autenticado: token de acesso JWT ausente ou formato inválido. Use: Authorization: Bearer <token>'
    });
  }

  const token = authHeader.slice(7).trim();

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    
    // Anexa a identidade autenticada na requisição
    req.usuario = payload;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        erro: 'Sessão expirada: seu token JWT expirou. Por favor, faça login novamente.'
      });
    }
    return res.status(401).json({
      erro: 'Não autenticado: token JWT inválido ou corrompido.'
    });
  }
}

module.exports = autenticar;
