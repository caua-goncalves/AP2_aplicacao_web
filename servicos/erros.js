/**
 * @file servicos/erros.js
 * @description Definição das classes de erros customizadas da aplicação.
 * Pertence à camada de Serviços. Mapeia exceções de regras de negócio,
 * validações e permissões para os respectivos códigos de status HTTP semânticos.
*/

/**
 * Classe base para erros operacionais da aplicação com status HTTP associado.
 * @extends Error
*/

class AppError extends Error {
  /**
   * @param {string} mensagem Descrição clara do erro para o cliente
   * @param {number} status Código de status HTTP (400, 401, 403, 404, 409)
  */

  constructor(mensagem, status) {
    super(mensagem);
    this.name = this.constructor.name;
    this.status = status;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erro lançado quando os dados de entrada fornecidos pelo usuário são inválidos.
 * Status HTTP: 400 Bad Request
*/

class ErroValidacao extends AppError {
  constructor(mensagem) {
    super(mensagem, 400);
  }
}

/**
 * Erro lançado em falhas de autenticação (credenciais inválidas ou token ausente/inválido).
 * Status HTTP: 401 Unauthorized
*/

class ErroAutenticacao extends AppError {
  constructor(mensagem = 'Não autenticado: forneça um token válido.') {
    super(mensagem, 401);
  }
}

/**
 * Erro lançado quando o usuário está autenticado mas não tem permissão para a ação (RBAC ou IDOR).
 * Status HTTP: 403 Forbidden
*/

class ErroPermissao extends AppError {
  constructor(mensagem = 'Acesso negado: você não tem permissão para realizar esta operação.') {
    super(mensagem, 403);
  }
}

/**
 * Erro lançado quando o recurso solicitado não é encontrado no banco de dados.
 * Status HTTP: 404 Not Found
*/

class ErroNaoEncontrado extends AppError {
  constructor(mensagem = 'Recurso não encontrado.') {
    super(mensagem, 404);
  }
}

/**
 * Erro de regra de negócio: lançado quando uma operação conflita com o estado atual do sistema
 * (Ex.: duas consultas simultâneas no mesmo horário para o mesmo médico, cancelamento de consulta já concluída).
 * Status HTTP: 409 Conflict
*/

class ErroConflito extends AppError {
  constructor(mensagem) {
    super(mensagem, 409);
  }
}

module.exports = {
  AppError,
  ErroValidacao,
  ErroAutenticacao,
  ErroPermissao,
  ErroNaoEncontrado,
  ErroConflito
};
