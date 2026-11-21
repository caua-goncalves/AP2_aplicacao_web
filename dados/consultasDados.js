/**

 * @file dados/consultasDados.js
 * @description Módulo de acesso a dados para o recurso Consultas (CRUD completo).
 * Pertence à camada de Dados (SQL/Persistência). Contém todas as operações
 * de banco parametrizadas, consultas relacionais complexas (JOIN) e agregações (GROUP BY, COUNT, SUM).

*/

const { obterConexao } = require('./conexao');

/**
 * Cria um novo agendamento de consulta na base de dados.

 * @param {object} dados
 * @param {number} dados.pacienteId ID do paciente (FK para usuarios)
 * @param {number} dados.medicoId ID do médico (FK para medicos)
 * @param {string} dados.dataHora Data e horário da consulta no padrão ISO YYYY-MM-DD HH:MM:00
 * @param {string} [dados.observacoes] Observações ou queixa principal
 * @returns {object} Consulta inserida com seu ID gerado

*/

function inserirConsulta({ pacienteId, medicoId, dataHora, observacoes = '' }) {
  const db = obterConexao();
  const sql = `
    INSERT INTO consultas (paciente_id, medico_id, data_hora, status, observacoes)
    VALUES (?, ?, ?, 'agendada', ?)
  `;
  const resultado = db.prepare(sql).run(pacienteId, medicoId, dataHora, observacoes);
  return {
    id: resultado.lastInsertRowid,
    pacienteId,
    medicoId,
    dataHora,
    status: 'agendada',
    observacoes
  };
}

/**
 * Busca os dados detalhados de uma consulta por seu identificador primário.

 * DECISÃO DE PERSISTÊNCIA:
 * Utiliza múltiplos JOINs para retornar em uma única viagem ao banco de dados:
 * 1. Dados da consulta (id, data_hora, status, observações);
 * 2. Dados do paciente (nome, email);
 * 3. Dados do médico e seu usuário associado (nome do médico, CRM, especialidade, valor).

 * @param {number} id Identificador único da consulta
 * @returns {object|null} Consulta detalhada ou null se não encontrada

*/
function buscarPorId(id) {
  const db = obterConexao();
  const sql = `
    SELECT 
      c.id,
      c.paciente_id,
      c.medico_id,
      c.data_hora,
      c.status,
      c.observacoes,
      c.criado_em,
      p.nome AS paciente_nome,
      p.email AS paciente_email,
      u_med.nome AS medico_nome,
      m.crm AS medico_crm,
      m.especialidade AS medico_especialidade,
      m.preco_consulta
    FROM consultas c
    JOIN usuarios p ON c.paciente_id = p.id
    JOIN medicos m ON c.medico_id = m.id
    JOIN usuarios u_med ON m.usuario_id = u_med.id
    WHERE c.id = ?
  `;
  const consulta = db.prepare(sql).get(id);
  return consulta || null;
}

/**
 * Lista consultas com base em filtros flexíveis (paciente, médico, status ou data).

 * @param {object} [filtros={}] Filtros aplicados à consulta
 * @param {number} [filtros.pacienteId] Filtrar por paciente específico
 * @param {number} [filtros.medicoId] Filtrar por médico específico
 * @param {string} [filtros.status] Filtrar por status ('agendada', 'concluida', 'cancelada')
 * @param {string} [filtros.data] Filtrar por data específica (YYYY-MM-DD)
 * @returns {Array<object>} Lista de consultas encontradas

*/

function listar(filtros = {}) {
  const db = obterConexao();
  let sql = `
    SELECT 
      c.id,
      c.paciente_id,
      c.medico_id,
      c.data_hora,
      c.status,
      c.observacoes,
      c.criado_em,
      p.nome AS paciente_nome,
      p.email AS paciente_email,
      u_med.nome AS medico_nome,
      m.crm AS medico_crm,
      m.especialidade AS medico_especialidade,
      m.preco_consulta
    FROM consultas c
    JOIN usuarios p ON c.paciente_id = p.id
    JOIN medicos m ON c.medico_id = m.id
    JOIN usuarios u_med ON m.usuario_id = u_med.id
    WHERE 1=1
  `;
  const params = [];

  if (filtros.pacienteId) {
    sql += ' AND c.paciente_id = ?';
    params.push(filtros.pacienteId);
  }

  if (filtros.medicoId) {
    sql += ' AND c.medico_id = ?';
    params.push(filtros.medicoId);
  }

  if (filtros.status) {
    sql += ' AND c.status = ?';
    params.push(filtros.status);
  }

  if (filtros.data) {
    sql += ' AND DATE(c.data_hora) = DATE(?)';
    params.push(filtros.data);
  }

  sql += ' ORDER BY c.data_hora ASC';

  return db.prepare(sql).all(...params);
}

/**

 * Verifica se já existe consulta agendada para o médico no horário especificado.

 * @param {number} medicoId ID do médico
 * @param {string} dataHora Data e horário pretendidos (YYYY-MM-DD HH:MM:00)
 * @param {number} [ignorarConsultaId] ID da consulta a ignorar (usado ao reagendar consulta existente)
 * @returns {object|null} Consulta conflitante encontrada ou null

*/

function buscarConflitoHorario(medicoId, dataHora, ignorarConsultaId = null) {
  const db = obterConexao();
  let sql = `
    SELECT id, medico_id, data_hora, status
    FROM consultas
    WHERE medico_id = ? AND data_hora = ? AND status != 'cancelada'
  `;
  const params = [medicoId, dataHora];

  if (ignorarConsultaId) {
    sql += ' AND id != ?';
    params.push(ignorarConsultaId);
  }

  const conflito = db.prepare(sql).get(...params);
  return conflito || null;
}

/**

 * Atualiza o status de uma consulta existente.

 * @param {number} id Identificador da consulta
 * @param {string} novoStatus Novo status ('agendada', 'concluida', 'cancelada')
 * @returns {boolean} Retorna true se uma linha foi alterada

*/

function atualizarStatus(id, novoStatus) {
  const db = obterConexao();
  const sql = 'UPDATE consultas SET status = ? WHERE id = ?';
  const resultado = db.prepare(sql).run(novoStatus, id);
  return resultado.changes > 0;
}

/**

 * Atualiza a data e horário de uma consulta (remarcação).

 * @param {number} id Identificador da consulta
 * @param {string} novaDataHora Nova data e hora ISO (YYYY-MM-DD HH:MM:00)
 * @returns {boolean} Retorna true se a alteração foi efetuada

*/

function atualizarDataHora(id, novaDataHora) {
  const db = obterConexao();
  const sql = 'UPDATE consultas SET data_hora = ? WHERE id = ?';
  const resultado = db.prepare(sql).run(novaDataHora, id);
  return resultado.changes > 0;
}

/**

 * Remove fisicamente uma consulta do banco de dados.
 *
 * @param {number} id Identificador da consulta
 * @returns {boolean} Retorna true se a linha foi removida

*/

function deletar(id) {
  const db = obterConexao();
  const sql = 'DELETE FROM consultas WHERE id = ?';
  const resultado = db.prepare(sql).run(id);
  return resultado.changes > 0;
}

/**

 * Gera estatísticas e relatórios agregados de consultas por especialidade.
 *
 * DECISÃO DE PERSISTÊNCIA:
 * Exigência obrigatória do item 3.4 e avaliação:
 * Utiliza funções de agregação (COUNT, SUM) e agrupamento (GROUP BY)
 * para produzir métricas analíticas calculadas diretamente no motor do banco de dados,
 * evitando transferir centenas de linhas para a memória da aplicação.

 * @returns {Array<object>} Relatório com totais por especialidade médica

*/

function obterRelatorioPorEspecialidade() {
  const db = obterConexao();
  const sql = `
    SELECT 
      m.especialidade,
      COUNT(c.id) AS total_consultas,
      SUM(CASE WHEN c.status = 'concluida' THEN 1 ELSE 0 END) AS consultas_concluidas,
      SUM(CASE WHEN c.status = 'cancelada' THEN 1 ELSE 0 END) AS consultas_canceladas,
      SUM(CASE WHEN c.status = 'agendada' THEN 1 ELSE 0 END) AS consultas_agendadas,
      ROUND(SUM(CASE WHEN c.status = 'concluida' THEN m.preco_consulta ELSE 0 END), 2) AS receita_confirmada
    FROM medicos m
    LEFT JOIN consultas c ON m.id = c.medico_id
    GROUP BY m.especialidade
    ORDER BY total_consultas DESC
  `;
  return db.prepare(sql).all();
}

/**

 * Retorna o resumo geral de atendimentos e faturamento de cada médico.
 * @returns {Array<object>} Lista com métricas agregadas por médico
 
*/

function obterEstatisticasMedicos() {
  const db = obterConexao();
  const sql = `
    SELECT 
      m.id AS medico_id,
      u.nome AS medico_nome,
      m.crm,
      m.especialidade,
      COUNT(c.id) AS total_agendamentos,
      SUM(CASE WHEN c.status = 'concluida' THEN 1 ELSE 0 END) AS atendimentos_realizados,
      ROUND(SUM(CASE WHEN c.status = 'concluida' THEN m.preco_consulta ELSE 0 END), 2) AS total_faturado
    FROM medicos m
    JOIN usuarios u ON m.usuario_id = u.id
    LEFT JOIN consultas c ON m.id = c.medico_id
    GROUP BY m.id
    ORDER BY total_agendamentos DESC
  `;
  return db.prepare(sql).all();
}

module.exports = {
  inserirConsulta,
  buscarPorId,
  listar,
  buscarConflitoHorario,
  atualizarStatus,
  atualizarDataHora,
  deletar,
  obterRelatorioPorEspecialidade,
  obterEstatisticasMedicos
};
