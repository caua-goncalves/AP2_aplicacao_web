/**

 * @file dados/conexao.js
 * @description Gerenciador da conexão com o banco de dados SQLite.
 * Pertence à camada de Dados (SQL/Persistência). Responsável por inicializar a base,
 * aplicar diretivas de integridade referencial (foreign keys) e fornecer a instância única da conexão.

*/

require('dotenv').config();
const path = require('path');

// Obtém o caminho do banco a partir da variável de ambiente, com fallback seguro
const DB_PATH = process.env.DB_PATH || './clinica.db';
const caminhoAbsoluto = path.isAbsolute(DB_PATH) ? DB_PATH : path.resolve(process.cwd(), DB_PATH);

let db = null;

/**

 * Cria ou recupera a instância única de conexão com o SQLite.
 * Utiliza o driver 'better-sqlite3' ou o módulo nativo 'node:sqlite' (DatabaseSync)
 * garantindo compatibilidade multiplataforma sem necessidade de compilador C++.

 * @returns {object} Instância de conexão ativa com o banco SQLite 
 */
function obterConexao() {
  if (db) {
    return db;
  }

  try {
    // tenta carregar better-sqlite3 caso esteja instalado
    const BetterSqlite3 = require('better-sqlite3');
    db = new BetterSqlite3(caminhoAbsoluto);

    // ativa suporte a chaves estrangeiras, essencial para integridade referencial
    db.pragma('foreign_keys = ON');
    return db;
  } catch (errBetter) {
    try {
      // fallback para o módulo nativo node:sqlite do Node.js
      const { DatabaseSync } = require('node:sqlite');
      db = new DatabaseSync(caminhoAbsoluto);

      // SQLite por padrão desativa chaves estrangeiras, executamos o pragma explicitamente
      db.exec('PRAGMA foreign_keys = ON;');
      return db;
    } catch (errSync) {
      console.error('[ERRO FATAL] Não foi possível carregar um driver SQLite:', errSync.message);
      throw new Error('Falha ao conectar com o banco de dados SQLite.');
    }
  }
}

module.exports = {
  obterConexao,
  caminhoAbsoluto
};
