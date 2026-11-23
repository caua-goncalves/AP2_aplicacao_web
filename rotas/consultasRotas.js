/**
 * @file rotas/consultasRotas.js
 * @description Rotas REST para o recurso de consultas (CRUD completo e Relatórios).
 * Pertence à camada de Apresentação HTTP (Rotas). Roteamento fino, protegido por
 * autenticação JWT e autorização RBAC, delegando o processamento para 'consultasServico'.
*/

const express = require('express');
const router = express.Router();
const consultasServico = require('../servicos/consultasServico');
const autenticar = require('../middlewares/autenticar');
const autorizarPapel = require('../middlewares/autorizar');

// TODAS as rotas de consultas exigem token JWT autenticado
router.use(autenticar);

/**
 * GET /api/consultas
 * Lista consultas associadas ao usuário autenticado (anti-IDOR: paciente vê as suas; médico vê as suas).
 * Status: 200 - OK | 400 - Bad Request
*/

router.get('/', (req, res, next) => {
  try {
    const { status, data } = req.query;
    const consultas = consultasServico.listarConsultas({ status, data }, req.usuario);
    return res.status(200).json(consultas);
  } catch (erro) {
    return next(erro);
  }
});

/**
 * GET /api/consultas/relatorios
 * Rota analítica restrita a médicos (agregações: COUNT, SUM, GROUP BY).
 * Status: 200 - OK | 403 - Forbidden
*/

router.get('/relatorios', autorizarPapel('medico'), (req, res, next) => {
  try {
    const relatorios = consultasServico.obterRelatorios(req.usuario);
    return res.status(200).json(relatorios);
  } catch (erro) {
    return next(erro);
  }
});

/**
 * GET /api/consultas/:id
 * Busca detalhes de uma consulta por ID com verificação de propriedade (anti-IDOR).
 * Status: 200 - OK | 400 - Bad Request | 403 - Forbidden | 404 - Not Found
*/

router.get('/:id', (req, res, next) => {
  try {
    const consulta = consultasServico.buscarConsultaPorId(req.params.id, req.usuario);
    return res.status(200).json(consulta);
  } catch (erro) {
    return next(erro);
  }
});

/**
 * POST /api/consultas
 * Registra um novo agendamento de consulta na clínica.
 * Valida a regra de não duplicação de horário no servidor e no banco.
 * Status: 201 - Created | 400 - Bad Request | 404 - Not Found | 409 - Conflict
*/

router.post('/', (req, res, next) => {
  try {
    const resultado = consultasServico.agendarConsulta(req.body, req.usuario);
    return res.status(201).json(resultado);
  } catch (erro) {
    return next(erro);
  }
});

/**
 * PUT /api/consultas/:id
 * Remarca data e horário de uma consulta existente.
 * Status: 200 - OK | 400 - Bad Request | 403 - Forbidden | 404 - Not Found | 409 - Conflict
*/

router.put('/:id', (req, res, next) => {
  try {
    const { novaDataHora } = req.body;
    const resultado = consultasServico.remarcarConsulta(req.params.id, novaDataHora, req.usuario);
    return res.status(200).json(resultado);
  } catch (erro) {
    return next(erro);
  }
});

/**
 * PATCH /api/consultas/:id/cancelar
 * Cancela uma consulta em aberto.
 * Status: 200 - OK | 400 - Bad Request | 403 - Forbidden | 404 - Not Found | 409 - Conflict
*/

router.patch('/:id/cancelar', (req, res, next) => {
  try {
    const resultado = consultasServico.cancelarConsulta(req.params.id, req.usuario);
    return res.status(200).json(resultado);
  } catch (erro) {
    return next(erro);
  }
});

/**
 * PATCH /api/consultas/:id/concluir
 * Marca a consulta como realizada. Operação restrita ao médico responsável.
 * Status: 200 - OK | 400 - Bad Request | 403 - Forbidden | 404 - Not Found | 409 - Conflict
*/

router.patch('/:id/concluir', autorizarPapel('medico'), (req, res, next) => {
  try {
    const resultado = consultasServico.concluirConsulta(req.params.id, req.usuario);
    return res.status(200).json(resultado);
  } catch (erro) {
    return next(erro);
  }
});

/**
 * DELETE /api/consultas/:id
 * Exclui fisicamente do histórico uma consulta previamente cancelada.
 * Status: 204 - No Content | 400 - Bad Request | 403 - Forbidden | 404 - Not Found | 409 - Conflict
*/

router.delete('/:id', (req, res, next) => {
  try {
    consultasServico.excluirConsulta(req.params.id, req.usuario);
    return res.status(204).send();
  } catch (erro) {
    return next(erro);
  }
});

module.exports = router;
