/**
 * @file middlewares/autorizar.js
 * @description Middleware de autorização baseado em papéis (RBAC).
 * Pertence à camada de segurança/middlewares. Controla quais perfis de usuário
 * possuem permissão para executar cada operação da API.
*/

/**
 * Cria um middleware que restringe o acesso aos papéis informados.

 * DECISÃO DE ARQUITETURA:
 * O controle de acesso por papel (RBAC) garante que um paciente não consiga acessar rotas
 * administrativas ou relatórios médicos mesmo que esteja autenticado com token válido.

 * @param {...string} papeisPermitidos Lista de papéis autorizados (Ex.: 'medico', 'paciente')
 * @returns {import('express').RequestHandler} Middleware Express de autorização
*/

function autorizarPapel(...papeisPermitidos) {
  return (req, res, next) => {
    // Garante que o middleware de autenticação foi executado previamente
    if (!req.usuario) {
      return res.status(401).json({
        erro: 'Não autenticado: identidade do usuário não encontrada na requisição.'
      });
    }

    // Verifica se o papel do usuário logado está entre os permitidos
    if (!papeisPermitidos.includes(req.usuario.papel)) {
      return res.status(403).json({
        erro: `Acesso proibido: esta operação requer o papel [${papeisPermitidos.join(', ')}], mas seu perfil é '${req.usuario.papel}'.`
      });
    }

    return next();
  };
}

module.exports = autorizarPapel;
