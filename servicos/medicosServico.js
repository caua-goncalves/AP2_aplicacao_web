/**
 * @file servicos/medicosServico.js
 * @description Módulo de regras de negócio e orquestração para Médicos.
 * Pertence à camada de Serviços. Aplica validação de dados, transformações funcionais
 * e invoca a camada de dados 'medicosDados'.
*/

const medicosDados = require('../dados/medicosDados');
const { validarId, validarTexto } = require('./validacoes');
const { ErroNaoEncontrado } = require('./erros');

/**
 * Lista os médicos cadastrados aplicando filtros opcionais e formatando a resposta.

 * USO DE FUNÇÕES DE ALTA ORDEM (map):
 * Demonstra a exigência do §3.2 do projeto usando map para transformar cada registro do banco
 * em um objeto seguro e com valor monetário formatado para a apresentação.
 *
 * @param {object} [filtros={}] Filtros de pesquisa
 * @param {string} [filtros.especialidade] Filtrar por especialidade
 * @param {string} [filtros.busca] Filtrar por termo de busca
 * @returns {Array<object>} Lista de médicos formatados
*/

function listarMedicos(filtros = {}) {
  const filtrosSanitizados = {};

  if (filtros.especialidade && typeof filtros.especialidade === 'string') {
    filtrosSanitizados.especialidade = filtros.especialidade.trim();
  }

  if (filtros.busca && typeof filtros.busca === 'string') {
    filtrosSanitizados.busca = filtros.busca.trim();
  }

  const medicos = medicosDados.listarTodos(filtrosSanitizados);

  // Uso de map para enriquecer e padronizar os dados entregues pela camada
  return medicos.map((medico) => ({
    id: medico.id,
    nome: medico.nome,
    email: medico.email,
    crm: medico.crm,
    especialidade: medico.especialidade,
    precoConsulta: Number(medico.preco_consulta),
    precoFormatado: `R$ ${Number(medico.preco_consulta).toFixed(2).replace('.', ',')}`
  }));
}

/**
 * Busca um médico pelo ID e valida sua existência.

 * @param {number|string} id Identificador do médico
 * @returns {object} Dados completos do médico
 * @throws {ErroValidacao} 400 se o ID for inválido
 * @throws {ErroNaoEncontrado} 404 se o médico não existir
*/

function buscarMedicoPorId(id) {
  const idValido = validarId(id, 'id do médico');
  const medico = medicosDados.buscarPorId(idValido);

  if (!medico) {
    throw new ErroNaoEncontrado(`Médico com ID ${idValido} não foi encontrado.`);
  }

  return {
    id: medico.id,
    usuarioId: medico.usuario_id,
    nome: medico.nome,
    email: medico.email,
    crm: medico.crm,
    especialidade: medico.especialidade,
    precoConsulta: Number(medico.preco_consulta),
    precoFormatado: `R$ ${Number(medico.preco_consulta).toFixed(2).replace('.', ',')}`
  };
}

module.exports = {
  listarMedicos,
  buscarMedicoPorId
};
