/**
 * @file rotas/medicosRotas.js
 * @description Rotas REST para consulta do catálogo de médicos da clínica.
 * Pertence à camada de Apresentação HTTP (Rotas). Rotas finas que não contêm SQL,
 * delegando as regras de apresentação ao serviço 'medicosServico'.
 */

const express = require('express');
const router = express.Router();
const medicosServico = require('../servicos/medicosServico');

/**
 * GET /api/medicos
 * Lista todos os médicos cadastrados com filtros opcionais por especialidade e busca.
 * Status: 200 - OK
*/

router.get('/', (req, res, next) => {
  try {
    const { especialidade, busca } = req.query;
    const medicos = medicosServico.listarMedicos({ especialidade, busca });
    return res.status(200).json(medicos);
  } catch (erro) {
    return next(erro);
  }
});

/**
 * GET /api/medicos/:id
 * Retorna os detalhes de um médico específico por ID.
 * Status: 200 - OK | 400 - Bad Request | 404 - Not Found
*/

router.get('/:id', (req, res, next) => {
  try {
    const medico = medicosServico.buscarMedicoPorId(req.params.id);
    return res.status(200).json(medico);
  } catch (erro) {
    return next(erro);
  }
});

module.exports = router;
