/**
 * @file rotas/authRotas.js
 * @description Rotas REST para autenticação e cadastro de usuários.
 * Pertence à camada de Apresentação HTTP (Rotas). Rotas finas responsáveis apenas
 * por receber as requisições HTTP, delegar ao serviço 'authServico' e retornar respostas padronizadas.
*/

const express = require('express');
const router = express.Router();
const authServico = require('../servicos/authServico');
const { limiterLogin } = require('../middlewares/rateLimit');

/**
 * POST /api/auth/cadastro
 * Realiza o auto-cadastro de um novo paciente.
 * Status: 201 - Created | 400 - Bad Request | 409 - Conflict
*/

router.post('/cadastro', (req, res, next) => {
  try {
    const { nome, email, senha } = req.body;
    const novoPaciente = authServico.cadastrarPaciente({ nome, email, senha });
    return res.status(201).json({
      mensagem: 'Paciente cadastrado com sucesso.',
      usuario: novoPaciente
    });
  } catch (erro) {
    return next(erro);
  }
});

/**
 * POST /api/auth/login
 * Autentica usuário (paciente ou médico) e devolve o token JWT assinado.
 * Protegido com Rate Limiting rigoroso contra ataques de força bruta.
 * Status: 200 - OK | 400 - Bad Request | 401 - Unauthorized
*/

router.post('/login', limiterLogin, (req, res, next) => {
  try {
    const { email, senha } = req.body;
    const resultado = authServico.login({ email, senha });
    return res.status(200).json(resultado);
  } catch (erro) {
    return next(erro);
  }
});

module.exports = router;
