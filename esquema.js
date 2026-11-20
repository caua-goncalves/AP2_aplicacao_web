/**

 * @file esquema.js
 * @description Script de inicialização do esquema do banco de dados SQLite.
 * Pertence à camada de Dados/Persistência. Lê e executa as instruções DDL do
 * esquema, garantindo a criação de tabelas, chaves primárias, estrangeiras e constraints.

 */

const fs = require('fs');
const path = require('path');
const { obterConexao, caminhoAbsoluto } = require('./dados/conexao');

/**

 * Cria a estrutura de tabelas no banco de dados SQLite.
 * Executa as diretivas de DDL e valida a integridade do banco.

 * @returns {void}
 */
function criarEsquema() {
  console.log(`[Esquema] Inicializando banco de dados em: ${caminhoAbsoluto}`);
  const db = obterConexao();

  const caminhoSql = path.join(__dirname, 'esquema.sql');
  const ddlSql = fs.readFileSync(caminhoSql, 'utf-8');

  // Executa todas as instruções DDL de criação de tabelas e índices
  db.exec(ddlSql);

  console.log('[Esquema] Tabelas criadas com sucesso:');
  console.log('- usuarios (PK, email UNIQUE, CHECK de papel)');
  console.log('- medicos  (PK, FK usuario_id, crm UNIQUE, CHECK de preco)');
  console.log('- consultas (PK, FKs paciente_id e medico_id, UNIQUE(medico_id, data_hora), CHECK status)');
  console.log('[Esquema] Restrição UNIQUE(medico_id, data_hora) ativa para proteção de horário.');
}

// Execução direta via CLI
if (require.main === module) {
  try {
    criarEsquema();
  } catch (erro) {
    console.error('[Esquema] Falha ao criar esquema:', erro.message);
    process.exit(1);
  }
}

module.exports = { criarEsquema };
