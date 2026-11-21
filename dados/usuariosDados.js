/**
 * @file dados/usuariosDados.js
 * @description Módulo de acesso a dados para a entidade Usuários (pacientes e médicos).
 * Pertence à camada de Dados (SQL/Persistência). Executa operações parametrizadas
 * na tabela 'usuarios' sem acoplamento com regras de negócio ou protocolo HTTP.

*/

const { obterConexao } = require('./conexao');

/**
 * Busca um usuário pelo endereço de e-mail.

 * DECISÃO DE SEGURANÇA:
 * Uso estrito de consulta parametrizada com placeholder '?'. A parametrização separa
 * a instrução SQL dos dados inseridos pelo usuário, neutralizando qualquer vetor de SQL Injection.

 * @param {string} email E-mail único do usuário
 * @returns {object|null} Objeto com os dados do usuário ou null se não encontrado

*/

function buscarPorEmail(email) {
  const db = obterConexao();
  const sql = 'SELECT id, nome, email, senha_hash, papel, criado_em FROM usuarios WHERE email = ?';
  const usuario = db.prepare(sql).get(email);
  return usuario || null;
}

/**
 * Busca um usuário pelo identificador primário (ID).

 * @param {number} id Identificador numérico do usuário
 * @returns {object|null} Dados do usuário ou null se não encontrado

*/

function buscarPorId(id) {
  const db = obterConexao();
  const sql = 'SELECT id, nome, email, papel, criado_em FROM usuarios WHERE id = ?';
  const usuario = db.prepare(sql).get(id);
  return usuario || null;
}

/**
 * Insere um novo usuário na base de dados.

 * @param {object} dados
 * @param {string} dados.nome Nome completo
 * @param {string} dados.email E-mail único
 * @param {string} dados.senhaHash Hash da senha gerado previamente pelo bcrypt
 * @param {string} dados.papel Papel no sistema (paciente ou medico)
 * @returns {{ id: number, nome: string, email: string, papel: string }} Usuário recém-criado

*/

function inserirUsuario({ nome, email, senhaHash, papel }) {
  const db = obterConexao();
  const sql = `
    INSERT INTO usuarios (nome, email, senha_hash, papel)
    VALUES (?, ?, ?, ?)
  `;
  const resultado = db.prepare(sql).run(nome, email, senhaHash, papel);
  return {
    id: resultado.lastInsertRowid,
    nome,
    email,
    papel
  };
}

/**
 * Lista todos os usuários cadastrados com o perfil de paciente.

 * @returns {Array<object>} Lista de pacientes

*/

function listarPacientes() {
  const db = obterConexao();
  const sql = 'SELECT id, nome, email, criado_em FROM usuarios WHERE papel = ? ORDER BY nome ASC';
  return db.prepare(sql).all('paciente');
}

module.exports = {
  buscarPorEmail,
  buscarPorId,
  inserirUsuario,
  listarPacientes
};
