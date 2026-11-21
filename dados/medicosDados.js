/**
 * @file dados/medicosDados.js
 * @description Módulo de acesso a dados para a entidade Médicos.
 * Pertence à camada de Dados (SQL/Persistência). Responsável pelas consultas
 * e persistência dos dados profissionais, utilizando JOIN com a tabela de usuários.

*/

const { obterConexao } = require('./conexao');

/**
 * Lista todos os médicos cadastrados, com opção de filtro por especialidade e busca textual.

 * DECISÃO DE PERSISTÊNCIA:
 * Aplicação de JOIN entre a tabela 'medicos' e a tabela 'usuarios'. Isso permite consolidar
 * em uma única consulta os dados do perfil médico (CRM, especialidade, preço) com os dados
 * de autenticação/identificação (nome, e-mail), evitando problemas de N+1 queries.

 * @param {object} [filtros={}] Filtros de busca
 * @param {string} [filtros.especialidade] Especialidade médica para filtrar
 * @param {string} [filtros.busca] Termo para busca por nome ou CRM
 * @returns {Array<object>} Lista de médicos cadastrados

*/
function listarTodos(filtros = {}) {
  const db = obterConexao();
  let sql = `
    SELECT 
      m.id,
      m.usuario_id,
      u.nome,
      u.email,
      m.crm,
      m.especialidade,
      m.preco_consulta
    FROM medicos m
    JOIN usuarios u ON m.usuario_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (filtros.especialidade) {
    sql += ' AND LOWER(m.especialidade) = LOWER(?)';
    params.push(filtros.especialidade);
  }

  if (filtros.busca) {
    sql += ' AND (LOWER(u.nome) LIKE LOWER(?) OR LOWER(m.crm) LIKE LOWER(?))';
    const termo = `%${filtros.busca}%`;
    params.push(termo, termo);
  }

  sql += ' ORDER BY u.nome ASC';

  // todas as buscas dinâmicas passam por prepared statement parametrizado
  return db.prepare(sql).all(...params);
}

/**
 * Busca um médico pelo seu ID primário.

 * @param {number} id Identificador do médico
 * @returns {object|null} Médico encontrado com dados completos ou null

*/

function buscarPorId(id) {
  const db = obterConexao();
  const sql = `
    SELECT 
      m.id,
      m.usuario_id,
      u.nome,
      u.email,
      m.crm,
      m.especialidade,
      m.preco_consulta
    FROM medicos m
    JOIN usuarios u ON m.usuario_id = u.id
    WHERE m.id = ?
  `;
  const medico = db.prepare(sql).get(id);
  return medico || null;
}

/**
 * Busca o cadastro médico associado ao ID do usuário de login.

 * @param {number} usuarioId ID do usuário na tabela 'usuarios'
 * @returns {object|null} Perfil médico ou null se o usuário não for médico

*/

function buscarPorUsuarioId(usuarioId) {
  const db = obterConexao();
  const sql = `
    SELECT 
      m.id,
      m.usuario_id,
      u.nome,
      u.email,
      m.crm,
      m.especialidade,
      m.preco_consulta
    FROM medicos m
    JOIN usuarios u ON m.usuario_id = u.id
    WHERE m.usuario_id = ?
  `;
  const medico = db.prepare(sql).get(usuarioId);
  return medico || null;
}

/**
 * Insere um novo registro de médico vinculado a um usuário existente.

 * @param {object} dados
 * @param {number} dados.usuarioId Chave estrangeira referente ao usuário
 * @param {string} dados.crm Registro no Conselho Regional de Medicina
 * @param {string} dados.especialidade Área de atuação do médico
 * @param {number} dados.precoConsulta Valor da consulta
 * @returns {{ id: number, usuarioId: number, crm: string, especialidade: string, precoConsulta: number }}

*/

function inserirMedico({ usuarioId, crm, especialidade, precoConsulta }) {
  const db = obterConexao();
  const sql = `
    INSERT INTO medicos (usuario_id, crm, especialidade, preco_consulta)
    VALUES (?, ?, ?, ?)
  `;
  const resultado = db.prepare(sql).run(usuarioId, crm, especialidade, precoConsulta);
  return {
    id: resultado.lastInsertRowid,
    usuarioId,
    crm,
    especialidade,
    precoConsulta
  };
}

module.exports = {
  listarTodos,
  buscarPorId,
  buscarPorUsuarioId,
  inserirMedico
};
