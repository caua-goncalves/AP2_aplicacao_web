/**
 * @file middlewares/tratarErros.js
 * @description Middleware centralizado de tratamento e captura de erros do Express.
 * Pertence à camada de middlewares/HTTP. Intercepta todas as exceções lançadas
 * pelas rotas e serviços, padronizando a resposta JSON e o código de status HTTP.
*/

const { AppError } = require('../servicos/erros');

/**
 * Middleware centralizado de tratamento de erros do Express.
 * Possui 4 parâmetros para que o Express o reconheça como manipulador de erro.

 * DECISÃO DE SEGURANÇA E ARQUITETURA:
 * 1 - Respostas padronizadas no formato `{ erro: mensagem }` para consumo previsível pelo  * * front-end.
 * 2 - Prevenção contra Information Disclosure: Em erros '500' inesperados, os detalhes internos
 * e stack traces são ocultados do cliente externo, evitando vazamento de vulnerabilidades.

 * @param {Error} err Erro capturado
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
*/

function tratarErros(err, req, res, next) {
  // 1. Erros operacionais da aplicação (AppError: ErroValidacao, ErroAutenticacao, ErroPermissao, ErroNaoEncontrado, ErroConflito)
  if (err instanceof AppError) {
    return res.status(err.status).json({
      erro: err.message
    });
  }

  // 2. Erro de JSON malformado enviado pelo cliente
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      erro: 'Corpo da requisição JSON inválido ou malformado.'
    });
  }

  // 3. Violação não tratada de restrição do SQLite 
  if (err.message && err.message.includes('UNIQUE constraint failed')) {
    return res.status(409).json({
      erro: 'Conflito de dados: um registro com essas informações já existe no sistema.'
    });
  }

  // 4. Erros internos não previstos (500 - Server Error)
  console.error('[ERRO INTERNO NÃO TRATADO]', {
    caminho: req.originalUrl,
    metodo: req.method,
    mensagem: err.message,
    pilha: err.stack
  });

  return res.status(500).json({
    erro: 'Ocorreu um erro interno no servidor. Por favor, tente novamente mais tarde.'
  });
}

module.exports = tratarErros;
