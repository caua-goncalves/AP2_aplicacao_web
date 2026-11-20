/**
 
 * @file seed.js
 * @description Script de povoamento (seed) do banco de dados SQLite.
 * Pertence à camada de dados/persistência. Cria o esquema se necessário,
 * limpa registros anteriores para garantir idempotência e insere dados
 * de demonstração com senhas criptografadas em bcrypt para testes.

 */

const bcrypt = require('bcryptjs');
const { obterConexao } = require('./dados/conexao');
const { criarEsquema } = require('./esquema');

/**

 * Executa o povoamento inicial do banco de dados com usuários, médicos e consultas de teste.
 * As senhas são geradas com hash seguro (bcrypt com salt 10) conforme exigência de segurança.

 * @returns {void}
 */

function popularBanco() {
  console.log('[Seed] Iniciando processo de seed do banco de dados...');
  const db = obterConexao();

  // Garante que o esquema exista antes de inserir os dados
  criarEsquema();

  // Limpa as tabelas existentes mantendo a ordem correta para não violar chaves estrangeiras
  db.exec('DELETE FROM consultas;');
  db.exec('DELETE FROM medicos;');
  db.exec('DELETE FROM usuarios;');

  // Reinicia contadores de autoincremento para IDs determinísticos
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('usuarios', 'medicos', 'consultas');");

  /* DECISÃO DE SEGURANÇA:
    Nunca salvar senhas em texto puro. O bcrypt gera um salt aleatório e aplica função de derivação de chave lenta para proteção contra ataques de dicionário e rainbow tables.
  */ 

  const saltRounds = 10;
  const hashSenhaPadrao = bcrypt.hashSync('senha123', saltRounds);

  // 1. Inserção de usuários (Pacientes e Médicos)
  const stmtUsuario = db.prepare(`
    INSERT INTO usuarios (nome, email, senha_hash, papel)
    VALUES (?, ?, ?, ?)
    `);

  // Pacientes de teste
  const resPaciente1 = stmtUsuario.run('Carlos Eduardo Paciente', 'paciente@clinica.com', hashSenhaPadrao, 'paciente');
  const paciente1Id = resPaciente1.lastInsertRowid;

  const resPaciente2 = stmtUsuario.run('Maria Souza', 'maria@clinica.com', hashSenhaPadrao, 'paciente');
  const paciente2Id = resPaciente2.lastInsertRowid;

  // Médicos de teste (contas de login)
  const resMedico1User = stmtUsuario.run('Dr. Roberto Silva', 'medico@clinica.com', hashSenhaPadrao, 'medico');
  const medico1UserId = resMedico1User.lastInsertRowid;

  const resMedico2User = stmtUsuario.run('Dra. Ana Costa', 'dra.ana@clinica.com', hashSenhaPadrao, 'medico');
  const medico2UserId = resMedico2User.lastInsertRowid;

  // 2. Inserção no perfil de Médicos
  const stmtMedico = db.prepare(`
    INSERT INTO medicos (usuario_id, crm, especialidade, preco_consulta)
    VALUES (?, ?, ?, ?)
    `);

  const resMed1 = stmtMedico.run(medico1UserId, 'CRM-CE 12345', 'Cardiologia', 250.00);
  const medico1Id = resMed1.lastInsertRowid;

  const resMed2 = stmtMedico.run(medico2UserId, 'CRM-CE 67890', 'Dermatologia', 220.00);
  const medico2Id = resMed2.lastInsertRowid;

  // 3. Inserção de consultas de demonstração
  const stmtConsulta = db.prepare(`
    INSERT INTO consultas (paciente_id, medico_id, data_hora, status, observacoes)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Gera datas dinâmicas futuras e passadas para facilitar testes práticos
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  const dataAmanha14h = `${amanha.toISOString().slice(0, 10)} 14:00:00`;
  const dataAmanha15h = `${amanha.toISOString().slice(0, 10)} 15:00:00`;

  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 2);
  const dataOntem10h = `${ontem.toISOString().slice(0, 10)} 10:00:00`;
  const dataOntem16h = `${ontem.toISOString().slice(0, 10)} 16:00:00`;

  // Consulta agendada futura (Dr. Roberto - Paciente Carlos)
  stmtConsulta.run(paciente1Id, medico1Id, dataAmanha14h, 'agendada', 'Check-up cardiológico anual');

  // Consulta agendada futura (Dra. Ana - Paciente Maria)
  stmtConsulta.run(paciente2Id, medico2Id, dataAmanha15h, 'agendada', 'Avaliação dermatológica de rotina');

  // Consulta concluída no passado (para testar agregação e relatórios)
  stmtConsulta.run(paciente2Id, medico1Id, dataOntem10h, 'concluida', 'Eletrocardiograma realizado com sucesso.');

  // Consulta cancelada no passado
  stmtConsulta.run(paciente1Id, medico2Id, dataOntem16h, 'cancelada', 'Paciente desmarcou com antecedência.');

  console.log('[Seed] Dados de demonstração inseridos com sucesso.');
  console.log('Usuários de Teste (Senha para todos: senha123)');
  console.log('Paciente 1: paciente@clinica.com (Carlos Eduardo)');
  console.log('Paciente 2: maria@clinica.com (Maria Souza)');
  console.log('Médico 1:   medico@clinica.com (Dr. Roberto Silva - Cardiologia)');
  console.log('Médico 2:   dra.ana@clinica.com (Dra. Ana Costa - Dermatologia)');
  console.log(`[Seed] 4 consultas criadas (agendadas, concluídas e canceladas).`);
}

// Execução direta via CLI 
if (require.main === module) {
  try {
    popularBanco();
  } catch (erro) {
    console.error('[Seed] Erro ao popular banco:', erro.message);
    process.exit(1);
  }
}

module.exports = { popularBanco };
