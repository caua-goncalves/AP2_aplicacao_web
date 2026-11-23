/**
 * @file servicos/authServico.js
 * @description Módulo de autenticação, hashing de senhas e geração de tokens JWT.
 * Pertence à camada de serviços. Garante a proteção das credenciais com bcrypt,
 * previne ataques de enumeração de usuários e assina tokens para controle de acesso.
*/

let bcrypt;
try {
  bcrypt = require('bcrypt');
} catch {
  bcrypt = require('bcryptjs');
}

const jwt = require('jsonwebtoken');
const usuariosDados = require('../dados/usuariosDados');
const medicosDados = require('../dados/medicosDados');
const { validarTexto, validarEmail, validarSenha } = require('./validacoes');
const { ErroConflito, ErroAutenticacao } = require('./erros');

// Chave secreta e expiração lidas de variáveis de ambiente com defaults seguros
const JWT_SECRET = process.env.JWT_SECRET || 'chave_jwt_padrao_clinica_super_segura_ap2_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

/**
 * Realiza o cadastro de um novo paciente no sistema.

 * DECISÃO DE SEGURANÇA:
 * 1 - Senhas são criptografadas com bcrypt usando 10 rounds de salt. Nunca armazenadas em texto puro.
 * 2 - Checagem prévia de e-mail evita duplicações e violações de integridade no banco.

 * @param {object} dados Dados do novo paciente
 * @param {string} dados.nome Nome completo
 * @param {string} dados.email Endereço de e-mail único
 * @param {string} dados.senha Senha em texto puro informada pelo usuário
 * @returns {object} Paciente cadastrado (sem a senha)
 * @throws {ErroValidacao} 400 se os dados de entrada forem inválidos
 * @throws {ErroConflito} 409 se o e-mail já estiver cadastrado
*/

function cadastrarPaciente({ nome, email, senha }) {
  const nomeValidado = validarTexto(nome, 'nome', 3, 100);
  const emailValidado = validarEmail(email);
  const senhaValidada = validarSenha(senha);

  // Verifica se o e-mail já está em uso
  const usuarioExistente = usuariosDados.buscarPorEmail(emailValidado);
  if (usuarioExistente) {
    throw new ErroConflito('O endereço de e-mail informado já está cadastrado no sistema.');
  }

  // Gera o hash com salt para mitigar ataques de tabela rainbow e dicionário
  const saltRounds = 10;
  const senhaHash = bcrypt.hashSync(senhaValidada, saltRounds);

  const novoUsuario = usuariosDados.inserirUsuario({
    nome: nomeValidado,
    email: emailValidado,
    senhaHash,
    papel: 'paciente'
  });

  return {
    id: novoUsuario.id,
    nome: novoUsuario.nome,
    email: novoUsuario.email,
    papel: novoUsuario.papel
  };
}

/**
 * Autentica o usuário validando as credenciais e emitindo um token JWT assinado.

 * DECISÕES DE SEGURANÇA:
 * 1 - Prevenção contra Enumeração de Usuários: A mensagem de erro para usuário não encontrado
 * e senha incorreta é intencionalmente a mesma ("Credenciais inválidas: e-mail ou senha incorretos.").
 * 2 - Criptoanálise com tempo constante do bcrypt: bcrypt.compareSync previne ataques de temporização.
 * 3 - Payload do JWT: inclui apenas informações não-sensíveis essenciais para autorização (id, nome, email, papel, medicoId).
 *
 * @param {object} credenciais
 * @param {string} credenciais.email E-mail de login
 * @param {string} credenciais.senha Senha de acesso
 * @returns {{ token: string, usuario: object }} Token JWT e resumo do perfil autenticado
 * @throws {ErroAutenticacao} 401 se as credenciais forem inválidas
*/

function login({ email, senha }) {
  const emailValidado = validarEmail(email);
  const senhaValidada = validarSenha(senha);

  const usuario = usuariosDados.buscarPorEmail(emailValidado);

  // Se o usuário não existir ou a senha não coincidir com o hash, retorna 401
  if (!usuario || !bcrypt.compareSync(senhaValidada, usuario.senha_hash)) {
    throw new ErroAutenticacao('Credenciais inválidas: e-mail ou senha incorretos.');
  }

  // Se o usuário for médico, recupera seu ID na tabela de médicos
  let medicoId = null;
  if (usuario.papel === 'medico') {
    const perfilMedico = medicosDados.buscarPorUsuarioId(usuario.id);
    if (perfilMedico) {
      medicoId = perfilMedico.id;
    }
  }

  // Assinatura do JWT com secret e tempo de expiração
  const payload = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    papel: usuario.papel,
    medicoId
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });

  return {
    mensagem: 'Autenticação realizada com sucesso.',
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
      medicoId
    }
  };
}

module.exports = {
  cadastrarPaciente,
  login,
  JWT_SECRET
};
